"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeDelegationAttributes = exports.encodeDelegationAttributes = void 0;
function encodeDelegationAttributes(attr) {
    const buf = Buffer.alloc(1 + 2 + 8);
    buf.writeUInt8(attr.version, 0);
    buf.writeUInt16BE(attr.permission_bit_mask, 1);
    buf.writeBigUInt64BE(attr.expiration, 3);
    return buf;
}
exports.encodeDelegationAttributes = encodeDelegationAttributes;
function decodeDelegationAttributes(buf) {
    try {
        const attr = {
            version: buf.readUInt8(0),
            permission_bit_mask: buf.readUInt16BE(1),
            expiration: buf.readBigUInt64BE(3)
        };
        return attr;
    }
    catch (e) {
        throw new Error(`Error decoding attributes: ${e}`);
    }
}
exports.decodeDelegationAttributes = decodeDelegationAttributes;
//# sourceMappingURL=ADEHelper.js.map