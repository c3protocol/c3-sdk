"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_DEVNET = exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_TESTNET = exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_MAINNET = exports.WORMHOLE_ALGORAND_BRIDGE_ID_DEVNET = exports.WORMHOLE_ALGORAND_BRIDGE_ID_TESTNET = exports.WORMHOLE_ALGORAND_BRIDGE_ID_MAINNET = exports.LOCAL_CONFIG = exports.BETANET_CONFIG = exports.DEVELOPMENT_KMD_PORT = exports.DEVELOPMENT_KMD_HOST = exports.DEVELOPMENT_KMD_TOKEN = void 0;
exports.DEVELOPMENT_KMD_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
exports.DEVELOPMENT_KMD_HOST = "localhost";
exports.DEVELOPMENT_KMD_PORT = 4002;
exports.BETANET_CONFIG = {
    algod: { token: "", server: "https://node.betanet.algoexplorerapi.io", port: "" },
    masterAccount: {
        mnemonic: "rate firm prefer portion innocent public large original fit shoulder solve scorpion battle end jealous off pause inner toddler year grab chaos result about capital"
    }
};
/**
 * Path: Direct path to sandbox executable, in this example
 * since I use Windows OS i had to add sh command in front of full path
 * In my case I downloaded sandbox in disk D:\
 */
exports.LOCAL_CONFIG = {
    algod: {
        token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        server: "http://localhost",
        port: 4001
    },
    masterAccount: {
        mnemonic: "kitchen laugh type script swamp sweet shell century shock gospel usual assist again merge pretty exact fork repair program catalog observe gentle arrest ability office"
    }
};
exports.WORMHOLE_ALGORAND_BRIDGE_ID_MAINNET = BigInt("0");
exports.WORMHOLE_ALGORAND_BRIDGE_ID_TESTNET = BigInt("86525623");
exports.WORMHOLE_ALGORAND_BRIDGE_ID_DEVNET = BigInt("4");
exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_MAINNET = BigInt("0");
exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_TESTNET = BigInt("86525641");
exports.WORMHOLE_ALGORAND_TOKEN_BRIDGE_ID_DEVNET = BigInt("6");
//# sourceMappingURL=Environment.js.map