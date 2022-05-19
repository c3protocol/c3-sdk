/* eslint-disable no-case-declarations */
import algosdk, {
    assignGroupID,
    decodeAddress,
    LogicSigAccount,
    OnApplicationComplete,
    Transaction,
    TransactionType
} from "algosdk";
import crypto from "crypto";
import { encodeDelegationAttributes } from "./ADEHelper";
import { C3RequestOp, CEDepositRequest, PreparedDepositRequest } from "./C3RequestTypes";
import {Deployer, SignCallback} from "./Deployer";
import {AlgorandType, IPackedInfo, concatArrays, packData, decodeBase16, encodeApplicationAddress, encodeArgArray, encodeC3PyTealDictionary, encodeBase64, encodeUint64} from "./Encoding";
import { TealSignCallback } from "./Order";
import {Address, AssetId, CERequest, ContractIds, DelegationRequest, UserProxyRequest, SignedUserProxyRequest} from "./types";

export const PROXY_BYTECODE_CHUNKS = [
    "062003010006311024124000010031192212311b231210400104224000010031102412443102311b2209c01a5740081712443104311b2209c01a574808171244310f31181650310216503104165031065031191650312050310550310116503500233501311b22093502340134020c40009a223501311d22083502340134020c400077223501313322083502340134020c40005323350131313502340134020c4000313400311b2209c01a5700408020",
    "0444224334003401C0301650350034012208350142FFB434003401C0321650350034012208350142FF9234003401C01C50350034012208350142FF6F34003401C01A50350034012208350142FF4C23381022124423380881C09A0C0F442338008020",
    "1244228008",
    "88002081028008",
    "88001181038008",
    "880002224335043503340338102412443403381834041712443403381922124434033820320312443403381B2312443403381D2312443403383323124434033831231244340338058000124489"
]

const compiledProxyFormat: IPackedInfo = {
    chunk1: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[0].length / 2},
    user: { type: 'address' },
    chunk2: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[1].length / 2},
    server: { type: 'address' },
    chunk3: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[2].length / 2},
    blId: { type: 'number' },
    chunk4: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[3].length / 2},
    ceId: { type: 'number' },
    chunk5: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[4].length / 2},
    adeId: { type: 'number' },
    chunk6: { type: 'bytes', size: PROXY_BYTECODE_CHUNKS[5].length / 2},
}

export class UserProxy {
    constructor (
        private readonly deployer: Deployer,
        public readonly user: Address,
        private readonly server: Address,
        public readonly proxy: LogicSigAccount,
        private readonly contracts: ContractIds,
        private readonly signCallback: SignCallback,
        private readonly tealSignCallback: TealSignCallback,
    ) {}

    private static async compileUserProxySig(deployer: Deployer, user: Address, contracts: ContractIds, server: Address): Promise<LogicSigAccount> {
        return deployer.compileStateless('../../../contracts/ce/UserProxy.py', new Map<string, AlgorandType>([
            ["TMPL_A_USER_ADDRESS", user],
            ["TMPL_A_SERVER", server],
            ["TMPL_B8_BL_ID",  encodeUint64(contracts.lendingPool)],
            ["TMPL_B8_CE_ID",  encodeUint64(contracts.ceOnchain)],
            ["TMPL_B8_ADE_ID", encodeUint64(contracts.ade)],
        ]))
    }

    public static async compileUserProxy(deployer: Deployer, server: Address, user: Address, contracts: ContractIds, sign: SignCallback, tealSign: TealSignCallback): Promise<UserProxy> {
        const proxy = await UserProxy.compileUserProxySig(deployer, user, contracts, server)
        return new UserProxy(deployer, user, server, proxy, contracts, sign, tealSign)
    }

    private static makeUserProxySig(user: Address, server: Address,
                                    contracts: ContractIds): LogicSigAccount {
        const data = {
            chunk1: decodeBase16(PROXY_BYTECODE_CHUNKS[0]),
            user,
            chunk2: decodeBase16(PROXY_BYTECODE_CHUNKS[1]),
            server,
            chunk3: decodeBase16(PROXY_BYTECODE_CHUNKS[2]),
            blId: contracts.lendingPool,
            chunk4: decodeBase16(PROXY_BYTECODE_CHUNKS[3]),
            ceId: contracts.ceOnchain,
            chunk5: decodeBase16(PROXY_BYTECODE_CHUNKS[4]),
            adeId: contracts.ade,
            chunk6: decodeBase16(PROXY_BYTECODE_CHUNKS[5]),
        }
        const bytecode = packData(data, compiledProxyFormat)
        return new LogicSigAccount(bytecode)
    }

