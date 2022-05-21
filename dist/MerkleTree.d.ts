export declare type Hash = Uint8Array;
export declare type MerkleProof = Hash[];
export declare class MerkleTree<T> {
    encoder: (a: T, includeType?: boolean) => Uint8Array;
    private proofs;
    private values;
    constructor(encoder: (a: T, includeType?: boolean) => Uint8Array, values?: T[]);
    getRoot(): Promise<Hash>;
    length(): Promise<number>;
    getValues(): Promise<T[]>;
    get(index: number): Promise<[value: T, proof: MerkleProof] | undefined>;
    getLast(count: number): Promise<[values: T[], proofs: MerkleProof] | undefined>;
    getRange(start: number, end: number): Promise<[values: T[], proofs: MerkleProof] | undefined>;
    getByHash(hash: Uint8Array): Promise<[value: T, proof: MerkleProof] | undefined>;
    append(...values: T[]): Promise<number>;
    static validate(root: Uint8Array, index: number, entry: Uint8Array, proof: Uint8Array[]): boolean;
}
