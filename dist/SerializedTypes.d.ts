import { AssetId, Amount, UnixTimestamp, Signature, Price, Address } from "./types";
export declare type OrderData = {
    user: Address;
    have_id: AssetId;
    want_id: AssetId;
    have_amount: Amount;
    want_amount: Amount;
    expiresOn: UnixTimestamp;
    createdOn: UnixTimestamp;
};
export declare type SignedOrder = {
    data: OrderData;
    signature: Signature;
};
export declare type ServerOrder = {
    userOrder: SignedOrder;
    isBuy: boolean;
    baseId: AssetId;
    quoteId: AssetId;
    price: Price;
    amount: Amount;
    makerFees: Price;
    takerFees: Price;
    isMarket: boolean;
    addedOn: UnixTimestamp;
    proxyAddress: Address;
};
export declare type CancelData = {
    user: Address;
    have_id: AssetId;
    have_amount: Amount;
    order_proxy: Address;
};
export declare type SignedCancel = {
    data: CancelData;
    signature: Signature;
};
export declare type CancelledOrder = {
    order: ServerOrder;
    cancelOn: UnixTimestamp;
    cancelTicket: SignedCancel;
    proxyAddress: Address;
};
export declare type Match = {
    buyOrder: ServerOrder;
    sellOrder: ServerOrder;
    matchOn: UnixTimestamp;
    matchBuyAmount: Amount;
    matchSellAmount: Amount;
    matchBuyFees: Amount;
    matchSellFees: Amount;
    matchPrice: Price;
    buyOrderFirstMatch: boolean;
    buyOrderCompleted: boolean;
    sellOrderFirstMatch: boolean;
    sellOrderCompleted: boolean;
};