    public static makeUserProxy(deployer: Deployer, server: Address, user: Address,
                                contracts: ContractIds, sign: SignCallback,
                                tealSign: TealSignCallback): UserProxy {
        const proxy = UserProxy.makeUserProxySig(user, server, contracts)
        return new UserProxy(deployer, user, server, proxy, contracts, sign, tealSign)
    }

    // FIXME: Test with 0..15 args
    public async makeCallTransaction(
        args: SignedUserProxyRequest,
    ): Promise<Transaction> {
        const extraData = concatArrays(encodeArgArray([
            args.signature,
            args.firstValid,
            args.lastValid,
            args.lease,
            args.from,
        ]))

        const callTx = await this.deployer.makeCallTransaction(
            this.address(),
            args.appId,
            args.appOnComplete,
            [...args.args, extraData],
            args.accounts,
            args.foreignApps,
            args.foreignAssets,
            args.txNote,
            args.fee
        )
        callTx.lease = args.lease
        callTx.firstRound = args.firstValid
        callTx.lastRound = args.lastValid

        return callTx
    }

    public address (): Address {
        return this.proxy.address()
    }

    // TODO: Merge all the prepare/generate functions to have one public API function that handles all C3 operations
    public async generateDepositGroup(req: CEDepositRequest): Promise<[Transaction[], number, number]> {
        const allTxns: Transaction[] = []
        if (req.performOptIn) {
            // Transactions required for the Initial Deposit
            allTxns.push(
                await this.deployer.makePayTransaction(this.server, this.address(), BigInt(2_050_000), 4 * this.deployer.minFee),
                await this.deployer.makeCallTransaction(this.address(), this.contracts.lendingPool, OnApplicationComplete.OptInOC, [], [], [], [], "", 0),
                await this.deployer.makeCallTransaction(this.address(), this.contracts.ceOnchain, OnApplicationComplete.OptInOC, [], [], [], [], "", 0),
                await this.deployer.makeCallTransaction(this.address(), this.contracts.ade, OnApplicationComplete.OptInOC, [], [], [], [], "", 0),
            )
        }

        // Application call to perform de Deposit Operation
        allTxns.push(await this.deployer.makeCallTransaction(this.server, this.contracts.ceOnchain, OnApplicationComplete.NoOpOC, ["deposit"], [this.user, this.address()], [], [], "", 2 * this.deployer.minFee))

        // Funds transfer transactions
        // Funds can come from an Algorand User, using a Payment or an Asset Transfer transaction
        //   or from Whormhole by claming a VAA through a set of transactions created by the Whormhole's SDK
        const firstFundsTransferIndex = allTxns.length
        let transactionToSignIndex = 0
        if (req.wormholeVAA) {
            const wormholeTxns: Transaction[] = await this.deployer.createRedeemWormholeTransactions(
                req.wormholeVAA,
                encodeApplicationAddress(this.contracts.ceOnchain))
            allTxns.push(...wormholeTxns)
        } else {
            allTxns.push(
                req.assetId === 0
                    ? await this.deployer.makePayTransaction(this.user, encodeApplicationAddress(this.contracts.ceOnchain), req.amount, 0)
                    : await this.deployer.makeAssetTransferTransaction(this.user, encodeApplicationAddress(this.contracts.ceOnchain), req.assetId, req.amount, 0)
            )
            transactionToSignIndex = firstFundsTransferIndex
        }

        // PLEASE NOTE: Removed call to assignGroupID from this place because we might need to manipulate depositTxns further outside of this function.
        //  For instance, in the server side of deposits, we might want to change firstRound and lastRound to match the ones provided in the signed user's transaction.

        return [allTxns, firstFundsTransferIndex, transactionToSignIndex]
    }

    public async prepareDeposit(req: CEDepositRequest): Promise<PreparedDepositRequest> {
        // TODO: it makes no sense to receive a CERequest here as the only valid operation is C3RequestOp.CE_Deposit
        const [txns, startDataIndex, transactionToSignIndex] = await this.generateDepositGroup(req)
        const grouped = assignGroupID(txns)
        if (grouped === undefined || grouped.length === 0) {
            throw new Error('Could not assign a group ID to the payment transaction')
        }

        const signed = transactionToSignIndex > 0
            ? encodeBase64((await this.signCallback([grouped[transactionToSignIndex]]))[0]) // User Signature
            : ''
        return {
            op: C3RequestOp.CE_Deposit,
            from: this.user,
            assetId: req.assetId,
            amount: req.amount,
            data: grouped.slice(startDataIndex),
            signed
        }
    }

