import { Match, ServerOrder } from "./types";
import { MerkleTree } from "./MerkleTree";
export declare function encodeMatch(data: Match, includeType?: boolean): Uint8Array;
export declare function decodeMatch(data: Uint8Array, tree: MerkleTree<ServerOrder>, includeType?: boolean): Promise<Match>;
