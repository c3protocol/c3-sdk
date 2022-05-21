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
exports.UserProxy = exports.PROXY_BYTECODE_CHUNKS = void 0;
/* eslint-disable no-case-declarations */
const algosdk_1 = __importStar(require("algosdk"));
const crypto_1 = __importDefault(require("crypto"));
const ADEHelper_1 = require("./ADEHelper");
const C3RequestTypes_1 = require("./C3RequestTypes");
const Encoding_1 = require("./Encoding");
exports.PROXY_BYTECODE_CHUNKS = [
    "062003010006311024124000010031192212311b231210400104224000010031102412443102311b2209c01a5740081712443104311b2209c01a574808171244310f31181650310216503104165031065031191650312050310550310116503500233501311b22093502340134020c40009a223501311d22083502340134020c400077223501313322083502340134020c40005323350131313502340134020c4000313400311b2209c01a5700408020",
    "0444224334003401C0301650350034012208350142FFB434003401C0321650350034012208350142FF9234003401C01C50350034012208350142FF6F34003401C01A50350034012208350142FF4C23381022124423380881C09A0C0F442338008020",
    "1244228008",
    "88002081028008",
    "88001181038008",
    "880002224335043503340338102412443403381834041712443403381922124434033820320312443403381B2312443403381D2312443403383323124434033831231244340338058000124489"
];
const compiledProxyFormat = {
    chunk1: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[0].length / 2 },
    user: { type: 'address' },
    chunk2: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[1].length / 2 },
    server: { type: 'address' },
    chunk3: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[2].length / 2 },
    blId: { type: 'number' },
    chunk4: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[3].length / 2 },
    ceId: { type: 'number' },
    chunk5: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[4].length / 2 },
    adeId: { type: 'number' },
    chunk6: { type: 'bytes', size: exports.PROXY_BYTECODE_CHUNKS[5].length / 2 },
};
class UserProxy {
    constructor(deployer, user, server, proxy, contracts, signCallback, tealSignCallback) {
        this.deployer = deployer;
        this.user = user;
        this.server = server;
        this.proxy = proxy;
        this.contracts = contracts;
        this.signCallback = signCallback;
        this.tealSignCallback = tealSignCallback;
    }
    static compileUserProxySig(deployer, user, contracts, server) {
        return __awaiter(this, void 0, void 0, function* () {
            return deployer.compileStateless('../../../contracts/ce/UserProxy.py', new Map([
                ["TMPL_A_USER_ADDRESS", user],
                ["TMPL_A_SERVER", server],
                ["TMPL_B8_BL_ID", (0, Encoding_1.encodeUint64)(contracts.lendingPool)],
                ["TMPL_B8_CE_ID", (0, Encoding_1.encodeUint64)(contracts.ceOnchain)],
                ["TMPL_B8_ADE_ID", (0, Encoding_1.encodeUint64)(contracts.ade)],
            ]));
        });
    }
    static compileUserProxy(deployer, server, user, contracts, sign, tealSign) {
        return __awaiter(this, void 0, void 0, function* () {
            const proxy = yield UserProxy.compileUserProxySig(deployer, user, contracts, server);
            return new UserProxy(deployer, user, server, proxy, contracts, sign, tealSign);
        });
    }
    static makeUserProxySig(user, server, contracts) {
        const data = {
            chunk1: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[0]),
            user,
            chunk2: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[1]),
            server,
            chunk3: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[2]),
            blId: contracts.lendingPool,
            chunk4: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[3]),
            ceId: contracts.ceOnchain,
            chunk5: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[4]),
            adeId: contracts.ade,
            chunk6: (0, Encoding_1.decodeBase16)(exports.PROXY_BYTECODE_CHUNKS[5]),
        };
        const bytecode = (0, Encoding_1.packData)(data, compiledProxyFormat);
        return new algosdk_1.LogicSigAccount(bytecode);
    }
    static makeUserProxy(deployer, server, user, contracts, sign, tealSign) {
        const proxy = UserProxy.makeUserProxySig(user, server, contracts);
        return new UserProxy(deployer, user, server, proxy, contracts, sign, tealSign);
    }
    // FIXME: Test with 0..15 args
    makeCallTransaction(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const extraData = (0, Encoding_1.concatArrays)((0, Encoding_1.encodeArgArray)([
                args.signature,
                args.firstValid,
                args.lastValid,
                args.lease,
                args.from,
            ]));
            const callTx = yield this.deployer.makeCallTransaction(this.address(), args.appId, args.appOnComplete, [...args.args, extraData], args.accounts, args.foreignApps, args.foreignAssets, args.txNote, args.fee);
            callTx.lease = args.lease;
            callTx.firstRound = args.firstValid;
            callTx.lastRound = args.lastValid;
            return callTx;
        });
    }
    address() {
        return this.proxy.address();
    }
    // TODO: Merge all the prepare/generate functions to have one public API function that handles all C3 operations
    generateDepositGroup(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTxns = [];
            if (req.performOptIn) {
                // Transactions required for the Initial Deposit
                allTxns.push(yield this.deployer.makePayTransaction(this.server, this.address(), BigInt(2050000), 4 * this.deployer.minFee), yield this.deployer.makeCallTransaction(this.address(), this.contracts.lendingPool, algosdk_1.OnApplicationComplete.OptInOC, [], [], [], [], "", 0), yield this.deployer.makeCallTransaction(this.address(), this.contracts.ceOnchain, algosdk_1.OnApplicationComplete.OptInOC, [], [], [], [], "", 0), yield this.deployer.makeCallTransaction(this.address(), this.contracts.ade, algosdk_1.OnApplicationComplete.OptInOC, [], [], [], [], "", 0));
            }
            // Application call to perform de Deposit Operation
            allTxns.push(yield this.deployer.makeCallTransaction(this.server, this.contracts.ceOnchain, algosdk_1.OnApplicationComplete.NoOpOC, ["deposit"], [this.user, this.address()], [], [], "", 2 * this.deployer.minFee));
            // Funds transfer transactions
            // Funds can come from an Algorand User, using a Payment or an Asset Transfer transaction
            //   or from Whormhole by claming a VAA through a set of transactions created by the Whormhole's SDK
            const firstFundsTransferIndex = allTxns.length;
            let transactionToSignIndex = 0;
            if (req.wormholeVAA) {
                const wormholeTxns = yield this.deployer.createRedeemWormholeTransactions(req.wormholeVAA, (0, Encoding_1.encodeApplicationAddress)(this.contracts.ceOnchain));
                allTxns.push(...wormholeTxns);
            }
            else {
                allTxns.push(req.assetId === 0
                    ? yield this.deployer.makePayTransaction(this.user, (0, Encoding_1.encodeApplicationAddress)(this.contracts.ceOnchain), req.amount, 0)
                    : yield this.deployer.makeAssetTransferTransaction(this.user, (0, Encoding_1.encodeApplicationAddress)(this.contracts.ceOnchain), req.assetId, req.amount, 0));
                transactionToSignIndex = firstFundsTransferIndex;
            }
            // PLEASE NOTE: Removed call to assignGroupID from this place because we might need to manipulate depositTxns further outside of this function.
            //  For instance, in the server side of deposits, we might want to change firstRound and lastRound to match the ones provided in the signed user's transaction.
            return [allTxns, firstFundsTransferIndex, transactionToSignIndex];
        });
    }
    prepareDeposit(req) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: it makes no sense to receive a CERequest here as the only valid operation is C3RequestOp.CE_Deposit
            const [txns, startDataIndex, transactionToSignIndex] = yield this.generateDepositGroup(req);
            const grouped = (0, algosdk_1.assignGroupID)(txns);
            if (grouped === undefined || grouped.length === 0) {
                throw new Error('Could not assign a group ID to the payment transaction');
            }
            const signed = transactionToSignIndex > 0
                ? (0, Encoding_1.encodeBase64)((yield this.signCallback([grouped[transactionToSignIndex]]))[0]) // User Signature
                : '';
            return {
                op: C3RequestTypes_1.C3RequestOp.CE_Deposit,
                from: this.user,
                assetId: req.assetId,
                amount: req.amount,
                data: grouped.slice(startDataIndex),
                signed
            };
        });
    }
    // TODO: Run validation on the request for sanity?
    // Convenience function to generate the user proxy request based on a simple structure
    prepareCEOp(req) {
        return __awaiter(this, void 0, void 0, function* () {
            let args = [req.op, (0, algosdk_1.decodeAddress)(this.user).publicKey];
            let accounts = [this.address()];
            let foreignApps = [];
            const foreignAssets = [];
            switch (req.op) {
                case C3RequestTypes_1.C3RequestOp.CE_Borrow:
                case C3RequestTypes_1.C3RequestOp.CE_Lend:
                case C3RequestTypes_1.C3RequestOp.CE_Redeem:
                case C3RequestTypes_1.C3RequestOp.CE_Repay:
                case C3RequestTypes_1.C3RequestOp.CE_Withdraw: {
                    args.push(req.amount);
                    if (req.assetId !== 0) {
                        foreignAssets.push(req.assetId);
                    }
                    accounts.push(this.user);
                    break;
                }
                case C3RequestTypes_1.C3RequestOp.CE_Liquidate: {
                    const { keys: liabilityIds, values: liabilityAmounts } = (0, Encoding_1.encodeC3PyTealDictionary)(req.liabilities);
                    const { keys: collateralIds, values: collateralAmounts } = (0, Encoding_1.encodeC3PyTealDictionary)(req.collaterals);
                    args.push(liabilityIds, liabilityAmounts, collateralIds, collateralAmounts);
                    accounts.push(req.user);
                    break;
                }
            }
            /* For request supporting delegation, forward call to ADE instead */
            let isDelegated = false;
            let appId = this.contracts.ceOnchain;
            if ('primaryAccount' in req && req.primaryAccount) {
                if (algosdk_1.default.isValidAddress(req.primaryAccount)) {
                    appId = this.contracts.ade;
                    const primaryProxy = yield UserProxy.compileUserProxy(this.deployer, this.server, this.user, this.contracts, this.signCallback, this.tealSignCallback);
                    args = ["verify", ...args]; // ADE call.
                    accounts = [...accounts, primaryProxy.address()];
                    foreignApps.push(this.contracts.ceOnchain);
                    isDelegated = true;
                }
                else {
                    throw new Error('Invalid Primary account specified for delegation');
                }
            }
            const proxyRequest = yield this.createRequest({
                from: this.user,
                isDelegated,
                proxyAddress: this.address(),
                appId,
                args,
                accounts,
                foreignApps: [...foreignApps, this.contracts.priceKeeper, this.contracts.priceMapper, this.contracts.rateOracle, this.contracts.lendingPool],
                foreignAssets,
            });
            const signData = yield this.signCallData(proxyRequest);
            return signData;
        });
    }
    prepareDelegationOp(req) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const proxyRequest = yield this.createRequest({
                from: this.user,
                proxyAddress: this.address(),
                appId: req.adeAppId,
                args: [req.op, (0, algosdk_1.decodeAddress)(this.user).publicKey],
                accounts: [this.address(), req.delegateAccount],
            });
            if (req.delegationAttributes) {
                (_a = proxyRequest.args) === null || _a === void 0 ? void 0 : _a.push((0, ADEHelper_1.encodeDelegationAttributes)(req.delegationAttributes));
            }
            const signData = yield this.signCallData(proxyRequest);
            return signData;
        });
    }
    createRequest(assigns) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = yield this.deployer.getParams();
            const zeroAddress = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";
            return Object.assign({ from: zeroAddress, isDelegated: false, proxyAddress: zeroAddress, appId: 0, appOnComplete: algosdk_1.OnApplicationComplete.NoOpOC, args: [], accounts: [], foreignApps: [], foreignAssets: [], fee: 0, firstValid: params.firstRound, lastValid: params.lastRound, lease: new Uint8Array(crypto_1.default.randomBytes(32)), rekeyTo: zeroAddress, txNote: "" }, assigns);
        });
    }
    signCallData(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullArgs = [
                algosdk_1.TransactionType.appl,
                req.appId,
                req.firstValid,
                req.lastValid,
                req.lease,
                req.appOnComplete,
                (0, algosdk_1.decodeAddress)(req.rekeyTo).publicKey,
                req.txNote,
                req.fee,
                ...req.args,
                ...req.accounts.map(x => (0, algosdk_1.decodeAddress)(x).publicKey),
                ...req.foreignApps,
                ...req.foreignAssets,
            ];
            const data = (0, Encoding_1.concatArrays)((0, Encoding_1.encodeArgArray)(fullArgs));
            const signature = yield this.tealSignCallback(data, req.from, req.proxyAddress);
            return Object.assign(Object.assign({}, req), { signature });
        });
    }
}
exports.UserProxy = UserProxy;
//# sourceMappingURL=UserProxy.js.map