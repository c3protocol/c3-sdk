"use strict";
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
exports.Fetch = void 0;
const Json_1 = require("./Json");
const node_fetch_1 = __importDefault(require("node-fetch"));
class Fetch {
    constructor(serverURL) {
        this.serverURL = serverURL;
    }
    postObject(object, path) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, node_fetch_1.default)(this.serverURL + path, {
                method: 'POST',
                body: (0, Json_1.stringifyJSON)(object),
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.status !== 200)
                throw yield response.text();
            return (0, Json_1.parseJSON)(yield response.text());
        });
    }
    getObject(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, node_fetch_1.default)(this.serverURL + path, {
                method: 'GET'
            });
            if (response.status !== 200)
                throw yield response.text();
            return (0, Json_1.parseJSON)(yield response.text());
        });
    }
    postOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.postObject(order, 'orders');
        });
    }
    postCancel(order) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.postObject(order, 'cancels');
        });
    }
    postDeposit(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.postObject(req, 'proxy/deposit');
        });
    }
    postUserProxyRequest(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.postObject(req, `proxy/perform`);
        });
    }
    getProxyOptedIn(proxy) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`proxy/opted-in/${proxy}`);
        });
    }
    getConnectInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject('connectInfo');
        });
    }
    getAssets() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject('assets');
        });
    }
    getPairs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject('pairs');
        });
    }
    getUserHealth(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`dynamic-health/${user}`);
        });
    }
    getUserOrders(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`orders/${user}`);
        });
    }
    getGroupedOrders(tokenA, tokenB, count) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`orders/${tokenA}/${tokenB}/${count}`);
        });
    }
    getUserCancelledOrders(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`cancels/${user}`);
        });
    }
    getLatestMatches(count) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`matches?pageSize=${count}`);
        });
    }
    getUserMatches(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`matches/${user}`);
        });
    }
    getOnChainOrder(proxy) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`matcher/local/${proxy}`);
        });
    }
    getOnChainBalance(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`ce/local/${user}`);
        });
    }
    lookupLendingPool(user, assetId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getObject(`bl/local/${user}/${assetId}`);
        });
    }
}
exports.Fetch = Fetch;
//# sourceMappingURL=Fetch.js.map