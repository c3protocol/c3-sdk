import { ServerOrder, SignedCancel } from "./SerializedTypes";
export * from "./C3RequestTypes";
export * from "./SerializedTypes";
export declare type Address = string;
export declare type Signature = string;
export declare type AssetId = number;
export declare type AppId = number;
export declare type UnixTimestamp = number;
export declare type TransactionId = string;
export declare type Amount = bigint;
export declare type Price = bigint;
export declare type OrderType = 'buy' | 'sell';
export declare type Asset = {
    "asset-id": AssetId;
    "asset-name": string;
    "asset-balance": number;
};
export declare type Pair = {
    baseId: AssetId;
    quoteId: AssetId;
    lastPrice: Price;
    priceQuantumExp: number;
    amountQuantumExp: number;
    minTrade: Amount;
    maxTrade: Amount;
};
export declare type PairId = number;
export declare type PairInfo = Pair & {
    pairId: PairId;
};
export declare type UsersHealth = {
    positiveHealth: bigint;
    negativeHealth: bigint;
};
export declare type OrderAmount = {
    have: Amount;
    want: Amount;
};
export declare type OpenOrder = {
    order: ServerOrder;
    remainingAmount: OrderAmount;
};
export declare type OrderGroupEntry = {
    price: Price;
    volume: Amount;
};
export declare type OrderGroup = {
    buys: OrderGroupEntry[];
    sells: OrderGroupEntry[];
};
export declare type CancelTicket = SignedCancel & {
    server: Address;
};
export declare type ContractIds = {
    feeProxy: AppId;
    rateOracle: AppId;
    lendingPool: AppId;
    vaaProcessor: AppId;
    priceKeeper: AppId;
    priceMapper: AppId;
    ceOnchain: AppId;
    matcher: AppId;
    optinDecorator: AppId;
    ade: AppId;
};
export declare type ConnectInfo = {
    contracts: ContractIds;
    serverAddr: Address;
};
export declare type HealthRequest = {
    user: Address;
    initial: boolean;
};
export declare type OnChainBalance = {
    collateral: Map<AssetId, Amount>;
    liability: Map<AssetId, Amount>;
};
export declare type BLLookUp = {
    deposit: Amount;
    borrow: Amount;
    fee: Amount;
};
export declare type LiquidationRequest = {
    liquidator: Address;
    user: Address;
    liabilities: Map<AssetId, Amount>;
    collaterals: Map<AssetId, Amount>;
};
export declare type MockLiquidationRequest = {
    liquidator: Address;
    user: Address;
};
