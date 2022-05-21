export declare const DEVELOPMENT_KMD_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export declare const DEVELOPMENT_KMD_HOST = "localhost";
export declare const DEVELOPMENT_KMD_PORT = 4002;
export declare type AlgorandServerConnectionConfig = {
    token: string;
    server: string;
    port: number | string;
};
export declare type ExecutionEnvironmentConfig = {
    algod: AlgorandServerConnectionConfig;
    kmd?: AlgorandServerConnectionConfig;
};
export declare type AccountSigningData = {
    mnemonic: string;
} | {
    secretKey: Uint8Array;
};
export declare type TestExecutionEnvironmentConfig = ExecutionEnvironmentConfig & {
    masterAccount: AccountSigningData;
};
export declare const BETANET_CONFIG: TestExecutionEnvironmentConfig;
/**
 * Path: Direct path to sandbox executable, in this example
 * since I use Windows OS i had to add sh command in front of full path
 * In my case I downloaded sandbox in disk D:\
 */
export declare const LOCAL_CONFIG: TestExecutionEnvironmentConfig;
export declare const WORMHOLE_ALGORAND_BRIDGE_ID_MAINNET: bigint;
export declare const WORMHOLE_ALGORAND_BRIDGE_ID_TESTNET: bigint;
export declare const WORMHOLE_ALGORAND_BRIDGE_ID_DEVNET: bigint;
export declare const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_MAINNET: bigint;
export declare const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_TESTNET: bigint;
export declare const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_DEVNET: bigint;
