import algosdk, { Algodv2, Transaction, TransactionType, OnApplicationComplete, SuggestedParams, LogicSigAccount } from 'algosdk'
import { AlgorandType, encodeAddress, encodeArgArray, encodeString, decodeState, IState, IStateMap, decodeString, decodeBase64, IStateType } from './Encoding'
import child_process from "child_process"
import util from "util"
import { AssetId, Amount, Address, TransactionId, AppId } from './types'
import { AssertionError } from 'assert'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import AnyTransaction from 'algosdk/dist/types/src/types/transactions'

export enum FieldType {
    UINT = 1,
    STRING,
    ADDRESS,
    BOOL,
    AMOUNT,
    BYTES,
}

export type IStateInfo = {
    local: IStateMap,
    global: IStateMap,
}

export interface ICompiledApp {
    approval: Uint8Array
    clear: Uint8Array
    stateInfo: IStateInfo
}

export interface ISourceApp {
    approval: string
    clear: string
    stateInfo: IStateInfo
}

export interface IStatelessContract {
    code: string
    address: string
    parameters: IParameter[]
}

export interface IParameter {
    name: string
    description: string
    type: FieldType
}

export type SignCallback = (txs: Transaction[]) => Promise<Uint8Array[]>

export type PendingTransaction = {
    timestamp: number,
    transactions: Transaction[],
}

export type BlockedTransaction = {
    timestamp: number,
    transactions: Transaction[],
    blocking: TransactionId[],
    signCallback: SignCallback,
    stateless: Map<Address, LogicSigAccount>,
}

export class Deployer {
    // Blocked and pending transaction list
    private blocked: Map<TransactionId, BlockedTransaction> = new Map()
    private pending: Map<TransactionId, PendingTransaction> = new Map()

    // Teal cache
    private static tealCache: Map<string, string[]> = new Map()

    constructor(readonly algodClient: Algodv2, readonly minFee = 1000, readonly minBalance = 100000) {}

    getMinFee(): number {
        return this.minFee
    }

    getMinBalance(): number {
        return this.minBalance
    }

    private async compileProgram(program: string, templateValues?: Map<string, AlgorandType>): Promise<Uint8Array> {
        const [parsedCode,] = Deployer.parseCode(program, templateValues)
        const compileResponse = await this.algodClient.compile(parsedCode).do()
        return new Uint8Array(Buffer.from(compileResponse.result, 'base64'))
    }

    public async getParams(): Promise<SuggestedParams> {
        const params: SuggestedParams = await this.algodClient.getTransactionParams().do()
        params.fee = this.minFee
        params.flatFee = true
        return params
    }

    static isStatic(stateless: IStatelessContract) {
        return stateless.parameters.length === 0
    }

    async signAndSend(transactions: Transaction[], signCallback: SignCallback, stateless: Map<Address, LogicSigAccount> = new Map(), dryrunTest = false): Promise<TransactionId> {
        // Validate the total fees
        const totalFee = transactions.reduce((acc, val) => acc + val.fee, 0)
        const minFee = transactions.length * this.minFee
        if (totalFee < minFee) {
            throw new AssertionError({ message: `The minimum fee for a group of size ${transactions.length} is ${minFee}, but only given ${totalFee}` })
        }

        // Place transaction into blocked list if it conflicts with a pending transaction
        const blocking = this.blockingSet(transactions)
        if (blocking.length > 0) {
            const txId = `#BlockedTxTemp${this.blocked.size}`
            this.blocked.set(txId, {
                timestamp: Date.now(),
                transactions,
                blocking,
                signCallback,
                stateless
            })

            return txId
        } else {
            if (dryrunTest) {
                const result = await this.dryrunRequest(transactions, signCallback, stateless)
                this.debugDryrunResult(result)
            }

            // Sign transactions
            const txIndexes: number[] = []
            const logicSigned: Uint8Array[] = []
            const txsToSign: Transaction[] = []
            for(let i = 0; i < transactions.length; i++) {
                const sender = encodeAddress(transactions[i].from.publicKey)
                const lsig = stateless.get(sender)
                if (lsig) {
                    logicSigned.push(algosdk.signLogicSigTransactionObject(transactions[i], lsig).blob)
                    txIndexes[i] = 0
                } else {
                    txsToSign.push(transactions[i])
                    txIndexes[i] = 1
                }
            }
            const txSigned = await signCallback(txsToSign)

            let logicIndex = 0
            let txsIndex = 0
            const signed: Uint8Array[] = []
            for(let i = 0; i < txIndexes.length; i++) {
                signed.push(txIndexes[i]===0 ? logicSigned[logicIndex++] : txSigned[txsIndex++])
            }

            // Send transaction
            const txId = (await this.algodClient.sendRawTransaction(signed).do()).txId

            // Mark transaction as pending
            this.pending.set(txId, {
                timestamp: Date.now(),
                transactions,
            })

            // Fire transaction
            return txId
        }
    }

