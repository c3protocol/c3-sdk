import { DelegationAttributes } from "./types"

export function encodeDelegationAttributes(attr: DelegationAttributes): Buffer {
    const buf = Buffer.alloc(1 + 2 + 8)
    buf.writeUInt8(attr.version, 0)
    buf.writeUInt16BE(attr.permission_bit_mask, 1)
    buf.writeBigUInt64BE(attr.expiration, 3)
    return buf
}

export function decodeDelegationAttributes(buf: Buffer): DelegationAttributes {
    try {
        const attr: DelegationAttributes = {
            version: buf.readUInt8(0),
            permission_bit_mask: buf.readUInt16BE(1),
            expiration: buf.readBigUInt64BE(3)
        }
        return attr
    } catch (e: unknown) {
        throw new Error(`Error decoding attributes: ${e}`)
    }
}