import { OnApplicationComplete, Transaction } from "algosdk"
import { AlgorandType } from "./Encoding"
import { Address, Amount, AppId, AssetId } from "./types"

// !!!!
// Input types to prepareC3Op
// !!!!

// TODO: Relate these with the delegation system
export enum C3RequestOp {
    CE_Deposit = 'deposit',
    CE_Withdraw = 'withdraw',
    CE_Lend = 'lend',
    CE_Redeem = 'redeem',
    CE_Borrow = 'borrow',
    CE_Repay = 'repay',
    CE_Liquidate = 'liquidate',
    ADE_Register = 'register',
    ADE_Revoke = 'revoke',
}

type CESingleAssetRequest = {
    assetId: AssetId
    amount: Amount
}

type CEDelegationSupportedRequest = {
    primaryAccount?: Address
}

export type CEDepositRequest = { op: C3RequestOp.CE_Deposit, performOptIn?: boolean } & CESingleAssetRequest
export type CEWithdrawRequest = { op: C3RequestOp.CE_Withdraw } & CESingleAssetRequest
export type CELendRequest = { op: C3RequestOp.CE_Lend } & CESingleAssetRequest & CEDelegationSupportedRequest
export type CERedeemRequest = { op: C3RequestOp.CE_Redeem } & CESingleAssetRequest & CEDelegationSupportedRequest
export type CEBorrowRequest = { op: C3RequestOp.CE_Borrow } & CESingleAssetRequest & CEDelegationSupportedRequest
export type CERepayRequest = { op: C3RequestOp.CE_Repay } & CESingleAssetRequest & CEDelegationSupportedRequest

export type CELiquidateRequest = {
    op: C3RequestOp.CE_Liquidate
    user: Address
    liabilities: Map<AssetId, Amount>
    collaterals: Map<AssetId, Amount>
}

export type CERequest = (
    CEWithdrawRequest |
    CELendRequest |
    CERedeemRequest |
    CEBorrowRequest |
    CERepayRequest |
    CELiquidateRequest
)


export type DelegationRequest = {
    op: C3RequestOp.ADE_Register | C3RequestOp.ADE_Revoke,
    adeAppId: AppId,
    primaryAccount: Address,
    delegateAccount: Address,
    delegationAttributes?: DelegationAttributes
}

export type DelegationAttributes = {
    version: number,
    permission_bit_mask: number,
    expiration: bigint
}

export type C3Request = CEDepositRequest | CERequest | DelegationRequest

// !!!!
// Prepared types, to be sent to the endpoints
// !!!!

export type PreparedDepositRequest = CESingleAssetRequest & {
    op: C3RequestOp.CE_Deposit
    from: Address,
    data: Transaction,
    signed: string
}

export type UserProxyRequest = {
    from: Address,
		// FIXME: This is a higher-order property that should be in a higher-order structure
    isDelegated: boolean, // Not all operations may support delegation, so this field may be ignored.
    proxyAddress: Address,
    appId: AppId,
    appOnComplete: OnApplicationComplete,
    args: AlgorandType[],
    accounts: string[],
    foreignApps: number[],
    foreignAssets: number[],
    fee: number,
    lease: Uint8Array,
    rekeyTo: Address,
    firstValid: number,
    lastValid: number,
    txNote: string,
}

export type SignedUserProxyRequest = UserProxyRequest & {
    signature: Uint8Array,
}