    blockingSet(transactions: Transaction[]): TransactionId[] {
        return []
    }

    transactionFailed(result: Record<string, any>): boolean {
        return (result["confirmed-round"] == null || result["confirmed-round"] <= 0)
            && result["pool-error"] != null
            && result["pool-error"].length > 0
    }

    async waitForTransactionResponse(txId: string): Promise<Record<string, any>> {
        // Get pending transaction by ID
        if (this.pending.get(txId)) {
            // Validate transaction was sucessful
            const result = await algosdk.waitForConfirmation(this.algodClient, txId, 10000)
            if (this.transactionFailed(result)) {
                throw new Error(JSON.stringify(result))
            }

            // Clean up pending table
            this.pending.delete(txId)

            return result
        } else {
            // Get blocked transaction by ID
            const tx = this.blocked.get(txId)
            if (tx != undefined) {
                // Validate all blocking transactions have completed
                const blockingTxs = await Promise.all(tx?.blocking.map(async blockingTxId => algosdk.waitForConfirmation(this.algodClient, blockingTxId, 1000)))
                const blockingErrored = blockingTxs.some(result => result["pool-error"] != null)
                if (blockingErrored) {
                    throw new Error('Error in blocking transaction')
                }

                // Fire blocked transaction
                const newTxId = await this.signAndSend(tx.transactions, tx.signCallback, tx.stateless)
                if(newTxId.startsWith('#BlockedTxTemp')) {
                    throw new Error('Transaction was blocked twice')
                }

                // Wait for blocked transaction to complete
                const result = await algosdk.waitForConfirmation(this.algodClient, txId, 10000)
                if (this.transactionFailed(result)) {
                    throw new Error(`Transaction rejected: ${txId}`)
                }

                return result
            } else {
                throw new Error(`Waiting on unknown transaction ID: ${txId}`)
            }
        }
    }

    async dryrunRequest(transactions: Transaction[], signCallback: SignCallback, stateless: Map<Address, LogicSigAccount> = new Map()): Promise<any> {
        // Validate the total fees
        const totalFee = transactions.reduce((acc, val) => acc + val.fee, 0)
        const minFee = transactions.length * this.minFee
        if (totalFee < minFee) {
            throw new AssertionError({ message: `The minimum fee for a group of size ${transactions.length} is ${minFee}, but only given ${totalFee}` })
        }

        // Sign transactions
        const signed = await Promise.all(transactions.map(async tx => {
            const sender = encodeAddress(tx.from.publicKey)
            const lsig = stateless.get(sender)
            if (lsig)
                return algosdk.signLogicSigTransactionObject(tx, lsig).blob
            const signedTx = await signCallback([tx])
            return signedTx[0]
        }))

        // Create dryrun request
        const dr = await algosdk.createDryrun({
            client: this.algodClient,
            txns: signed.map((stxn) => algosdk.decodeSignedTransaction(stxn)),
        })
        const dryrunResponse = await this.algodClient.dryrun(dr).do()
        return dryrunResponse
    }

