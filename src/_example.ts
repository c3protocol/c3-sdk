import { C3RequestOp, C3Sdk, CEDepositRequest, connectC3 } from "./C3Sdk"
import { Signer } from "./Signer"

// To execute this file:
//   npm exec ts-node --script-mode src/_example.ts

(async () => {
    const signer: Signer = new Signer()
    // const userMnemonic = "expand multiply humble vault pulp priority size project dish bamboo hard eternal duty beyond undo below trigger paddle minimum soap quality oval laptop ability toddler"
    const userMnemonic = "use visit potato calm foster walk virus series garlic pill symbol joy current scissors axis ankle sauce truly obey ignore sense install grit able stereo"
    const userWallet = signer.addFromMnemonic(userMnemonic)

    const sdk: C3Sdk = await connectC3(
        "https://beta-api.c3.io/",
        "http://51.210.214.25", 8002, "30F57B65916305B7761149D46E0E8D548A9123383E87A28341517F6C39CF20C7",
        // "https://node.testnet.algoexplorerapi.io", 443, "",
        signer.callback,
        signer.tealCallback)

    // const assets = await sdk.getAssets()
    // console.log("C3 Assets:", assets)

    const userProxy = await sdk.createUserProxy(userWallet)
    console.log("User Proxy Address: ", userProxy.address())

    const isOptedIn = await sdk.isOptedIn(userProxy.address())
    console.log("Is User Proxy Opted In: ", isOptedIn)

    const depositRequest: CEDepositRequest = {
        op: C3RequestOp.CE_Deposit,
        performOptIn: !isOptedIn,
        assetId: 0,
        amount: BigInt(100000)
    }

    try {
        const depositResult = await sdk.performC3Op(depositRequest, userProxy)
        console.log("Deposit Result: ", depositResult)
    } catch(error) {
        console.log("Error while depositing, please try again.", error)
    }
})()
.then(() => console.log("DONE!"))
.catch(err => console.log("ERROR!!!", err))


