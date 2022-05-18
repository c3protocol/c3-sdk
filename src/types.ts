import { ServerOrder, SignedCancel } from "./SerializedTypes"

export * from "./C3RequestTypes"
export * from "./SerializedTypes"

export type Address = string
export type Signature = string
export type AssetId = number
export type AppId = number
export type UnixTimestamp = number
export type TransactionId = string
export type Amount = bigint
export type Price = bigint
export type OrderType = 'buy' | 'sell'

export type Asset = {
    "asset-id": AssetId,
    "asset-name": string,
    "asset-balance": number
}

export type Pair = {
    baseId: AssetId,
    quoteId: AssetId,
    lastPrice: Price,
    priceQuantumExp: number,
    amountQuantumExp: number,
    minTrade: Amount,
    maxTrade: Amount
}

export type PairId = number
export type PairInfo = Pair & {
    pairId: PairId
}

export type UsersHealth = {
    positiveHealth: bigint,
    negativeHealth: bigint
}

export type OrderAmount = {
    have: Amount,
    want: Amount
}

export type OpenOrder = {
    order: ServerOrder
    remainingAmount: OrderAmount
}

export type OrderGroupEntry = {
    price: Price,
    volume: Amount,
}

export type OrderGroup = {
    buys: OrderGroupEntry[],
    sells: OrderGroupEntry[],
}

export type CancelTicket = SignedCancel & {
    server: Address
}

export type ContractIds = {
    feeProxy: AppId,
    rateOracle: AppId,
    lendingPool: AppId,
    vaaProcessor: AppId,
    priceKeeper: AppId,
    priceMapper: AppId,
    ceOnchain: AppId,
    matcher: AppId,
    optinDecorator: AppId,
    ade: AppId
}

export type ConnectInfo = {
    contracts: ContractIds,
    serverAddr: Address,
}

export type HealthRequest = {
    user: Address,
    initial: boolean
}

export type OnChainBalance = {
    collateral: Map<AssetId, Amount>,
    liability: Map<AssetId, Amount>
}

export type BLLookUp = {
    deposit: Amount
    borrow: Amount
    fee: Amount
}

export type LiquidationRequest = {
    liquidator: Address,
    user: Address,
    liabilities: Map<AssetId, Amount>,
    collaterals: Map<AssetId, Amount>
}

// @FIXME: MVP mock
export type MockLiquidationRequest = {
    liquidator: Address,
    user: Address
}
