import { Transaction } from 'algosdk';
import { Address } from './types';
import { SignCallback } from './Deployer';
import { TealSignCallback } from './Order';
export declare class Signer {
    private signatures;
    readonly callback: SignCallback;
    readonly tealCallback: TealSignCallback;
    constructor();
    private getPrivateKey;
    addFromMnemonic(mnemonic: string): Address;
    addFromSecretKey(secretKey: Uint8Array): Address;
    createAccount(): Address;
    sign(txs: Transaction[]): Promise<Uint8Array[]>;
    rawSign(txs: Transaction[]): Uint8Array[];
    tealSign(data: Uint8Array, from: Address, to: Address): Promise<Uint8Array>;
}
