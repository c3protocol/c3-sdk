import { LogicSigAccount, Transaction } from "algosdk";
import { CEDepositRequest, PreparedDepositRequest } from "./C3RequestTypes";
import { Deployer, SignCallback } from "./Deployer";
import { TealSignCallback } from "./Order";
import { Address, CERequest, ContractIds, DelegationRequest, UserProxyRequest, SignedUserProxyRequest } from "./types";
export declare const PROXY_BYTECODE_CHUNKS: string[];
export declare class UserProxy {
    private readonly deployer;
    readonly user: Address;
    private readonly server;
    readonly proxy: LogicSigAccount;
    private readonly contracts;
    private readonly signCallback;
    private readonly tealSignCallback;
    constructor(deployer: Deployer, user: Address, server: Address, proxy: LogicSigAccount, contracts: ContractIds, signCallback: SignCallback, tealSignCallback: TealSignCallback);
    private static compileUserProxySig;
    static compileUserProxy(deployer: Deployer, server: Address, user: Address, contracts: ContractIds, sign: SignCallback, tealSign: TealSignCallback): Promise<UserProxy>;
    private static makeUserProxySig;
    static makeUserProxy(deployer: Deployer, server: Address, user: Address, contracts: ContractIds, sign: SignCallback, tealSign: TealSignCallback): UserProxy;
    makeCallTransaction(args: SignedUserProxyRequest): Promise<Transaction>;
    address(): Address;
    generateDepositGroup(req: CEDepositRequest): Promise<[Transaction[], number, number]>;
    prepareDeposit(req: CEDepositRequest): Promise<PreparedDepositRequest>;
    prepareCEOp(req: CERequest): Promise<SignedUserProxyRequest>;
    prepareDelegationOp(req: DelegationRequest): Promise<SignedUserProxyRequest>;
    createRequest(assigns: Partial<UserProxyRequest>): Promise<UserProxyRequest>;
    signCallData(req: UserProxyRequest): Promise<SignedUserProxyRequest>;
}
