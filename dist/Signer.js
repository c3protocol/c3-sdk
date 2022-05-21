"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signer = void 0;
const algosdk_1 = __importDefault(require("algosdk"));
class Signer {
    constructor() {
        this.signatures = new Map();
        this.callback = this.sign.bind(this);
        this.tealCallback = this.tealSign.bind(this);
    }
    getPrivateKey(addr) {
        const pk = this.signatures.get(addr);
        if (pk === undefined)
            throw new Error("Couldn't find account " + addr + " for signing");
        return pk;
    }
    addFromMnemonic(mnemonic) {
        const account = algosdk_1.default.mnemonicToSecretKey(mnemonic);
        this.signatures.set(account.addr, account.sk);
        return account.addr;
    }
    addFromSecretKey(secretKey) {
        const mnemonic = algosdk_1.default.secretKeyToMnemonic(secretKey);
        return this.addFromMnemonic(mnemonic);
    }
    createAccount() {
        const { sk: secretKey, addr: address } = algosdk_1.default.generateAccount();
        this.signatures.set(address, secretKey);
        return address;
    }
    sign(txs) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(txs.map((tx) => __awaiter(this, void 0, void 0, function* () {
                const sender = algosdk_1.default.encodeAddress(tx.from.publicKey);
                return tx.signTxn(this.getPrivateKey(sender));
            })));
        });
    }
    rawSign(txs) {
        return txs.map(tx => {
            const sender = algosdk_1.default.encodeAddress(tx.from.publicKey);
            return tx.rawSignTxn(this.getPrivateKey(sender));
        });
    }
    tealSign(data, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            return algosdk_1.default.tealSign(this.getPrivateKey(from), data, to);
        });
    }
}
exports.Signer = Signer;
//# sourceMappingURL=Signer.js.map