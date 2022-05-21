import { Address, AssetId, UnixTimestamp, OrderData, SignedOrder, ServerOrder } from "./types";
import { IPackedInfo } from './Encoding';
import { LogicSigAccount } from "algosdk";
import { Deployer } from './Deployer';
export declare type TealSignCallback = (data: Uint8Array, from: Address, to: Address) => Promise<Uint8Array>;
export declare function makeOrderData(user: Address, have_id: number, want_id: number, have_amount: bigint, want_amount: bigint, expiresOn: number, createdOn: number): OrderData;
export declare function signOrder(data: OrderData, proxy_address: Address, tealSignCallback: TealSignCallback): Promise<SignedOrder>;
export declare function compileOrderProxy(deployer: Deployer, user: Address, matcher_id: AssetId, createdOn: UnixTimestamp): Promise<LogicSigAccount>;
export declare const ORDER_BYTECODE_CHUNKS: string[];
export declare function makeOrderProxy(user: Address, matcherId: AssetId, createdOn: UnixTimestamp): LogicSigAccount;
export declare const orderDataFormat: IPackedInfo;
export declare function encodeOrderData(data: OrderData, includeType?: boolean): Uint8Array;
export declare function decodeOrderData(data: Uint8Array, includeType?: boolean): OrderData;
export declare const signedOrderFormat: IPackedInfo;
export declare function encodeSignedOrder(data: SignedOrder, includeType?: boolean): Uint8Array;
export declare function decodeSignedOrder(data: Uint8Array, includeType?: boolean): SignedOrder;
export declare const serverOrderFormat: IPackedInfo;
export declare function encodeServerOrder(data: ServerOrder, includeType?: boolean): Uint8Array;
export declare function decodeServerOrder(data: Uint8Array, includeType?: boolean): ServerOrder;