import { Address, Amount, AssetId, ServerOrder, SignedOrder } from "./types"
import { AlgorandType, IPackedInfo, encodeBase64, packData, unpackData, TEAL_SIGNATURE_LENGTH } from './Encoding'
import { Deployer } from './Deployer'
import { CancelledOrder, CancelData, SignedCancel } from './types'
import { makeOrderProxy, serverOrderFormat, TealSignCallback } from "./Order"
import { LogicSigAccount } from "algosdk"
import { MerkleTree } from "./MerkleTree"

export function makeCancelData(user: Address, have_id: AssetId, have_amount: Amount, order_proxy: Address): CancelData {
    return { user, have_id, have_amount, order_proxy }
}

export async function makeCancelDataFromOrder(deployer: Deployer, matcher_id: number, order: SignedOrder): Promise<CancelData> {
    const proxy = await makeOrderProxy(order.data.user, matcher_id, order.data.createdOn)
    return {
        user: order.data.user,
        have_id: order.data.have_id,
        have_amount: order.data.have_amount,
        order_proxy: proxy.address(),
    }
}

export async function compileCancel(deployer: Deployer, matcher_id: number, server: Address): Promise<LogicSigAccount> {
    return deployer.compileStateless('../../../contracts/dex/CancelProxy.py', new Map<string, AlgorandType>([
        ['TMPL_I_MATCHER_ID', matcher_id],
        ['TMPL_A_SERVER_KEY', server]
    ]))
}

export async function signCancel(data: CancelData, proxy_address: Address, server_address: Address,
                                 tealSignCallback: TealSignCallback): Promise<SignedCancel> {
    const encodedData = encodeCancelData(data)
    const signature = encodeBase64(await tealSignCallback(encodedData, server_address, proxy_address))
    return { data, signature }
}

const cancelDataFormat: IPackedInfo = {
    have_id: { type: 'number' },
    have_amount: { type: 'uint' },
    order_proxy: { type: 'address' },
    user: { type: 'address' },
}

export function encodeCancelData(data: CancelData, includeType?: boolean): Uint8Array {
    return packData(data, cancelDataFormat, includeType)
}

export function decodeCancelData(data: Uint8Array, includeType?: boolean): CancelData {
    return unpackData(data, includeType ? undefined : cancelDataFormat) as CancelData
}

const signedCancelFormat: IPackedInfo = {
    data: { type: 'object', info: cancelDataFormat },
    signature: { type: 'base64', size: TEAL_SIGNATURE_LENGTH },
}

export function encodeSignedCancel(data: SignedCancel, includeType?: boolean): Uint8Array {
    return packData(data, signedCancelFormat, includeType)
}

export function decodeSignedCancel(data: Uint8Array, includeType?: boolean): SignedCancel {
    return unpackData(data, includeType ? undefined : signedCancelFormat) as SignedCancel
}

const cancelledOrderFormat: IPackedInfo = {
    order: { type: 'hash', info: serverOrderFormat },
    cancelOn: { type: 'number' },
    cancelTicket: { type: 'object', info: signedCancelFormat },
    proxyAddress: { type: 'address' },
}

export function encodeCancelledOrder(data: CancelledOrder, includeType?: boolean): Uint8Array {
    return packData(data, cancelledOrderFormat, includeType)
}

export async function decodeCancelledOrder(data: Uint8Array, tree: MerkleTree<ServerOrder>, includeType?: boolean): Promise<CancelledOrder> {
    const cancelledOrder = unpackData(data, includeType ? undefined : cancelledOrderFormat)
    const order = await tree.getByHash(cancelledOrder.order)
    if (!order)
        throw new Error(`Couldn't find serverOrder ID ${cancelledOrder.order}`)
    cancelledOrder.order = order[0]
    return cancelledOrder as CancelledOrder
}