    debugDryrunResult(result: any) {
        console.log(`Transaction count: ${result.txns.length}`)
        result.txns.forEach((txn: any, i: number) => {
            if (txn['logic-sig-trace']) {
                const passed = txn['logic-sig-messages'][0] === 'PASS'
                const disassembly = txn['logic-sig-disassembly']
                const trace: { line: number, pc: number, stack: any }[] = txn['logic-sig-trace']

                const msgHeader = `Group[${i}] logic sig: ${passed ? 'PASSED' : 'FAILED'}`
                if (!passed) {
                    const msgBody = trace.map(({ line, pc, stack }) => {
                        const stackMsg = stack.map((entry: any) => {
                            switch (entry.type) {
                                case 1: return `bytes ${entry.bytes}`
                                case 2: return `uint ${entry.uint}`
                            }
                        })
                        return `${pc}: ${disassembly[line]} | ${stackMsg}`
                    }).join('\n')
                    
                    const msg = msgHeader + '\n' + msgBody
                    console.log(msg)
                } else {
                    console.log(msgHeader)
                }
            }

            if (txn['app-call-messages'] !== undefined) {
                const passed = txn['app-call-messages'][1] === 'PASS'
                const trace = txn['app-call-trace']
                const cost = txn['cost']
                const disassembly = txn['disassembly']

                const msgHeader = `Group[${i}]: ${passed ? 'PASSED' : 'FAILED'}, cost: ${cost}`

                if (!passed) {
                    const msgBody = trace.map((entry: any) => {
                        const opcode = disassembly[entry.line]
                        const scratchMsg = entry.scratch?.map((x: any, i: number) => {
                            switch (x.type) {
                                case 0: return ''
                                case 1: return `${i}: bytes ${x.bytes}`
                                case 2: return `${i}: uint ${x.uint}`
                                default: return `${i}: UNKNOWN`
                            }
                        }).filter((x: string) => x !== '').join('\n')
                        const stackMsg = entry.stack.map((x: any) => {
                            switch (x.type) {
                                case 1: return `bytes ${x.bytes}`
                                case 2: return `uint ${x.uint}`
                                default: return `UNKNOWN`
                            }
                        })
                        return `${entry.line}(${entry.pc}): ${opcode} | [${stackMsg.join(', ')}]` + `\n${scratchMsg ?? ''}`
                    }).join("\n\n")

                    console.log(msgHeader + "\n" + msgBody)
                } else {
                    console.log(msgHeader)
                }
            } else {
                console.log(`Group[${i}] keys: ${Object.keys(txn)}`)
            }
        })
    }

    async makeApp(app: ISourceApp, templateValues?: Map<string, AlgorandType>): Promise<ICompiledApp> {
        return {
            approval: await this.compileProgram(app.approval, templateValues),
            clear: await this.compileProgram(app.clear, templateValues),
            stateInfo: app.stateInfo,
        }
    }

    async makeSourceApp(pySourcePath: string, stateInfo: IStateInfo): Promise<ISourceApp> {
        // Compile python program
        const results = await this.compilePyTeal(pySourcePath, 2)

		return {
			approval: results[0],
			clear: results[1],
            stateInfo,
		}
    }

    async deleteApplication(sender: Address, id: number, signCallback: SignCallback): Promise<string> {
        const params = await this.getParams()
        const txApp = algosdk.makeApplicationDeleteTxn(sender, params, id);
        const txns = [txApp]
        return this.signAndSend(txns, signCallback)
    }

    async deleteAsset(sender: Address, id: number, signCallback: SignCallback): Promise<string> {
        const params = await this.getParams()
        const tx = algosdk.makeAssetDestroyTxnWithSuggestedParams(sender, undefined, id, params);
        const txns = [tx]
        return this.signAndSend(txns, signCallback)
    }

    async clearApplication(sender: Address, id: number, signCallback: SignCallback): Promise<string> {
        const params = await this.getParams()
        const txApp = algosdk.makeApplicationClearStateTxn(sender, params, id)
        const txns = [txApp]
        return this.signAndSend(txns, signCallback)
    }

    async closeApplication(sender: Address, id: number, signCallback: SignCallback): Promise<any> {
        const params = await this.getParams()
        const txApp = algosdk.makeApplicationCloseOutTxn(sender, params, id)
        const txns =  [txApp]
        return this.signAndSend(txns, signCallback)
    }

    async deployApplication(sender: Address, app: ICompiledApp, signCallback: SignCallback, extraCompBudgetTxns?: Transaction[],
        args?: AlgorandType[], appAccounts?: Address[], appApps?: number[], extraPages?: number, fee?: number, debug?: boolean): Promise<string> {
        const compBudgetTxns = extraCompBudgetTxns ? extraCompBudgetTxns : []
        const params = await this.getParams()
        params.fee = fee ? fee : params.fee
        const appArgs = args ? encodeArgArray(args) : undefined
        const onComplete = OnApplicationComplete.NoOpOC
        const foreignApps = appApps ? appApps : undefined
        const foreignAssets = undefined
        const note = undefined
        const lease = undefined
        const rekeyTo = undefined

        const localInts = Object.entries(app.stateInfo.local).filter(([_, type]) => type === 'uint').length
        const localBytes = Object.entries(app.stateInfo.local).filter(([_, type]) => type === 'bytes').length
        const globalInts = Object.entries(app.stateInfo.global).filter(([_, type]) => type === 'uint').length
        const globalBytes = Object.entries(app.stateInfo.global).filter(([_, type]) => type === 'bytes').length

        const txApp = algosdk.makeApplicationCreateTxn(
            sender, params, onComplete, app.approval, app.clear, localInts,
            localBytes, globalInts, globalBytes, appArgs, appAccounts,
            foreignApps, foreignAssets, note, lease, rekeyTo, extraPages
        )
        const txns = [txApp, ...compBudgetTxns]
        return this.callGroupTransaction(txns, new Map(), signCallback, debug)
    }

