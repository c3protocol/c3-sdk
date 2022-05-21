import sha512 from "js-sha512";
import { Address, AssetId, Amount, Price } from './types';
export declare const TEAL_SIGNATURE_LENGTH = 64;
export declare const SHA256_HASH_LENGTH = 32;
export declare const PRICE_LENGTH = 17;
export declare type AlgorandType = bigint | string | boolean | number | Uint8Array;
export declare type IPackedInfoFixed = {
    type: "uint" | "number" | "address" | "double" | "boolean" | "price";
};
export declare type IPackedInfoVariable = {
    type: "string" | "bytes" | "base64";
    size: number;
};
export declare type IPackedInfoObject = {
    type: "object" | "hash";
    info: IPackedInfo;
};
export declare type IPackedInfoAny = IPackedInfoFixed | IPackedInfoVariable | IPackedInfoObject;
export declare type IPackedInfo = Record<string, IPackedInfoAny>;
export declare type IStateType = 'uint' | 'bytes';
export declare type IStateMap = Record<string, IStateType>;
export declare type IStateVar = Uint8Array | bigint;
export declare type IState = Record<string, IStateVar>;
export declare const packedTypeMap: string[];
export declare function concatArrays(arrays: Uint8Array[]): Uint8Array;
export declare function packFormat(format: IPackedInfo): Uint8Array;
export declare function unpackFormat(data: Uint8Array): IPackedInfo;
export declare function packData(value: Record<string, any>, format: IPackedInfo, includeType?: boolean): Uint8Array;
export declare function unpackData(data: Uint8Array, formatOpt?: IPackedInfo): Record<string, any>;
export declare function decodeC3PyTealDictionary(keys: Uint8Array, values: Uint8Array): Map<AssetId, Amount>;
export declare function encodeC3PyTealDictionary(dictionary: Map<AssetId, Amount>): {
    keys: Uint8Array;
    values: Uint8Array;
};
export declare function encodeArgArray(params: AlgorandType[]): Uint8Array[];
export declare function encodeString(value: string | Uint8Array): Uint8Array;
export declare function decodeString(value: Uint8Array): string;
export declare function decodeState(state: Record<string, Record<string, string>>[], stateMap: IStateMap, errorOnMissing?: boolean): IState;
export declare function encodePrice(value: Price): Uint8Array;
export declare function decodePrice(value: Uint8Array): Price;
export declare function encodeUint64(value: number | bigint): Uint8Array;
export declare function decodeUint64(value: Uint8Array): bigint;
export declare function encodeUint32(value: number): Uint8Array;
export declare function decodeUint32(value: Uint8Array): number;
export declare function decodeBase16(value: string): Uint8Array;
export declare function encodeBase64(value: Uint8Array): string;
export declare function decodeBase64(value: string): Uint8Array;
export declare function sha256Hash(arr: sha512.Message): Uint8Array;
export declare function encodeApplicationAddress(id: number): Address;
export declare function compareArrays(a: Uint8Array[], b: Uint8Array[]): boolean;
export declare function getDeltaUint(response: any, key: string): bigint | undefined;
export declare function getDeltaBytes(response: any, key: string): Uint8Array | undefined;
export { encodeAddress } from 'algosdk';