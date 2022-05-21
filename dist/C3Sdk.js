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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.C3Sdk = exports.connectC3 = exports.Signer = exports.Deployer = void 0;
const algosdk_1 = require("algosdk");
const Deployer_1 = require("./Deployer");
const Order_1 = require("./Order");
const Fetch_1 = require("./Fetch");
const UserProxy_1 = require("./UserProxy");
const C3RequestTypes_1 = require("./C3RequestTypes");
__exportStar(require("./types"), exports);
__exportStar(require("./Encoding"), exports);
__exportStar(require("./Order"), exports);
__exportStar(require("./Cancel"), exports);
__exportStar(require("./Match"), exports);
__exportStar(require("./MerkleTree"), exports);
__exportStar(require("./Json"), exports);
__exportStar(require("./UserProxy"), exports);
var Deployer_2 = require("./Deployer");
Object.defineProperty(exports, "Deployer", { enumerable: true, get: function () { return Deployer_2.Deployer; } });
var Signer_1 = require("./Signer");
Object.defineProperty(exports, "Signer", { enumerable: true, get: function () { return Signer_1.Signer; } });
function connectC3(serverURL, nodeURL, nodePort, nodeToken, signCallback, tealSignCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const algoSdk = new algosdk_1.Algodv2(nodeToken, nodeURL, nodePort);
        const deployer = new Deployer_1.Deployer(algoSdk);
        const fetch = new Fetch_1.Fetch(serverURL);
        const init = yield fetch.getConnectInfo();
        return new C3Sdk(deployer, fetch, init, signCallback, tealSignCallback);
    });
}
exports.connectC3 = connectC3;
class C3Sdk {
    constructor(deployer, fetch, init, signCallback, tealSignCallback) {
        this.deployer = deployer;
        this.fetch = fetch;
        this.init = init;
        this.signCallback = signCallback;
        this.tealSignCallback = tealSignCallback;
        this.isOptedInValues = new Map();
    }
    createUserProxy(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return UserProxy_1.UserProxy.makeUserProxy(this.deployer, this.init.serverAddr, user, this.init.contracts, this.signCallback, this.tealSignCallback);
        });
    }
    performC3Op(req, userProxy) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (req.op) {
                case C3RequestTypes_1.C3RequestOp.CE_Deposit: {
                    const isOptedIn = yield this.isOptedIn(userProxy.address());
                    req.performOptIn = !isOptedIn;
                    const prepared = yield userProxy.prepareDeposit(req);
                    return this.fetch.postDeposit(prepared);
                }
                case C3RequestTypes_1.C3RequestOp.CE_Borrow:
                case C3RequestTypes_1.C3RequestOp.CE_Lend:
                case C3RequestTypes_1.C3RequestOp.CE_Liquidate:
                case C3RequestTypes_1.C3RequestOp.CE_Redeem:
                case C3RequestTypes_1.C3RequestOp.CE_Repay:
                case C3RequestTypes_1.C3RequestOp.CE_Withdraw: {
                    const prepared = yield userProxy.prepareCEOp(req);
                    return this.fetch.postUserProxyRequest(prepared);
                }
                case C3RequestTypes_1.C3RequestOp.ADE_Register:
                case C3RequestTypes_1.C3RequestOp.ADE_Revoke: {
                    // NOTE: This list must be kept in sync with the set of cases from Delegation request
                    // FIXME: Really come up with a generi
                    const prepared = yield userProxy.prepareDelegationOp(req);
                    return this.fetch.postUserProxyRequest(prepared);
                }
            }
        });
    }
    createOrder(user, type, baseId, quoteId, price, amount, expiresOn, createdOn) {
        const baseAmnt = amount;
        const quoteAmnt = BigInt(Math.floor(price * Number(amount)));
        const [have_id, want_id, have_amount, want_amount] = type === "buy" ?
            [quoteId, baseId, quoteAmnt, baseAmnt] : [baseId, quoteId, baseAmnt, quoteAmnt];
        return { user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn };
    }
    createMarketOrder(user, type, baseId, quoteId, amount, expiresOn, createdOn) {
        const [have_id, want_id, have_amount, want_amount] = type === "buy" ?
            [quoteId, baseId, amount, BigInt(0)] : [baseId, quoteId, amount, BigInt(0)];
        return { user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn };
    }
    signOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            const proxy = yield this.makeOrderProxy(order.user, order.createdOn);
            return (0, Order_1.signOrder)(order, proxy.address(), this.tealSignCallback);
        });
    }
    makeOrderProxy(user, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, Order_1.makeOrderProxy)(user, this.init.contracts.optinDecorator, timestamp);
        });
    }
    submitOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.postOrder(order);
        });
    }
    cancelOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.postCancel(order);
        });
    }
    getAssets() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getAssets();
        });
    }
    getPairs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getPairs();
        });
    }
    isOptedIn(userProxy) {
        return __awaiter(this, void 0, void 0, function* () {
            let isOptedInValue = this.isOptedInValues.get(userProxy);
            if (isOptedInValue === undefined || !isOptedInValue) {
                isOptedInValue = yield this.fetch.getProxyOptedIn(userProxy);
                this.isOptedInValues.set(userProxy, isOptedInValue);
            }
            return isOptedInValue;
        });
    }
    getUserOrders(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getUserOrders(user);
        });
    }
    getGroupedOrders(tokenA, tokenB, count) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getGroupedOrders(tokenA, tokenB, count);
        });
    }
    getUserCancelledOrders(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getUserCancelledOrders(user);
        });
    }
    getLatestMatches(count) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getLatestMatches(count);
        });
    }
    getUserMatches(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getUserMatches(user);
        });
    }
    getOnChainOrder(proxy) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getOnChainOrder(proxy);
        });
    }
    getOnChainBalance(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getOnChainBalance(user);
        });
    }
    lookupLendingPool(user, assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.lookupLendingPool(user, assetId);
        });
    }
    getUserHealth(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fetch.getUserHealth(user);
        });
    }
}
exports.C3Sdk = C3Sdk;
//# sourceMappingURL=C3Sdk.js.map