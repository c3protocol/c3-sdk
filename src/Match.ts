import { IPackedInfo, packData, unpackData } from "./Encoding"
import { Match, ServerOrder } from "./types"
import { serverOrderFormat } from "./Order"
import { MerkleTree } from "./MerkleTree"

const matchFormat: IPackedInfo = {
    buyOrder: { type: 'hash', info: serverOrderFormat },
    sellOrder: { type: 'hash', info: serverOrderFormat },
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
}

export function encodeMatch(data: Match, includeType?: boolean): Uint8Array {
    return packData(data, matchFormat, includeType)
}

export async function decodeMatch(data: Uint8Array, tree: MerkleTree<ServerOrder>, includeType?: boolean): Promise<Match> {
    const match = unpackData(data, includeType ? undefined : matchFormat)
    const buyOrder = await tree.getByHash(match.buyOrder)
    const sellOrder = await tree.getByHash(match.sellOrder)
    if (!buyOrder)
        throw new Error("Couldn't find buy order in the tree")
    if (!sellOrder)
        throw new Error("Couldn't find sell order in the tree")
    match.buyOrder = buyOrder[0]
    match.sellOrder = sellOrder[0]
    return match as Match
}