    async deploySourceApplication(from: Address, sourceApp: ISourceApp, signCallback: any): Promise<string> {
		const compiledApp: ICompiledApp = await this.makeApp(sourceApp)
		const deployId = await this.deployApplication(from, compiledApp, signCallback, [])
		return deployId
    }

    async updateApplication(
        sender: Address,
        id: number,
        app: ICompiledApp,
        signCallback: SignCallback,
        args?: AlgorandType[],
        appAccounts?: Address[]
    ): Promise<string> {
        const params = await this.getParams()
        const appArgs = args ? encodeArgArray(args) : undefined
        const txApp = algosdk.makeApplicationUpdateTxn(
            sender, params, id, app.approval, app.clear, appArgs, appAccounts
        )
        const txns = [txApp]
        return this.signAndSend(txns, signCallback)
    }

    async makeCallTransaction(
        from: Address,
        id: number,
        appOnComplete: OnApplicationComplete = OnApplicationComplete.NoOpOC,
        args: AlgorandType[] = [],
        accounts: string[] = [],
        foreignApps: number[] = [],
        foreignAssets: number[] = [],
        txNote = "",
        fee: number = this.minFee,
        reKeyTo?: Address
    ): Promise<Transaction> {
        const suggestedParams = await this.getParams()
        suggestedParams.fee = fee
        const appArgs = args.length > 0 ? encodeArgArray(args) : undefined
        const appAccounts = accounts.length > 0 ? accounts : undefined
        const appForeignApps = foreignApps.length > 0 ? foreignApps : undefined
        const appForeignAssets = foreignAssets.length > 0 ? foreignAssets : undefined
        const note = encodeString(txNote)
        const txObj: AnyTransaction = {
            type: TransactionType.appl, from, suggestedParams, appIndex: id,
            appOnComplete, appArgs, appAccounts, appForeignApps, appForeignAssets, note, reKeyTo
        }
        return new Transaction(txObj)
    }

    async makePayTransaction(
        from: Address,
        to: Address,
        amount: number | bigint,
        fee: number = this.minFee,
        txNote: string | Uint8Array = ""
    ): Promise<Transaction> {
        const suggestedParams = await this.getParams()
        suggestedParams.fee = fee
        const note = encodeString(txNote)
        const txObj: any = {
            type: TransactionType.pay, from, to, amount, suggestedParams, note
        }
        return new Transaction(txObj)
    }

    async makeAssetTransferTransaction(
        from: Address,
        to: Address,
        assetIndex: number,
        amount: number | bigint,
        fee = this.minFee, txNote = ""
    ): Promise<Transaction> {
        const suggestedParams = await this.getParams()
        suggestedParams.fee = fee
        const note = encodeString(txNote)
        const txObj: any = {
            type: TransactionType.axfer, from, to, assetIndex, amount, suggestedParams, note
        }
        return new Transaction(txObj)
    }

    async makeAssetCreationTransaction(
        from: Address,
        assetTotal: number | bigint,
        assetDecimals: number,
        assetUnitName: string,
        assetName: string,
        assetURL: string,
        fee = this.minFee,
        txNote = ""
    ): Promise<Transaction> {
        const suggestedParams = await this.getParams()
        suggestedParams.fee = fee
        const note = encodeString(txNote)
        const assetDefaultFrozen = false
        const assetManager = from
        const assetReserve = from
        const assetFreeze = from
        const assetClawback = from
        const txObj: any = {
            type: TransactionType.acfg, from, assetTotal, assetDecimals,
            assetDefaultFrozen, assetManager, assetReserve, assetFreeze,
            assetClawback, assetUnitName, assetName, assetURL,
            suggestedParams, note
        }
        return new Transaction(txObj)
    }

    async makeAssetOptInTransaction(from: Address, assetId: number, fee: number = this.minFee, txNote = ""): Promise<Transaction> {
        const suggestedParams = await this.getParams()
        suggestedParams.fee = fee
        const note = new Uint8Array(Buffer.from(txNote))
        return algosdk.makeAssetTransferTxnWithSuggestedParams(from, from, undefined, undefined, 0, note, assetId, suggestedParams, undefined)
    }

