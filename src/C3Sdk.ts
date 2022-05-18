import { Algodv2, LogicSigAccount } from 'algosdk'
import { Deployer, SignCallback } from "./Deployer"
import { Address, Amount, AssetId, UnixTimestamp, OrderType, OrderData, SignedOrder, OpenOrder, CancelTicket, PairInfo, CancelledOrder, Match, OnChainBalance, UsersHealth, BLLookUp, OrderGroup, ConnectInfo, C3Request, DelegationRequest, Asset } from "./types"
import { TealSignCallback, signOrder, makeOrderProxy } from "./Order"
import { Fetch } from "./Fetch"
import { UserProxy } from './UserProxy'
import { C3RequestOp } from './C3RequestTypes'

export * from "./types"
export * from "./Encoding"
export * from "./Order"
export * from "./Cancel"
export * from "./Match"
export * from "./MerkleTree"
export * from "./Json"
export * from "./UserProxy"
export { Deployer, SignCallback, IStateInfo } from "./Deployer"
export { Signer } from "./Signer"

export async function connectC3(
    serverURL: string,
    nodeURL: string,
    nodePort: number | string,
    nodeToken: string,
    signCallback: SignCallback,
    tealSignCallback: TealSignCallback,
): Promise<C3Sdk> {
    const algoSdk = new Algodv2(nodeToken, nodeURL, nodePort)
    const deployer = new Deployer(algoSdk)
    const fetch = new Fetch(serverURL)
    const init = await fetch.getConnectInfo()
    return new C3Sdk(deployer, fetch, init, signCallback, tealSignCallback)
}

export class C3Sdk {
    constructor(
        readonly deployer: Deployer,
        private fetch: Fetch,
        private init: ConnectInfo,
        private signCallback: SignCallback,
        private tealSignCallback: TealSignCallback,
    ) {}

    private isOptedInValues: Map<Address, boolean> = new Map()

    async createUserProxy(user: Address): Promise<UserProxy> {
        return UserProxy.makeUserProxy(this.deployer, this.init.serverAddr, user, this.init.contracts, this.signCallback, this.tealSignCallback)
    }

    async performC3Op(req: C3Request, userProxy: UserProxy): Promise<string> {
        switch (req.op) {
            case C3RequestOp.CE_Deposit: {
                const isOptedIn = await this.isOptedIn(userProxy.address())
                req.performOptIn = !isOptedIn
                const prepared = await userProxy.prepareDeposit(req)
                return this.fetch.postDeposit(prepared)
            }

            case C3RequestOp.CE_Borrow:
            case C3RequestOp.CE_Lend:
            case C3RequestOp.CE_Liquidate:
            case C3RequestOp.CE_Redeem:
            case C3RequestOp.CE_Repay:
            case C3RequestOp.CE_Withdraw: {
                const prepared = await userProxy.prepareCEOp(req)
                return this.fetch.postUserProxyRequest(prepared)
            }

            case C3RequestOp.ADE_Register:
            case C3RequestOp.ADE_Revoke: {
                // NOTE: This list must be kept in sync with the set of cases from Delegation request
                // FIXME: Really come up with a generi
                const prepared = await userProxy.prepareDelegationOp(req as DelegationRequest)
                return this.fetch.postUserProxyRequest(prepared)
            }
        }
    }

    createOrder(user: Address, type: OrderType, baseId: AssetId, quoteId: AssetId,
                price: number, amount: Amount, expiresOn: UnixTimestamp, createdOn: UnixTimestamp): OrderData {
        const baseAmnt = amount
        const quoteAmnt = BigInt(Math.floor(price * Number(amount)))
        const [have_id, want_id, have_amount, want_amount] = type === "buy" ?
            [quoteId, baseId, quoteAmnt, baseAmnt] : [baseId, quoteId, baseAmnt, quoteAmnt]
        return {user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn}
    }

    createMarketOrder(user: Address, type: OrderType, baseId: AssetId, quoteId: AssetId,
                      amount: Amount, expiresOn: UnixTimestamp, createdOn: UnixTimestamp): OrderData {
        const [have_id, want_id, have_amount, want_amount] = type === "buy" ?
            [quoteId, baseId, amount, BigInt(0)] : [baseId, quoteId, amount, BigInt(0)]
        return {user, have_id, want_id, have_amount, want_amount, expiresOn, createdOn}
    }

    async signOrder(order: OrderData): Promise<SignedOrder> {
        const proxy = await this.makeOrderProxy(order.user, order.createdOn)
        return signOrder(order, proxy.address(), this.tealSignCallback)
    }

    async makeOrderProxy(user: Address, timestamp: UnixTimestamp): Promise<LogicSigAccount> {
        return makeOrderProxy(user, this.init.contracts.optinDecorator, timestamp)
    }

    async submitOrder(order: SignedOrder): Promise<SignedOrder> {
        return this.fetch.postOrder(order)
    }

    async cancelOrder(order: SignedOrder): Promise<CancelTicket> {
        return this.fetch.postCancel(order)
    }

    async getAssets(): Promise<Asset[]> {
        return this.fetch.getAssets()
    }

    async getPairs(): Promise<PairInfo[]> {
        return this.fetch.getPairs()
    }

    async isOptedIn(userProxy: Address): Promise<boolean> {
        let isOptedInValue = this.isOptedInValues.get(userProxy)
        if (isOptedInValue===undefined || !isOptedInValue) {
            isOptedInValue = await this.fetch.getProxyOptedIn(userProxy)
            this.isOptedInValues.set(userProxy, isOptedInValue)
        }
        return isOptedInValue
    }

    async getUserOrders(user: Address): Promise<OpenOrder[]> {
        return this.fetch.getUserOrders(user)
    }

    async getGroupedOrders(tokenA: AssetId, tokenB: AssetId, count: number): Promise<OrderGroup> {
        return this.fetch.getGroupedOrders(tokenA, tokenB, count);
    }

    async getUserCancelledOrders(user: Address): Promise<CancelledOrder[]> {
        return this.fetch.getUserCancelledOrders(user)
    }

    async getLatestMatches(count: number): Promise<Match[]> {
        return this.fetch.getLatestMatches(count)
    }

    async getUserMatches(user: Address): Promise<Match[]> {
        return this.fetch.getUserMatches(user)
    }

    async getOnChainOrder(proxy: Address): Promise<any> {
        return this.fetch.getOnChainOrder(proxy)
    }

    async getOnChainBalance(user: Address): Promise<OnChainBalance> {
        return this.fetch.getOnChainBalance(user)
    }

    async lookupLendingPool(user: Address, assetId: AssetId): Promise<BLLookUp> {
        return this.fetch.lookupLendingPool(user, assetId)
    }

    async getUserHealth(user: Address): Promise<UsersHealth> {
        return this.fetch.getUserHealth(user)
    }
}
