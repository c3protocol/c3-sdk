import { C3RequestOp, CEDepositRequest } from "./C3RequestTypes"
import { C3Sdk, connectC3 } from "./C3Sdk"
import { Signer } from "./Signer"

// To execute this file:
//   npm exec ts-node --script-mode src/_example.ts

(async () => {
    const signer: Signer = new Signer()
    const wallet = signer.addFromMnemonic("expand multiply humble vault pulp priority size project dish bamboo hard eternal duty beyond undo below trigger paddle minimum soap quality oval laptop ability toddler")

    const sdk: C3Sdk = await connectC3(
        "https://beta-api.c3.io/",
        "https://node.testnet.algoexplorerapi.io", 443, "",
        signer.callback,
        signer.tealCallback)

    const assets = await sdk.getAssets()
    console.log("C3 Assets:", assets)

    const deposit: CEDepositRequest = {
        op: C3RequestOp.CE_Deposit,
        assetId: 0,
        amount: BigInt(1000)
    }
    const userProxy = await sdk.createUserProxy(wallet)
    console.log("User Proxy: ", userProxy.address())
    const result = await sdk.performC3Op(deposit, userProxy)
    console.log("Result", result)

})()
.then(() => console.log("DONE!"))
.catch(err => console.log("ERROR!!!", err))