    async callApplication(sender: Address, id: number, appOnComplete: OnApplicationComplete,
        args: AlgorandType[], accounts: string[],
        foreignApps: number[], foreignAssets: number[],
        txNote: string, signCallback: SignCallback, fee?: number): Promise<string> {
        const txApp = await this.makeCallTransaction(sender, id, appOnComplete, args,
            accounts, foreignApps, foreignAssets, txNote, fee)
        const txns = [txApp]
        return this.signAndSend(txns, signCallback)
    }

    async callGroupTransaction(
        txns: Transaction[],
        mappedStateless: Map<Address, LogicSigAccount>,
        signCallback: SignCallback,
        dryrunTest?: boolean
    ): Promise<string> {
        if (txns.length == 0) {
            throw new Error('Invalid transaction count')
        }
        algosdk.assignGroupID(txns)
        return this.signAndSend(txns, signCallback, mappedStateless, dryrunTest)
    }

    async dryrunGroupTransaction(
        txns: Transaction[],
        mappedStateless: Map<Address, LogicSigAccount>,
        signCallback: SignCallback
    ): Promise<any> {
        algosdk.assignGroupID(txns)
        const result = await this.dryrunRequest(txns, signCallback, mappedStateless)
        txns.forEach((tx: Transaction) => tx.group = undefined)
        return result
    }

    static parseCode(code: string, templateValues?: Map<string, AlgorandType>): [string, IParameter[]] {
        const substitutions = templateValues ?? new Map();
        const result = [...substitutions.entries()].reduce(([acc, params], [key, val]) => {
            const keyParts = key.split('_');
            const typeCode = keyParts[1][0];
            const description = keyParts[1].substring(1);
            const name = keyParts.slice(2).join('_');

            const typeDict: Record<string, FieldType> = {
                'I': FieldType.UINT,
                'B': FieldType.BYTES, // Description = field length, base 10, or 'n' for any length
                'A': FieldType.ADDRESS,
                'S': FieldType.STRING,
            };

            let printedVal = ""
            const type = typeDict[typeCode];
            switch (type) {
            case FieldType.BYTES: {
                const buffer = Buffer.from(val);
                if (description === 'N' || buffer.length === parseInt(description, 10)) {
                    printedVal = '0x' + buffer.toString('hex');
                } else {
                    throw new Error('Size of buffer does not match template size for template variable ' + key)
                }
                break;
            }
            case FieldType.STRING:
                printedVal = '"' + val + '"';
                break;

            case FieldType.UINT:
            case FieldType.ADDRESS:
                printedVal = val.toString();
                break;

            default:
                throw new Error('Unknown template type for template variable ' + key);
            }

            return [acc.split(key).join(printedVal), [...params, { name, description, type }]];
        }, [code, []]);

        return result;
    }

    async compileStateless(pyPath: string, templateValues?: Map<string, AlgorandType>, overrideArgs?: string[]): Promise<LogicSigAccount> {
        const code = await this.compilePyTeal(pyPath, 1, overrideArgs)
        return new LogicSigAccount(await this.compileProgram(code[0], templateValues))
    }

    async readAsset(asset: AssetId): Promise<any> {
        return this.algodClient.getAssetByID(asset).do()
    }

    private assetNames: Map<AssetId, string> = new Map()
    async getAssetName(assetId: AssetId): Promise<string|undefined> {
        if (assetId===0) {
            return "ALGO"
        }
        let assetName = this.assetNames.get(assetId)
        if (!assetName) {
            const assetFromAlgorand = await this.readAsset(assetId)
            assetName = assetFromAlgorand.params['name']
            this.assetNames.set(assetId, assetName ?? "")
        }
        return assetName
    }

    async readAccount(from: Address): Promise<any> {
        return this.algodClient.accountInformation(from).do()
    }

    async readCreatedApps(from: Address): Promise<Record<string, string>> {
        const response = await this.readAccount(from)
        return response['created-apps'];
    }

    async readCreatedAssets(from: Address): Promise<Record<string, string>> {
        const response = await this.readAccount(from)
        return response['created-assets'];
    }

    async readOptedInApps(from: Address): Promise<Record<string, any>[]> {
        const response = await this.readAccount(from)
        return response['apps-local-state'];
    }

    async readOptedInAssets(from: Address): Promise<Record<string, string>[]> {
        const response = await this.readAccount(from)
        return response['assets'];
    }

    async readAmount(from: Address): Promise<Amount> {
        const response = await this.readAccount(from)
        return BigInt(response['amount'])
    }

