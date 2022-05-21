export const DEVELOPMENT_KMD_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
export const DEVELOPMENT_KMD_HOST  = "localhost"
export const DEVELOPMENT_KMD_PORT  = 4002

export type AlgorandServerConnectionConfig = {
    token: string,
    server: string,
    port: number | string
}

export type ExecutionEnvironmentConfig = {
    algod: AlgorandServerConnectionConfig,
    kmd?: AlgorandServerConnectionConfig
}

export type AccountSigningData = {
    mnemonic: string
} | {
    secretKey: Uint8Array
}

export type TestExecutionEnvironmentConfig = ExecutionEnvironmentConfig & {
    masterAccount: AccountSigningData
}

export const BETANET_CONFIG: TestExecutionEnvironmentConfig = {
    algod: {token: "", server: "https://node.betanet.algoexplorerapi.io", port: ""},
    masterAccount: {
        mnemonic: "rate firm prefer portion innocent public large original fit shoulder solve scorpion battle end jealous off pause inner toddler year grab chaos result about capital"
    }
}
/**
 * Path: Direct path to sandbox executable, in this example
 * since I use Windows OS i had to add sh command in front of full path
 * In my case I downloaded sandbox in disk D:\
 */
export const LOCAL_CONFIG: TestExecutionEnvironmentConfig = {
    algod: {
        token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        server: "http://localhost",
        port: 4001
    },
    masterAccount: {
        mnemonic: "kitchen laugh type script swamp sweet shell century shock gospel usual assist again merge pretty exact fork repair program catalog observe gentle arrest ability office"
    }
}

export const WORMHOLE_ALGORAND_BRIDGE_ID_MAINNET = BigInt("0")
export const WORMHOLE_ALGORAND_BRIDGE_ID_TESTNET = BigInt("86525623")
export const WORMHOLE_ALGORAND_BRIDGE_ID_DEVNET  = BigInt("4")

export const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_MAINNET = BigInt("0")
export const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_TESTNET = BigInt("86525641")
export const WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_DEVNET  = BigInt("6")