    // TODO: Run validation on the request for sanity?
    // Convenience function to generate the user proxy request based on a simple structure
    public async prepareCEOp(req: CERequest): Promise<SignedUserProxyRequest> {
        let args: AlgorandType[] = [req.op, decodeAddress(this.user).publicKey]
        let accounts: Address[] = [this.address()]
        const foreignAssets: AssetId[] = []

        switch (req.op) {
            case C3RequestOp.CE_Borrow:
            case C3RequestOp.CE_Lend:
            case C3RequestOp.CE_Redeem:
            case C3RequestOp.CE_Repay:
            case C3RequestOp.CE_Withdraw: {
                args.push(req.amount)
                if (req.assetId !== 0) {
                    foreignAssets.push(req.assetId)
                }
                accounts.push(this.user)
                break
            }
            case C3RequestOp.CE_Liquidate: {
                const { keys: liabilityIds, values: liabilityAmounts } = encodeC3PyTealDictionary(req.liabilities)
                const { keys: collateralIds, values: collateralAmounts } = encodeC3PyTealDictionary(req.collaterals)
                args.push(liabilityIds, liabilityAmounts, collateralIds, collateralAmounts)
                accounts.push(req.user)
                break
            }
        }

        /* For request supporting delegation, forward call to ADE instead */

        let isDelegated = false
        let appId = this.contracts.ceOnchain
        if ('primaryAccount' in req && req.primaryAccount) {
            if (algosdk.isValidAddress(req.primaryAccount)) {
                appId = this.contracts.ade

                const primaryProxy = await UserProxy.compileUserProxy(
                    this.deployer,
                    this.server,
                    this.user,
                    this.contracts,
                    this.signCallback,
                    this.tealSignCallback,
                )

                args = ["verify", ...args]        // ADE call.
                accounts = [...accounts, primaryProxy.address()]
                isDelegated = true
            } else {
                throw new Error('Invalid Primary account specified for delegation')
            }
        }
        const proxyRequest = await this.createRequest({
            from: this.user,
            isDelegated,
            proxyAddress: this.address(),
            appId,
            args,
            accounts,
            foreignApps: [this.contracts.priceKeeper, this.contracts.priceMapper, this.contracts.rateOracle, this.contracts.lendingPool],
            foreignAssets,
        })
        const signData = await this.signCallData(proxyRequest)
        return signData
    }

    public async prepareDelegationOp(req: DelegationRequest): Promise<SignedUserProxyRequest> {
        const proxyRequest = await this.createRequest({
            from: this.user,
            proxyAddress: this.address(),
            appId: req.adeAppId,
            args: [req.op, decodeAddress(this.user).publicKey],
            accounts: [this.address(), req.delegateAccount],
        })
        if (req.delegationAttributes) {
            proxyRequest.args?.push(encodeDelegationAttributes(req.delegationAttributes))
        }
        const signData = await this.signCallData(proxyRequest)
        return signData
    }

    public async createRequest(assigns: Partial<UserProxyRequest>): Promise<UserProxyRequest> {
        const params = await this.deployer.getParams()
        const zeroAddress = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
        return {
            from: zeroAddress,
            isDelegated: false,
            proxyAddress: zeroAddress,
            appId: 0,
            appOnComplete: OnApplicationComplete.NoOpOC,
            args: [],
            accounts: [],
            foreignApps: [],
            foreignAssets: [],
            fee: 0,
            firstValid: params.firstRound,
            lastValid: params.lastRound,
            lease: new Uint8Array(crypto.randomBytes(32)),
            rekeyTo: zeroAddress,
            txNote: "",
            ...assigns
        }
    }

    public async signCallData(
        req: UserProxyRequest,
    ): Promise<SignedUserProxyRequest> {
        const fullArgs = [
            TransactionType.appl,
            req.appId,
            req.firstValid,
            req.lastValid,
            req.lease,
            req.appOnComplete,
            decodeAddress(req.rekeyTo).publicKey,
            req.txNote,
            req.fee,
            ...req.args,
            ...req.accounts.map(x => decodeAddress(x).publicKey),
            ...req.foreignApps,
            ...req.foreignAssets,
        ]
        const data = concatArrays(encodeArgArray(fullArgs))
        const signature = await this.tealSignCallback(data, req.from, req.proxyAddress)
        return {...req, signature}
    }
}
