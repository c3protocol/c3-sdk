import { C3Sdk, connectC3 } from "./C3Sdk"
import { Signer } from "./Signer"

// To execute this file:
//   npm exec ts-node --script-mode src/_example.ts

(async () => {
    const signer: Signer = new Signer()
    const sdk: C3Sdk = await connectC3(
        "https://beta-api.c3.io/",
        "https://node.testnet.algoexplorerapi.io", 80, "",
        signer.callback,
        signer.tealCallback)
    const assets = await sdk.getAssets()
    console.log("C3 Assets:", assets)
})()
.then(() => console.log("DONE!"))
.catch(err => console.log("ERROR!!!", err))
