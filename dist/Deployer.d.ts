import { Algodv2, Transaction, OnApplicationComplete, SuggestedParams, LogicSigAccount } from 'algosdk';
import { AlgorandType, IState, IStateMap } from './Encoding';
import { AssetId, Amount, Address, TransactionId, AppId } from './types';
export declare enum FieldType {
    UINT = 1,
    STRING = 2,
    ADDRESS = 3,
    BOOL = 4,
    AMOUNT = 5,
    BYTES = 6
}
export declare type IStateInfo = {
    local: IStateMap;
    global: IStateMap;
};
export interface ICompiledApp {
    approval: Uint8Array;
    clear: Uint8Array;
    stateInfo: IStateInfo;
}
export interface ISourceApp {
    approval: string;
    clear: string;
    stateInfo: IStateInfo;
}
export interface IStatelessContract {
    code: string;
    address: string;
    parameters: IParameter[];
}
export interface IParameter {
    name: string;
    description: string;
    type: FieldType;
}
export declare type SignCallback = (txs: Transaction[]) => Promise<Uint8Array[]>;
export declare type PendingTransaction = {
    timestamp: number;
    transactions: Transaction[];
};
export declare type BlockedTransaction = {
    timestamp: number;
    transactions: Transaction[];
    blocking: TransactionId[];
    signCallback: SignCallback;
    stateless: Map<Address, LogicSigAccount>;
};
export declare class Deployer {
    readonly algodClient: Algodv2;
    readonly minFee: number;
    readonly minBalance: number;
    private blocked;
    private pending;
    private static tealCache;
    constructor(algodClient: Algodv2, minFee?: number, minBalance?: number);
    getMinFee(): number;
    getMinBalance(): number;
    private compileProgram;
    getParams(): Promise<SuggestedParams>;
    static isStatic(stateless: IStatelessContract): boolean;
    signAndSend(transactions: Transaction[], signCallback: SignCallback, stateless?: Map<Address, LogicSigAccount>, dryrunTest?: boolean): Promise<TransactionId>;
    blockingSet(transactions: Transaction[]): TransactionId[];
    transactionFailed(result: Record<string, any>): boolean;
    waitForTransactionResponse(txId: string): Promise<Record<string, any>>;
    dryrunRequest(transactions: Transaction[], signCallback: SignCallback, stateless?: Map<Address, LogicSigAccount>): Promise<any>;
    debugDryrunResult(result: any): void;
    makeApp(app: ISourceApp, templateValues?: Map<string, AlgorandType>): Promise<ICompiledApp>;
    makeSourceApp(pySourcePath: string, stateInfo: IStateInfo): Promise<ISourceApp>;
    deleteApplication(sender: Address, id: number, signCallback: SignCallback): Promise<string>;
    deleteAsset(sender: Address, id: number, signCallback: SignCallback): Promise<string>;
    clearApplication(sender: Address, id: number, signCallback: SignCallback): Promise<string>;
    closeApplication(sender: Address, id: number, signCallback: SignCallback): Promise<any>;
    deployApplication(sender: Address, app: ICompiledApp, signCallback: SignCallback, extraCompBudgetTxns?: Transaction[], args?: AlgorandType[], appAccounts?: Address[], appApps?: number[], extraPages?: number, fee?: number, debug?: boolean): Promise<string>;
    deploySourceApplication(from: Address, sourceApp: ISourceApp, signCallback: any): Promise<string>;
    updateApplication(sender: Address, id: number, app: ICompiledApp, signCallback: SignCallback, args?: AlgorandType[], appAccounts?: Address[]): Promise<string>;
    makeCallTransaction(from: Address, id: number, appOnComplete?: OnApplicationComplete, args?: AlgorandType[], accounts?: string[], foreignApps?: number[], foreignAssets?: number[], txNote?: string, fee?: number, reKeyTo?: Address): Promise<Transaction>;
    makePayTransaction(from: Address, to: Address, amount: number | bigint, fee?: number, txNote?: string | Uint8Array): Promise<Transaction>;
    makeAssetTransferTransaction(from: Address, to: Address, assetIndex: number, amount: number | bigint, fee?: number, txNote?: string): Promise<Transaction>;
    makeAssetCreationTransaction(from: Address, assetTotal: number | bigint, assetDecimals: number, assetUnitName: string, assetName: string, assetURL: string, fee?: number, txNote?: string): Promise<Transaction>;
    makeAssetOptInTransaction(from: Address, assetId: number, fee?: number, txNote?: string): Promise<Transaction>;
    callApplication(sender: Address, id: number, appOnComplete: OnApplicationComplete, args: AlgorandType[], accounts: string[], foreignApps: number[], foreignAssets: number[], txNote: string, signCallback: SignCallback, fee?: number): Promise<string>;
    callGroupTransaction(txns: Transaction[], mappedStateless: Map<Address, LogicSigAccount>, signCallback: SignCallback, dryrunTest?: boolean): Promise<string>;
    dryrunGroupTransaction(txns: Transaction[], mappedStateless: Map<Address, LogicSigAccount>, signCallback: SignCallback): Promise<any>;
    static parseCode(code: string, templateValues?: Map<string, AlgorandType>): [string, IParameter[]];
    compileStateless(pyPath: string, templateValues?: Map<string, AlgorandType>, overrideArgs?: string[]): Promise<LogicSigAccount>;
    readAsset(asset: AssetId): Promise<any>;
    private assetNames;
    getAssetName(assetId: AssetId): Promise<string | undefined>;
    readAccount(from: Address): Promise<any>;
    readCreatedApps(from: Address): Promise<Record<string, string>>;
    readCreatedAssets(from: Address): Promise<Record<string, string>>;
    readOptedInApps(from: Address): Promise<Record<string, any>[]>;
    readOptedInAssets(from: Address): Promise<Record<string, string>[]>;
    readAmount(from: Address): Promise<Amount>;
    readAssetBalances(from: Address): Promise<Map<AssetId, Amount>>;
    readAssetAmount(from: Address, id: AssetId): Promise<Amount>;
    getAllAppGlobalState(id: AppId): Promise<{
        key: string;
        value: {
            bytes: string;
            type: number;
            uint: number;
        };
    }[] | undefined>;
    getAppStateInfo(id: AppId): Promise<IStateInfo>;
    readAppGlobalState(id: AppId, stateInfo: IStateInfo, errorOnMissing?: boolean): Promise<IState>;
    readAppLocalState(id: AppId, from: Address, stateInfo: IStateInfo): Promise<IState>;
    deleteApps(address: Address, signCallback: SignCallback): Promise<void>;
    clearApps(address: Address, signCallback: SignCallback): Promise<void>;
    compilePyTeal(pytealSourceFile: string, outputCount: number, overrideArgs?: string[]): Promise<string[]>;
    createRedeemWormholeTransactions(vaa: Uint8Array, sender: string): Promise<Transaction[]>;
}