    async readAssetBalances(from: Address): Promise<Map<AssetId, Amount>> {
        const assets = await this.readOptedInAssets(from)
        return new Map(assets.map((asset: Record<string, any>) => [asset['asset-id'], BigInt(asset['amount'])]))
    }

    async readAssetAmount(from: Address, id: AssetId): Promise<Amount> {
        return (await this.readAssetBalances(from)).get(id) ?? BigInt(0)
    }

    async getAllAppGlobalState(id: AppId): Promise<{ key: string, value: { bytes: string, type: number, uint: number } }[] | undefined> {
        const response = await this.algodClient.getApplicationByID(id).do()
        return response.params['global-state']
    }

    // TODO: Extend to handle local state as well
    public async getAppStateInfo(id: AppId): Promise<IStateInfo> {
        const state = await this.getAllAppGlobalState(id)
        if (!state) {
            throw new Error('App state is missing')
        }

        const globalPairs = state.map(entry => [decodeString(decodeBase64(entry.key)), entry.value.type === 0 ? 'uint' : 'bytes'] as [string, IStateType])

        return {
            global: Object.fromEntries(globalPairs),
            local: {},
        }
    }

    public async readAppGlobalState(id: AppId, stateInfo: IStateInfo, errorOnMissing = true): Promise<IState> {
        const app = await this.algodClient.getApplicationByID(id).do()
        const state = app.params['global-state']
        return decodeState(state, stateInfo.global, errorOnMissing)
    }

    public async readAppLocalState(id: AppId, from: Address, stateInfo: IStateInfo): Promise<IState> {
        const info = await this.readAccount(from)
        const state = info['apps-local-state'].find((v: any) => v['id'] === id)
        if (!state)
            throw new Error("No local state found for address " + from)
        return decodeState(state['key-value'], stateInfo.local)
    }

    async deleteApps(address: Address, signCallback: SignCallback) {
        const apps: any = await this.readCreatedApps(address)
        for (const app of apps) {
            const txId = await this.deleteApplication(address, app.id, signCallback)
            await this.waitForTransactionResponse(txId)
            console.log(`Application Deleted -> TxId: ${txId}`)
        }
        console.log("Deletion finished.")
    }

    async clearApps(address: Address, signCallback: SignCallback) {
        const apps: any = await this.readOptedInApps(address)
        for (const app of apps) {
            const txId = await this.clearApplication(address, app.id, signCallback)
            await this.waitForTransactionResponse(txId)
            console.log(`Cleared from Application -> TxId ${txId}`)
        }
        console.log("Clear finished.")
    }

    // TODO: Include the remaining compile steps in this function, so it returns the entire compiled program ready to use all in one step
    async compilePyTeal(pytealSourceFile: string, outputCount: number, overrideArgs?: string[]): Promise<string[]> {
        // Check the in-memory cache to perform fewer file stats
        const cached = Deployer.tealCache.get(pytealSourceFile)
        if (cached) {
            return cached
        }

        // Generate compile directory for teal files
        const tealPath = '../../../.teal'
        if (!fs.existsSync(tealPath)) {
            fs.mkdirSync(tealPath)
        }

        // Generate a unique name
        const fileBody = fs.readFileSync(pytealSourceFile)
        const nonce = crypto.createHash('sha256').update(fileBody).digest('hex')
        const outputPaths = [...Array(outputCount)].map((_, index) => path.join(tealPath, `${path.basename(pytealSourceFile, '.py')}-${index}-${nonce}.teal`))

        // Check disk cache to skip compile if we can
        const alreadyExists = outputPaths.reduce((accum, p) => accum || fs.existsSync(p), false)
        if (!alreadyExists) {
            // Run current program
            const pythonCommand = 'python3.10'
            const preArgs = overrideArgs ?? []
            const args = [...preArgs, ...outputPaths]
            const cmd = `${pythonCommand} "${pytealSourceFile}" ${args.join(' ')}`
             console.log(`Running command ${cmd}`)
            const logs = await util.promisify(child_process.exec)(cmd)
            if (logs.stderr && logs.stderr.length > 0) {
                throw Error(`Could not compile file: ${pytealSourceFile} with ${pythonCommand}.\nError: ${logs.stderr}`)
            }
        }

        // Gather results
        const results = outputPaths.map(p => fs.readFileSync(p, 'utf-8'))

        // Update in-memory cache
        Deployer.tealCache.set(pytealSourceFile, results)

        return results
    }
}
