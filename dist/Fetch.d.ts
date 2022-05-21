import { Address, AssetId, SignedOrder, PairInfo, CancelTicket, OpenOrder, CancelledOrder, Match, OnChainBalance, UsersHealth, BLLookUp, UserProxyRequest, OrderGroup, ConnectInfo, PreparedDepositRequest, Asset } from "./types";
export declare class Fetch {
    private serverURL;
    constructor(serverURL: string);
    postObject(object: any, path: string): Promise<any>;
    getObject(path: string): Promise<any>;
    postOrder(order: SignedOrder): Promise<SignedOrder>;
    postCancel(order: SignedOrder): Promise<CancelTicket>;
    postDeposit(req: PreparedDepositRequest): Promise<string>;
    postUserProxyRequest(req: UserProxyRequest): Promise<string>;
    getProxyOptedIn(proxy: Address): Promise<boolean>;
    getConnectInfo(): Promise<ConnectInfo>;
    getAssets(): Promise<Asset[]>;
    getPairs(): Promise<PairInfo[]>;
    getUserHealth(user: Address): Promise<UsersHealth>;
    getUserOrders(user: Address): Promise<OpenOrder[]>;
    getGroupedOrders(tokenA: AssetId, tokenB: AssetId, count: number): Promise<OrderGroup>;
    getUserCancelledOrders(user: Address): Promise<CancelledOrder[]>;
    getLatestMatches(count: number): Promise<Match[]>;
    getUserMatches(user: Address): Promise<Match[]>;
    getOnChainOrder(proxy: Address): Promise<any>;
    getOnChainBalance(user: Address): Promise<OnChainBalance>;
    lookupLendingPool(user: Address, assetId: AssetId): Promise<BLLookUp>;
}
