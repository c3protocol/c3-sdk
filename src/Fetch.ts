import { stringifyJSON, parseJSON } from "./Json"
import { Address, AssetId, SignedOrder, PairInfo, CancelTicket, OpenOrder, CancelledOrder, Match, OnChainBalance, UsersHealth, BLLookUp, UserProxyRequest, OrderGroup, ConnectInfo, PreparedDepositRequest, Asset } from "./types"
import fetch from "node-fetch"

export class Fetch {

    constructor(private serverURL: string) {}

    async postObject(object: any, path: string): Promise<any> {
        const response = await fetch(this.serverURL + path, {
            method: 'POST',
            body: stringifyJSON(object),
            headers: {'Content-Type': 'application/json'}
        })
        if (response.status !== 200)
            throw await response.text()
        return parseJSON(await response.text())
    }

    async getObject(path: string): Promise<any> {
        const response = await fetch(this.serverURL + path, {
            method: 'GET'
        })
        if (response.status !== 200)
            throw await response.text()
        return parseJSON(await response.text())
    }

    async postOrder(order: SignedOrder): Promise<SignedOrder> {
        return this.postObject(order, 'orders')
    }

    async postCancel(order: SignedOrder): Promise<CancelTicket> {
        return this.postObject(order, 'cancels')
    }

    async postDeposit(req: PreparedDepositRequest): Promise<string> {
        return this.postObject(req, 'proxy/deposit')
    }

    async postUserProxyRequest(req: UserProxyRequest): Promise<string> {
        return this.postObject(req, `proxy/perform`)
    }

    async getProxyOptedIn(proxy: Address): Promise<boolean> {
        return this.getObject(`proxy/opted-in/${proxy}`)
    }

    async getConnectInfo(): Promise<ConnectInfo> {
        return this.getObject('connectInfo')
    }

    async getAssets(): Promise<Asset[]> {
        return this.getObject('assets')
    }

    async getPairs(): Promise<PairInfo[]> {
        return this.getObject('pairs')
    }

    async getUserHealth(user: Address): Promise<UsersHealth> {
        return this.getObject(`dynamic-health/${user}`)
    }

    async getUserOrders(user: Address): Promise<OpenOrder[]> {
        return this.getObject(`orders/${user}`)
    }

    async getGroupedOrders(tokenA: AssetId, tokenB: AssetId, count: number): Promise<OrderGroup> {
        return this.getObject(`orders/${tokenA}/${tokenB}/${count}`);
    }

    async getUserCancelledOrders(user: Address): Promise<CancelledOrder[]> {
        return this.getObject(`cancels/${user}`)
    }

    async getLatestMatches(count: number): Promise<Match[]> {
        return this.getObject(`matches?pageSize=${count}`)
    }

    async getUserMatches(user: Address): Promise<Match[]> {
        return this.getObject(`matches/${user}`)
    }

    async getOnChainOrder(proxy: Address): Promise<any> {
        return this.getObject(`matcher/local/${proxy}`)
    }

    async getOnChainBalance(user: Address): Promise<OnChainBalance> {
        return this.getObject(`ce/local/${user}`)
    }

    async lookupLendingPool(user: Address, assetId: AssetId): Promise<BLLookUp> {
        return this.getObject(`bl/local/${user}/${assetId}`)
    }
}
