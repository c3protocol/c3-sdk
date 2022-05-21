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
exports.decodeServerOrder = exports.encodeServerOrder = exports.serverOrderFormat = exports.decodeSignedOrder = exports.encodeSignedOrder = exports.signedOrderFormat = exports.decodeOrderData = exports.encodeOrderData = exports.orderDataFormat = exports.makeOrderProxy = exports.ORDER_BYTECODE_CHUNKS = exports.compileOrderProxy = exports.signOrder = exports.makeOrderData = void 0;
const Encoding_1 = require("./Encoding");
const algosdk_1 = require("algosdk");
function makeOrderData(user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn) {
    return { user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn };
}
exports.makeOrderData = makeOrderData;
function signOrder(data, proxy_address, tealSignCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const encodedData = encodeOrderData(data);
        const signature = (0, Encoding_1.encodeBase64)(yield tealSignCallback(encodedData, data.user, proxy_address));
        return { data, signature };
    });
}
exports.signOrder = signOrder;
function compileOrderProxy(deployer, user, matcher_id, createdOn) {
    return __awaiter(this, void 0, void 0, function* () {
        return deployer.compileStateless('../../../contracts/dex/OrderProxy.py', new Map([
            ['TMPL_B8_MATCHER_ID', (0, Encoding_1.encodeUint64)(matcher_id)],
            ['TMPL_A_USER_ADDRESS', user],
            ['TMPL_B8_NONCE', (0, Encoding_1.encodeUint64)(createdOn)]
        ]));
    });
}
exports.compileOrderProxy = compileOrderProxy;
exports.ORDER_BYTECODE_CHUNKS = [
    "05260108",
    "31208005617070494428500312443110810612400001003119810012443118281712448008",
    "48361A01361A028020",
    "0444810143",
];
const compiledProxyFormat = {
    chunk1: { type: 'bytes', size: exports.ORDER_BYTECODE_CHUNKS[0].length / 2 },
    matcherId: { type: 'number' },
    chunk2: { type: 'bytes', size: exports.ORDER_BYTECODE_CHUNKS[1].length / 2 },
    createdOn: { type: 'number' },
    chunk3: { type: 'bytes', size: exports.ORDER_BYTECODE_CHUNKS[2].length / 2 },
    user: { type: 'address' },
    chunk4: { type: 'bytes', size: exports.ORDER_BYTECODE_CHUNKS[3].length / 2 },
};
function makeOrderProxy(user, matcherId, createdOn) {
    const data = {
        chunk1: (0, Encoding_1.decodeBase16)(exports.ORDER_BYTECODE_CHUNKS[0]),
        matcherId,
        chunk2: (0, Encoding_1.decodeBase16)(exports.ORDER_BYTECODE_CHUNKS[1]),
        createdOn,
        chunk3: (0, Encoding_1.decodeBase16)(exports.ORDER_BYTECODE_CHUNKS[2]),
        user,
        chunk4: (0, Encoding_1.decodeBase16)(exports.ORDER_BYTECODE_CHUNKS[3]),
    };
    const bytecode = (0, Encoding_1.packData)(data, compiledProxyFormat);
    return new algosdk_1.LogicSigAccount(bytecode);
}
exports.makeOrderProxy = makeOrderProxy;
exports.orderDataFormat = {
    user: { type: 'address' },
    have_id: { type: 'number' },
    want_id: { type: 'number' },
    have_amount: { type: 'uint' },
    want_amount: { type: 'uint' },
    expiresOn: { type: 'number' },
    createdOn: { type: 'number' },
};
function encodeOrderData(data, includeType) {
    return (0, Encoding_1.packData)(data, exports.orderDataFormat, includeType);
}
exports.encodeOrderData = encodeOrderData;
function decodeOrderData(data, includeType) {
    return (0, Encoding_1.unpackData)(data, includeType ? undefined : exports.orderDataFormat);
}
exports.decodeOrderData = decodeOrderData;
exports.signedOrderFormat = {
    data: { type: 'object', info: exports.orderDataFormat },
    signature: { type: 'base64', size: Encoding_1.TEAL_SIGNATURE_LENGTH },
};
function encodeSignedOrder(data, includeType) {
    return (0, Encoding_1.packData)(data, exports.signedOrderFormat, includeType);
}
exports.encodeSignedOrder = encodeSignedOrder;
function decodeSignedOrder(data, includeType) {
    return (0, Encoding_1.unpackData)(data, includeType ? undefined : exports.signedOrderFormat);
}
exports.decodeSignedOrder = decodeSignedOrder;
exports.serverOrderFormat = {
    userOrder: { type: 'object', info: exports.signedOrderFormat },
    isBuy: { type: 'boolean' },
    baseId: { type: 'number' },
    quoteId: { type: 'number' },
    price: { type: 'price' },
    amount: { type: 'uint' },
    makerFees: { type: 'price' },
    takerFees: { type: 'price' },
    isMarket: { type: 'boolean' },
    addedOn: { type: 'number' },
    proxyAddress: { type: 'address' }
};
function encodeServerOrder(data, includeType) {
    return (0, Encoding_1.packData)(data, exports.serverOrderFormat, includeType);
}
exports.encodeServerOrder = encodeServerOrder;
function decodeServerOrder(data, includeType) {
    return (0, Encoding_1.unpackData)(data, includeType ? undefined : exports.serverOrderFormat);
}
exports.decodeServerOrder = decodeServerOrder;
//# sourceMappingURL=Order.js.map