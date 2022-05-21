"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deployer = exports.FieldType = void 0;
const algosdk_1 = __importStar(require("algosdk"));
const Encoding_1 = require("./Encoding");
const child_process_1 = __importDefault(require("child_process"));
const util_1 = __importDefault(require("util"));
const assert_1 = require("assert");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const wormhole_sdk_1 = require("@certusone/wormhole-sdk");
const Environment_1 = require("./Environment");
var FieldType;
(function (FieldType) {
    FieldType[FieldType["UINT"] = 1] = "UINT";
    FieldType[FieldType["STRING"] = 2] = "STRING";
    FieldType[FieldType["ADDRESS"] = 3] = "ADDRESS";
    FieldType[FieldType["BOOL"] = 4] = "BOOL";
    FieldType[FieldType["AMOUNT"] = 5] = "AMOUNT";
    FieldType[FieldType["BYTES"] = 6] = "BYTES";
})(FieldType = exports.FieldType || (exports.FieldType = {}));
class Deployer {
    constructor(algodClient, minFee = 1000, minBalance = 100000) {
        this.algodClient = algodClient;
        this.minFee = minFee;
        this.minBalance = minBalance;
        // Blocked and pending transaction list
        this.blocked = new Map();
        this.pending = new Map();
        this.assetNames = new Map();
    }
    getMinFee() {
        return this.minFee;
    }
    getMinBalance() {
        return this.minBalance;
    }
    compileProgram(program, templateValues) {
        return __awaiter(this, void 0, void 0, function* () {
            const [parsedCode,] = Deployer.parseCode(program, templateValues);
            const compileResponse = yield this.algodClient.compile(parsedCode).do();
            return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
        });
    }
    getParams() {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.algodClient.getTransactionParams().do();
            params.fee = this.minFee;
            params.flatFee = true;
            return params;
        });
    }
    static isStatic(stateless) {
        return stateless.parameters.length === 0;
    }
    signAndSend(transactions, signCallback, stateless = new Map(), dryrunTest = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate the total fees
            const totalFee = transactions.reduce((acc, val) => acc + val.fee, 0);
            const minFee = transactions.length * this.minFee;
            if (totalFee < minFee) {
                throw new assert_1.AssertionError({ message: `The minimum fee for a group of size ${transactions.length} is ${minFee}, but only given ${totalFee}` });
            }
            // Place transaction into blocked list if it conflicts with a pending transaction
            const blocking = this.blockingSet(transactions);
            if (blocking.length > 0) {
                const txId = `#BlockedTxTemp${this.blocked.size}`;
                this.blocked.set(txId, {
                    timestamp: Date.now(),
                    transactions,
                    blocking,
                    signCallback,
                    stateless
                });
                return txId;
            }
            else {
                if (dryrunTest) {
                    const result = yield this.dryrunRequest(transactions, signCallback, stateless);
                    this.debugDryrunResult(result);
                }
                // Sign transactions
                const txIndexes = [];
                const logicSigned = [];
                const txsToSign = [];
                for (let i = 0; i < transactions.length; i++) {
                    const sender = (0, Encoding_1.encodeAddress)(transactions[i].from.publicKey);
                    const lsig = stateless.get(sender);
                    if (lsig) {
                        logicSigned.push(algosdk_1.default.signLogicSigTransactionObject(transactions[i], lsig).blob);
                        txIndexes[i] = 0;
                    }
                    else {
                        txsToSign.push(transactions[i]);
                        txIndexes[i] = 1;
                    }
                }
                const txSigned = yield signCallback(txsToSign);
                let logicIndex = 0;
                let txsIndex = 0;
                const signed = [];
                for (let i = 0; i < txIndexes.length; i++) {
                    signed.push(txIndexes[i] === 0 ? logicSigned[logicIndex++] : txSigned[txsIndex++]);
                }
                // Send transaction
                const txId = (yield this.algodClient.sendRawTransaction(signed).do()).txId;
                // Mark transaction as pending
                this.pending.set(txId, {
                    timestamp: Date.now(),
                    transactions,
                });
                // Fire transaction
                return txId;
            }
        });
    }
    blockingSet(transactions) {
        return [];
    }
    transactionFailed(result) {
        return (result["confirmed-round"] == null || result["confirmed-round"] <= 0)
            && result["pool-error"] != null
            && result["pool-error"].length > 0;
    }
    waitForTransactionResponse(txId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get pending transaction by ID
            if (this.pending.get(txId)) {
                // Validate transaction was sucessful
                const result = yield algosdk_1.default.waitForConfirmation(this.algodClient, txId, 10000);
                if (this.transactionFailed(result)) {
                    throw new Error(JSON.stringify(result));
                }
                // Clean up pending table
                this.pending.delete(txId);
                return result;
            }
            else {
                // Get blocked transaction by ID
                const tx = this.blocked.get(txId);
                if (tx != undefined) {
                    // Validate all blocking transactions have completed
                    const blockingTxs = yield Promise.all(tx === null || tx === void 0 ? void 0 : tx.blocking.map((blockingTxId) => __awaiter(this, void 0, void 0, function* () { return algosdk_1.default.waitForConfirmation(this.algodClient, blockingTxId, 1000); })));
                    const blockingErrored = blockingTxs.some(result => result["pool-error"] != null);
                    if (blockingErrored) {
                        throw new Error('Error in blocking transaction');
                    }
                    // Fire blocked transaction
                    const newTxId = yield this.signAndSend(tx.transactions, tx.signCallback, tx.stateless);
                    if (newTxId.startsWith('#BlockedTxTemp')) {
                        throw new Error('Transaction was blocked twice');
                    }
                    // Wait for blocked transaction to complete
                    const result = yield algosdk_1.default.waitForConfirmation(this.algodClient, txId, 10000);
                    if (this.transactionFailed(result)) {
                        throw new Error(`Transaction rejected: ${txId}`);
                    }
                    return result;
                }
                else {
                    throw new Error(`Waiting on unknown transaction ID: ${txId}`);
                }
            }
        });
    }
    dryrunRequest(transactions, signCallback, stateless = new Map()) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate the total fees
            const totalFee = transactions.reduce((acc, val) => acc + val.fee, 0);
            const minFee = transactions.length * this.minFee;
            if (totalFee < minFee) {
                throw new assert_1.AssertionError({ message: `The minimum fee for a group of size ${transactions.length} is ${minFee}, but only given ${totalFee}` });
            }
            // Sign transactions
            const signed = yield Promise.all(transactions.map((tx) => __awaiter(this, void 0, void 0, function* () {
                const sender = (0, Encoding_1.encodeAddress)(tx.from.publicKey);
                const lsig = stateless.get(sender);
                if (lsig)
                    return algosdk_1.default.signLogicSigTransactionObject(tx, lsig).blob;
                const signedTx = yield signCallback([tx]);
                return signedTx[0];
            })));
            // Create dryrun request
            const dr = yield algosdk_1.default.createDryrun({
                client: this.algodClient,
                txns: signed.map((stxn) => algosdk_1.default.decodeSignedTransaction(stxn)),
            });
            const dryrunResponse = yield this.algodClient.dryrun(dr).do();
            return dryrunResponse;
        });
    }
    debugDryrunResult(result) {
        console.log(`Transaction count: ${result.txns.length}`);
        result.txns.forEach((txn, i) => {
            if (txn['logic-sig-trace']) {
                const passed = txn['logic-sig-messages'][0] === 'PASS';
                const disassembly = txn['logic-sig-disassembly'];
                const trace = txn['logic-sig-trace'];
                const msgHeader = `Group[${i}] logic sig: ${passed ? 'PASSED' : 'FAILED'}`;
                if (!passed) {
                    const msgBody = trace.map(({ line, pc, stack }) => {
                        const stackMsg = stack.map((entry) => {
                            switch (entry.type) {
                                case 1: return `bytes ${entry.bytes}`;
                                case 2: return `uint ${entry.uint}`;
                            }
                        });
                        return `${pc}: ${disassembly[line]} | ${stackMsg}`;
                    }).join('\n');
                    const msg = msgHeader + '\n' + msgBody;
                    console.log(msg);
                }
                else {
                    console.log(msgHeader);
                }
            }
            if (txn['app-call-messages'] !== undefined) {
                const passed = txn['app-call-messages'][1] === 'PASS';
                const trace = txn['app-call-trace'];
                const cost = txn['cost'];
                const disassembly = txn['disassembly'];
                const msgHeader = `Group[${i}]: ${passed ? 'PASSED' : 'FAILED'}, cost: ${cost}`;
                if (!passed) {
                    const msgBody = trace.map((entry) => {
                        var _a;
                        const opcode = disassembly[entry.line];
                        const scratchMsg = (_a = entry.scratch) === null || _a === void 0 ? void 0 : _a.map((x, i) => {
                            switch (x.type) {
                                case 0: return '';
                                case 1: return `${i}: bytes ${x.bytes}`;
                                case 2: return `${i}: uint ${x.uint}`;
                                default: return `${i}: UNKNOWN`;
                            }
                        }).filter((x) => x !== '').join('\n');
                        const stackMsg = entry.stack.map((x) => {
                            switch (x.type) {
                                case 1: return `bytes ${x.bytes}`;
                                case 2: return `uint ${x.uint}`;
                                default: return `UNKNOWN`;
                            }
                        });
                        return `${entry.line}(${entry.pc}): ${opcode} | [${stackMsg.join(', ')}]` + `\n${scratchMsg !== null && scratchMsg !== void 0 ? scratchMsg : ''}`;
                    }).join("\n\n");
                    console.log(msgHeader + "\n" + msgBody);
                }
                else {
                    console.log(msgHeader);
                }
            }
            else {
                console.log(`Group[${i}] keys: ${Object.keys(txn)}`);
            }
        });
    }
    makeApp(app, templateValues) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                approval: yield this.compileProgram(app.approval, templateValues),
                clear: yield this.compileProgram(app.clear, templateValues),
                stateInfo: app.stateInfo,
            };
        });
    }
    makeSourceApp(pySourcePath, stateInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            // Compile python program
            const results = yield this.compilePyTeal(pySourcePath, 2);
            return {
                approval: results[0],
                clear: results[1],
                stateInfo,
            };
        });
    }
    deleteApplication(sender, id, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.getParams();
            const txApp = algosdk_1.default.makeApplicationDeleteTxn(sender, params, id);
            const txns = [txApp];
            return this.signAndSend(txns, signCallback);
        });
    }
    deleteAsset(sender, id, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.getParams();
            const tx = algosdk_1.default.makeAssetDestroyTxnWithSuggestedParams(sender, undefined, id, params);
            const txns = [tx];
            return this.signAndSend(txns, signCallback);
        });
    }
    clearApplication(sender, id, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.getParams();
            const txApp = algosdk_1.default.makeApplicationClearStateTxn(sender, params, id);
            const txns = [txApp];
            return this.signAndSend(txns, signCallback);
        });
    }
    closeApplication(sender, id, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.getParams();
            const txApp = algosdk_1.default.makeApplicationCloseOutTxn(sender, params, id);
            const txns = [txApp];
            return this.signAndSend(txns, signCallback);
        });
    }
    deployApplication(sender, app, signCallback, extraCompBudgetTxns, args, appAccounts, appApps, extraPages, fee, debug) {
        return __awaiter(this, void 0, void 0, function* () {
            const compBudgetTxns = extraCompBudgetTxns ? extraCompBudgetTxns : [];
            const params = yield this.getParams();
            params.fee = fee ? fee : params.fee;
            const appArgs = args ? (0, Encoding_1.encodeArgArray)(args) : undefined;
            const onComplete = algosdk_1.OnApplicationComplete.NoOpOC;
            const foreignApps = appApps ? appApps : undefined;
            const foreignAssets = undefined;
            const note = undefined;
            const lease = undefined;
            const rekeyTo = undefined;
            const localInts = Object.entries(app.stateInfo.local).filter(([_, type]) => type === 'uint').length;
            const localBytes = Object.entries(app.stateInfo.local).filter(([_, type]) => type === 'bytes').length;
            const globalInts = Object.entries(app.stateInfo.global).filter(([_, type]) => type === 'uint').length;
            const globalBytes = Object.entries(app.stateInfo.global).filter(([_, type]) => type === 'bytes').length;
            const txApp = algosdk_1.default.makeApplicationCreateTxn(sender, params, onComplete, app.approval, app.clear, localInts, localBytes, globalInts, globalBytes, appArgs, appAccounts, foreignApps, foreignAssets, note, lease, rekeyTo, extraPages);
            const txns = [txApp, ...compBudgetTxns];
            return this.callGroupTransaction(txns, new Map(), signCallback, debug);
        });
    }
    deploySourceApplication(from, sourceApp, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const compiledApp = yield this.makeApp(sourceApp);
            const deployId = yield this.deployApplication(from, compiledApp, signCallback, []);
            return deployId;
        });
    }
    updateApplication(sender, id, app, signCallback, args, appAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.getParams();
            const appArgs = args ? (0, Encoding_1.encodeArgArray)(args) : undefined;
            const txApp = algosdk_1.default.makeApplicationUpdateTxn(sender, params, id, app.approval, app.clear, appArgs, appAccounts);
            const txns = [txApp];
            return this.signAndSend(txns, signCallback);
        });
    }
    makeCallTransaction(from, id, appOnComplete = algosdk_1.OnApplicationComplete.NoOpOC, args = [], accounts = [], foreignApps = [], foreignAssets = [], txNote = "", fee = this.minFee, reKeyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedParams = yield this.getParams();
            suggestedParams.fee = fee;
            const appArgs = args.length > 0 ? (0, Encoding_1.encodeArgArray)(args) : undefined;
            const appAccounts = accounts.length > 0 ? accounts : undefined;
            const appForeignApps = foreignApps.length > 0 ? foreignApps : undefined;
            const appForeignAssets = foreignAssets.length > 0 ? foreignAssets : undefined;
            const note = (0, Encoding_1.encodeString)(txNote);
            const txObj = {
                type: algosdk_1.TransactionType.appl, from, suggestedParams, appIndex: id,
                appOnComplete, appArgs, appAccounts, appForeignApps, appForeignAssets, note, reKeyTo
            };
            return new algosdk_1.Transaction(txObj);
        });
    }
    makePayTransaction(from, to, amount, fee = this.minFee, txNote = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedParams = yield this.getParams();
            suggestedParams.fee = fee;
            const note = (0, Encoding_1.encodeString)(txNote);
            const txObj = {
                type: algosdk_1.TransactionType.pay, from, to, amount, suggestedParams, note
            };
            return new algosdk_1.Transaction(txObj);
        });
    }
    makeAssetTransferTransaction(from, to, assetIndex, amount, fee = this.minFee, txNote = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedParams = yield this.getParams();
            suggestedParams.fee = fee;
            const note = (0, Encoding_1.encodeString)(txNote);
            const txObj = {
                type: algosdk_1.TransactionType.axfer, from, to, assetIndex, amount, suggestedParams, note
            };
            return new algosdk_1.Transaction(txObj);
        });
    }
    makeAssetCreationTransaction(from, assetTotal, assetDecimals, assetUnitName, assetName, assetURL, fee = this.minFee, txNote = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedParams = yield this.getParams();
            suggestedParams.fee = fee;
            const note = (0, Encoding_1.encodeString)(txNote);
            const assetDefaultFrozen = false;
            const assetManager = from;
            const assetReserve = from;
            const assetFreeze = from;
            const assetClawback = from;
            const txObj = {
                type: algosdk_1.TransactionType.acfg, from, assetTotal, assetDecimals,
                assetDefaultFrozen, assetManager, assetReserve, assetFreeze,
                assetClawback, assetUnitName, assetName, assetURL,
                suggestedParams, note
            };
            return new algosdk_1.Transaction(txObj);
        });
    }
    makeAssetOptInTransaction(from, assetId, fee = this.minFee, txNote = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const suggestedParams = yield this.getParams();
            suggestedParams.fee = fee;
            const note = new Uint8Array(Buffer.from(txNote));
            return algosdk_1.default.makeAssetTransferTxnWithSuggestedParams(from, from, undefined, undefined, 0, note, assetId, suggestedParams, undefined);
        });
    }
    callApplication(sender, id, appOnComplete, args, accounts, foreignApps, foreignAssets, txNote, signCallback, fee) {
        return __awaiter(this, void 0, void 0, function* () {
            const txApp = yield this.makeCallTransaction(sender, id, appOnComplete, args, accounts, foreignApps, foreignAssets, txNote, fee);
            const txns = [txApp];
            return this.signAndSend(txns, signCallback);
        });
    }
    callGroupTransaction(txns, mappedStateless, signCallback, dryrunTest) {
        return __awaiter(this, void 0, void 0, function* () {
            if (txns.length == 0) {
                throw new Error('Invalid transaction count');
            }
            algosdk_1.default.assignGroupID(txns);
            return this.signAndSend(txns, signCallback, mappedStateless, dryrunTest);
        });
    }
    dryrunGroupTransaction(txns, mappedStateless, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            algosdk_1.default.assignGroupID(txns);
            const result = yield this.dryrunRequest(txns, signCallback, mappedStateless);
            txns.forEach((tx) => tx.group = undefined);
            return result;
        });
    }
    static parseCode(code, templateValues) {
        const substitutions = templateValues !== null && templateValues !== void 0 ? templateValues : new Map();
        const result = [...substitutions.entries()].reduce(([acc, params], [key, val]) => {
            const keyParts = key.split('_');
            const typeCode = keyParts[1][0];
            const description = keyParts[1].substring(1);
            const name = keyParts.slice(2).join('_');
            const typeDict = {
                'I': FieldType.UINT,
                'B': FieldType.BYTES,
                'A': FieldType.ADDRESS,
                'S': FieldType.STRING,
            };
            let printedVal = "";
            const type = typeDict[typeCode];
            switch (type) {
                case FieldType.BYTES: {
                    const buffer = Buffer.from(val);
                    if (description === 'N' || buffer.length === parseInt(description, 10)) {
                        printedVal = '0x' + buffer.toString('hex');
                    }
                    else {
                        throw new Error('Size of buffer does not match template size for template variable ' + key);
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
    compileStateless(pyPath, templateValues, overrideArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = yield this.compilePyTeal(pyPath, 1, overrideArgs);
            return new algosdk_1.LogicSigAccount(yield this.compileProgram(code[0], templateValues));
        });
    }
    readAsset(asset) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.algodClient.getAssetByID(asset).do();
        });
    }
    getAssetName(assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (assetId === 0) {
                return "ALGO";
            }
            let assetName = this.assetNames.get(assetId);
            if (!assetName) {
                const assetFromAlgorand = yield this.readAsset(assetId);
                assetName = assetFromAlgorand.params['name'];
                this.assetNames.set(assetId, assetName !== null && assetName !== void 0 ? assetName : "");
            }
            return assetName;
        });
    }
    readAccount(from) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.algodClient.accountInformation(from).do();
        });
    }
    readCreatedApps(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.readAccount(from);
            return response['created-apps'];
        });
    }
    readCreatedAssets(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.readAccount(from);
            return response['created-assets'];
        });
    }
    readOptedInApps(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.readAccount(from);
            return response['apps-local-state'];
        });
    }
    readOptedInAssets(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.readAccount(from);
            return response['assets'];
        });
    }
    readAmount(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.readAccount(from);
            return BigInt(response['amount']);
        });
    }
    readAssetBalances(from) {
        return __awaiter(this, void 0, void 0, function* () {
            const assets = yield this.readOptedInAssets(from);
            return new Map(assets.map((asset) => [asset['asset-id'], BigInt(asset['amount'])]));
        });
    }
    readAssetAmount(from, id) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return (_a = (yield this.readAssetBalances(from)).get(id)) !== null && _a !== void 0 ? _a : BigInt(0);
        });
    }
    getAllAppGlobalState(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.algodClient.getApplicationByID(id).do();
            return response.params['global-state'];
        });
    }
    // TODO: Extend to handle local state as well
    getAppStateInfo(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield this.getAllAppGlobalState(id);
            if (!state) {
                throw new Error('App state is missing');
            }
            const globalPairs = state.map(entry => [(0, Encoding_1.decodeString)((0, Encoding_1.decodeBase64)(entry.key)), entry.value.type === 0 ? 'uint' : 'bytes']);
            return {
                global: Object.fromEntries(globalPairs),
                local: {},
            };
        });
    }
    readAppGlobalState(id, stateInfo, errorOnMissing = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = yield this.algodClient.getApplicationByID(id).do();
            const state = app.params['global-state'];
            return (0, Encoding_1.decodeState)(state, stateInfo.global, errorOnMissing);
        });
    }
    readAppLocalState(id, from, stateInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.readAccount(from);
            const state = info['apps-local-state'].find((v) => v['id'] === id);
            if (!state)
                throw new Error("No local state found for address " + from);
            return (0, Encoding_1.decodeState)(state['key-value'], stateInfo.local);
        });
    }
    deleteApps(address, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const apps = yield this.readCreatedApps(address);
            for (const app of apps) {
                const txId = yield this.deleteApplication(address, app.id, signCallback);
                yield this.waitForTransactionResponse(txId);
                console.log(`Application Deleted -> TxId: ${txId}`);
            }
            console.log("Deletion finished.");
        });
    }
    clearApps(address, signCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const apps = yield this.readOptedInApps(address);
            for (const app of apps) {
                const txId = yield this.clearApplication(address, app.id, signCallback);
                yield this.waitForTransactionResponse(txId);
                console.log(`Cleared from Application -> TxId ${txId}`);
            }
            console.log("Clear finished.");
        });
    }
    // TODO: Include the remaining compile steps in this function, so it returns the entire compiled program ready to use all in one step
    compilePyTeal(pytealSourceFile, outputCount, overrideArgs) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check the in-memory cache to perform fewer file stats
            const cached = Deployer.tealCache.get(pytealSourceFile);
            if (cached) {
                return cached;
            }
            // Generate compile directory for teal files
            const tealPath = '../../../.teal';
            if (!fs_1.default.existsSync(tealPath)) {
                fs_1.default.mkdirSync(tealPath);
            }
            // Generate a unique name
            const fileBody = fs_1.default.readFileSync(pytealSourceFile);
            const nonce = crypto_1.default.createHash('sha256').update(fileBody).digest('hex');
            const outputPaths = [...Array(outputCount)].map((_, index) => path_1.default.join(tealPath, `${path_1.default.basename(pytealSourceFile, '.py')}-${index}-${nonce}.teal`));
            // Check disk cache to skip compile if we can
            const alreadyExists = outputPaths.reduce((accum, p) => accum || fs_1.default.existsSync(p), false);
            if (!alreadyExists) {
                // Run current program
                const pythonCommand = 'python3.10';
                const preArgs = overrideArgs !== null && overrideArgs !== void 0 ? overrideArgs : [];
                const args = [...preArgs, ...outputPaths];
                const cmd = `${pythonCommand} "${pytealSourceFile}" ${args.join(' ')}`;
                console.log(`Running command ${cmd}`);
                const logs = yield util_1.default.promisify(child_process_1.default.exec)(cmd);
                if (logs.stderr && logs.stderr.length > 0) {
                    throw Error(`Could not compile file: ${pytealSourceFile} with ${pythonCommand}.\nError: ${logs.stderr}`);
                }
            }
            // Gather results
            const results = outputPaths.map(p => fs_1.default.readFileSync(p, 'utf-8'));
            // Update in-memory cache
            Deployer.tealCache.set(pytealSourceFile, results);
            return results;
        });
    }
    createRedeemWormholeTransactions(vaa, sender) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield (0, wormhole_sdk_1.redeemOnAlgorand)(this.algodClient, Environment_1.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_TESTNET, Environment_1.WORMHOLE_ALGORAND_BRIDGE_ID_TESTNET, vaa, sender)).map(pair => pair.tx);
        });
    }
}
exports.Deployer = Deployer;
// Teal cache
Deployer.tealCache = new Map();
//# sourceMappingURL=Deployer.js.map