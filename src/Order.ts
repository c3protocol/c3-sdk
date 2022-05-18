import { Address, AssetId, UnixTimestamp, OrderData, SignedOrder, ServerOrder } from "./types"
import { AlgorandType, IPackedInfo, encodeUint64, encodeBase64, decodeBase16, packData, unpackData, TEAL_SIGNATURE_LENGTH } from './Encoding'
import { LogicSigAccount } from "algosdk"
import { Deployer } from './Deployer'

export type TealSignCallback = (data: Uint8Array, from: Address, to: Address) => Promise<Uint8Array>

export function makeOrderData(user: Address, have_id: number, want_id: number,
                              have_amount: bigint, want_amount: bigint,
                              expiresOn: number, createdOn: number): OrderData {
    return {user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn}
}

export async function signOrder(data: OrderData, proxy_address: Address,
                                tealSignCallback: TealSignCallback): Promise<SignedOrder> {
    const encodedData = encodeOrderData(data)
    const signature = encodeBase64(await tealSignCallback(encodedData, data.user, proxy_address))
    return { data, signature }
}

export async function compileOrderProxy(deployer: Deployer, user: Address, matcher_id: AssetId, createdOn: UnixTimestamp): Promise<LogicSigAccount> {
    return deployer.compileStateless('../../../contracts/dex/OrderProxy.py', new Map<string, AlgorandType>([
        ['TMPL_B8_MATCHER_ID', encodeUint64(matcher_id)],
        ['TMPL_A_USER_ADDRESS', user],
        ['TMPL_B8_NONCE', encodeUint64(createdOn)]
    ]))
}

export const ORDER_BYTECODE_CHUNKS = [
    "05260108",
    "31208005617070494428500312443110810612400001003119810012443118281712448008",
    "48361A01361A028020",
    "0444810143",
]

const compiledProxyFormat: IPackedInfo = {
    chunk1: { type: 'bytes', size: ORDER_BYTECODE_CHUNKS[0].length / 2},
    matcherId: { type: 'number' },
    chunk2: { type: 'bytes', size: ORDER_BYTECODE_CHUNKS[1].length / 2},
    createdOn: { type: 'number' },
    chunk3: { type: 'bytes', size: ORDER_BYTECODE_CHUNKS[2].length / 2},
    user: { type: 'address' },
    chunk4: { type: 'bytes', size: ORDER_BYTECODE_CHUNKS[3].length / 2},
}

export function makeOrderProxy(user: Address, matcherId: AssetId, createdOn: UnixTimestamp): LogicSigAccount {
    const data = {
        chunk1: decodeBase16(ORDER_BYTECODE_CHUNKS[0]),
        matcherId,
        chunk2: decodeBase16(ORDER_BYTECODE_CHUNKS[1]),
        createdOn,
        chunk3: decodeBase16(ORDER_BYTECODE_CHUNKS[2]),
        user,
        chunk4: decodeBase16(ORDER_BYTECODE_CHUNKS[3]),
    }
    const bytecode = packData(data, compiledProxyFormat)
    return new LogicSigAccount(bytecode)
}

export const orderDataFormat: IPackedInfo = {
    user: { type: 'address' },
    have_id: { type: 'number' },
    want_id: { type: 'number' },
    have_amount: { type: 'uint' },
    want_amount: { type: 'uint' },
    expiresOn: { type: 'number' },
    createdOn: { type: 'number' },
}

export function encodeOrderData(data: OrderData, includeType?: boolean): Uint8Array {
    return packData(data, orderDataFormat, includeType)
}

export function decodeOrderData(data: Uint8Array, includeType?: boolean): OrderData {
    return unpackData(data, includeType ? undefined : orderDataFormat) as OrderData
}

export const signedOrderFormat: IPackedInfo = {
    data: { type: 'object', info: orderDataFormat },
    signature: { type: 'base64', size: TEAL_SIGNATURE_LENGTH },
}

export function encodeSignedOrder(data: SignedOrder, includeType?: boolean): Uint8Array {
    return packData(data, signedOrderFormat, includeType)
}

export function decodeSignedOrder(data: Uint8Array, includeType?: boolean): SignedOrder {
    return unpackData(data, includeType ? undefined : signedOrderFormat) as SignedOrder
}

export const serverOrderFormat: IPackedInfo = {
    userOrder: { type: 'object', info: signedOrderFormat },
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
}

export function encodeServerOrder(data: ServerOrder, includeType?: boolean): Uint8Array {
    return packData(data, serverOrderFormat, includeType)
}

export function decodeServerOrder(data: Uint8Array, includeType?: boolean): ServerOrder {
    return unpackData(data, includeType ? undefined : serverOrderFormat) as ServerOrder
}
