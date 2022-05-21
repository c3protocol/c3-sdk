import { OnApplicationComplete, Transaction } from "algosdk";
import { AlgorandType } from "./Encoding";
import { Address, Amount, AppId, AssetId } from "./types";
export declare enum C3RequestOp {
    CE_Deposit = "deposit",
    CE_Withdraw = "withdraw",
    CE_Lend = "lend",
    CE_Redeem = "redeem",
    CE_Borrow = "borrow",
    CE_Repay = "repay",
    CE_Liquidate = "liquidate",
    ADE_Register = "register",
    ADE_Revoke = "revoke"
}
declare type CESingleAssetRequest = {
    assetId: AssetId;
    amount: Amount;
};
declare type CEDelegationSupportedRequest = {
    primaryAccount?: Address;
};
export declare type CEDepositRequest = {
    op: C3RequestOp.CE_Deposit;
    performOptIn?: boolean;
    wormholeVAA?: Uint8Array;
} & CESingleAssetRequest;
export declare type CEWithdrawRequest = {
    op: C3RequestOp.CE_Withdraw;
} & CESingleAssetRequest;
export declare type CELendRequest = {
    op: C3RequestOp.CE_Lend;
} & CESingleAssetRequest & CEDelegationSupportedRequest;
export declare type CERedeemRequest = {
    op: C3RequestOp.CE_Redeem;
} & CESingleAssetRequest & CEDelegationSupportedRequest;
export declare type CEBorrowRequest = {
    op: C3RequestOp.CE_Borrow;
} & CESingleAssetRequest & CEDelegationSupportedRequest;
export declare type CERepayRequest = {
    op: C3RequestOp.CE_Repay;
} & CESingleAssetRequest & CEDelegationSupportedRequest;
export declare type CELiquidateRequest = {
    op: C3RequestOp.CE_Liquidate;
    user: Address;
    liabilities: Map<AssetId, Amount>;
    collaterals: Map<AssetId, Amount>;
};
export declare type CERequest = (CEWithdrawRequest | CELendRequest | CERedeemRequest | CEBorrowRequest | CERepayRequest | CELiquidateRequest);
export declare type DelegationRequest = {
    op: C3RequestOp.ADE_Register | C3RequestOp.ADE_Revoke;
    adeAppId: AppId;
    primaryAccount: Address;
    delegateAccount: Address;
    delegationAttributes?: DelegationAttributes;
};
export declare type DelegationAttributes = {
    version: number;
    permission_bit_mask: number;
    expiration: bigint;
};
export declare type C3Request = CEDepositRequest | CERequest | DelegationRequest;
export declare type PreparedDepositRequest = CESingleAssetRequest & {
    op: C3RequestOp.CE_Deposit;
    from: Address;
    data: Transaction[];
    signed: string;
};
export declare type UserProxyRequest = {
    from: Address;
    isDelegated: boolean;
    proxyAddress: Address;
    appId: AppId;
    appOnComplete: OnApplicationComplete;
    args: AlgorandType[];
    accounts: string[];
    foreignApps: number[];
    foreignAssets: number[];
    fee: number;
    lease: Uint8Array;
    rekeyTo: Address;
    firstValid: number;
    lastValid: number;
    txNote: string;
};
export declare type SignedUserProxyRequest = UserProxyRequest & {
    signature: Uint8Array;
};
export {};
