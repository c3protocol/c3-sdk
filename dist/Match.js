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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMatch = exports.encodeMatch = void 0;
const Encoding_1 = require("./Encoding");
const Order_1 = require("./Order");
const matchFormat = {
    buyOrder: { type: 'hash', info: Order_1.serverOrderFormat },
    sellOrder: { type: 'hash', info: Order_1.serverOrderFormat },
    matchBuyAmount: { type: 'uint' },
    matchSellAmount: { type: 'uint' },
    matchBuyFees: { type: 'uint' },
    matchSellFees: { type: 'uint' },
    matchOn: { type: 'number' },
    matchPrice: { type: 'price' },
    buyOrderFirstMatch: { type: 'boolean' },
    buyOrderCompleted: { type: 'boolean' },
    sellOrderFirstMatch: { type: 'boolean' },
    sellOrderCompleted: { type: 'boolean' }
};
function encodeMatch(data, includeType) {
    return (0, Encoding_1.packData)(data, matchFormat, includeType);
}
exports.encodeMatch = encodeMatch;
function decodeMatch(data, tree, includeType) {
    return __awaiter(this, void 0, void 0, function* () {
        const match = (0, Encoding_1.unpackData)(data, includeType ? undefined : matchFormat);
        const buyOrder = yield tree.getByHash(match.buyOrder);
        const sellOrder = yield tree.getByHash(match.sellOrder);
        if (!buyOrder)
            throw new Error("Couldn't find buy order in the tree");
        if (!sellOrder)
            throw new Error("Couldn't find sell order in the tree");
        match.buyOrder = buyOrder[0];
        match.sellOrder = sellOrder[0];
        return match;
    });
}
exports.decodeMatch = decodeMatch;
//# sourceMappingURL=Match.js.map