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
exports.decodeCancelledOrder = exports.encodeCancelledOrder = exports.decodeSignedCancel = exports.encodeSignedCancel = exports.decodeCancelData = exports.encodeCancelData = exports.signCancel = exports.compileCancel = exports.makeCancelDataFromOrder = exports.makeCancelData = void 0;
const Encoding_1 = require("./Encoding");
const Order_1 = require("./Order");
function makeCancelData(user, have_id, have_amount, order_proxy) {
    return { user, have_id, have_amount, order_proxy };
}
exports.makeCancelData = makeCancelData;
function makeCancelDataFromOrder(deployer, matcher_id, order) {
    return __awaiter(this, void 0, void 0, function* () {
        const proxy = yield (0, Order_1.makeOrderProxy)(order.data.user, matcher_id, order.data.createdOn);
        return {
            user: order.data.user,
            have_id: order.data.have_id,
            have_amount: order.data.have_amount,
            order_proxy: proxy.address(),
        };
    });
}
exports.makeCancelDataFromOrder = makeCancelDataFromOrder;
function compileCancel(deployer, matcher_id, server) {
    return __awaiter(this, void 0, void 0, function* () {
        return deployer.compileStateless('../../../contracts/dex/CancelProxy.py', new Map([
            ['TMPL_I_MATCHER_ID', matcher_id],
            ['TMPL_A_SERVER_KEY', server]
        ]));
    });
}
exports.compileCancel = compileCancel;
function signCancel(data, proxy_address, server_address, tealSignCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const encodedData = encodeCancelData(data);
        const signature = (0, Encoding_1.encodeBase64)(yield tealSignCallback(encodedData, server_address, proxy_address));
        return { data, signature };
    });
}
exports.signCancel = signCancel;
const cancelDataFormat = {
    have_id: { type: 'number' },
    have_amount: { type: 'uint' },
    order_proxy: { type: 'address' },
    user: { type: 'address' },
};
function encodeCancelData(data, includeType) {
    return (0, Encoding_1.packData)(data, cancelDataFormat, includeType);
}
exports.encodeCancelData = encodeCancelData;
function decodeCancelData(data, includeType) {
    return (0, Encoding_1.unpackData)(data, includeType ? undefined : cancelDataFormat);
}
exports.decodeCancelData = decodeCancelData;
const signedCancelFormat = {
    data: { type: 'object', info: cancelDataFormat },
    signature: { type: 'base64', size: Encoding_1.TEAL_SIGNATURE_LENGTH },
};
function encodeSignedCancel(data, includeType) {
    return (0, Encoding_1.packData)(data, signedCancelFormat, includeType);
}
exports.encodeSignedCancel = encodeSignedCancel;
function decodeSignedCancel(data, includeType) {
    return (0, Encoding_1.unpackData)(data, includeType ? undefined : signedCancelFormat);
}
exports.decodeSignedCancel = decodeSignedCancel;
const cancelledOrderFormat = {
    order: { type: 'hash', info: Order_1.serverOrderFormat },
    cancelOn: { type: 'number' },
    cancelTicket: { type: 'object', info: signedCancelFormat },
    proxyAddress: { type: 'address' },
};
function encodeCancelledOrder(data, includeType) {
    return (0, Encoding_1.packData)(data, cancelledOrderFormat, includeType);
}
exports.encodeCancelledOrder = encodeCancelledOrder;
function decodeCancelledOrder(data, tree, includeType) {
    return __awaiter(this, void 0, void 0, function* () {
        const cancelledOrder = (0, Encoding_1.unpackData)(data, includeType ? undefined : cancelledOrderFormat);
        const order = yield tree.getByHash(cancelledOrder.order);
        if (!order)
            throw new Error(`Couldn't find serverOrder ID ${cancelledOrder.order}`);
        cancelledOrder.order = order[0];
        return cancelledOrder;
    });
}
exports.decodeCancelledOrder = decodeCancelledOrder;
//# sourceMappingURL=Cancel.js.map