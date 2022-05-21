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
Object.defineProperty(exports, "__esModule", { value: true });
const C3RequestTypes_1 = require("./C3RequestTypes");
const C3Sdk_1 = require("./C3Sdk");
const Signer_1 = require("./Signer");
// To execute this file:
//   npm exec ts-node --script-mode src/_example.ts
(() => __awaiter(void 0, void 0, void 0, function* () {
    const signer = new Signer_1.Signer();
    const wallet = signer.addFromMnemonic("expand multiply humble vault pulp priority size project dish bamboo hard eternal duty beyond undo below trigger paddle minimum soap quality oval laptop ability toddler");
    const sdk = yield (0, C3Sdk_1.connectC3)("https://beta-api.c3.io/", "https://node.testnet.algoexplorerapi.io", 443, "", signer.callback, signer.tealCallback);
    const assets = yield sdk.getAssets();
    console.log("C3 Assets:", assets);
    const deposit = {
        op: C3RequestTypes_1.C3RequestOp.CE_Deposit,
        assetId: 0,
        amount: BigInt(1000)
    };
    const userProxy = yield sdk.createUserProxy(wallet);
    console.log("User Proxy: ", userProxy.address());
    const result = yield sdk.performC3Op(deposit, userProxy);
    console.log("Result", result);
}))()
    .then(() => console.log("DONE!"))
    .catch(err => console.log("ERROR!!!", err));
//# sourceMappingURL=_example.js.map