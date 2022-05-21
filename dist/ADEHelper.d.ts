/// <reference types="node" />
import { DelegationAttributes } from "./types";
export declare function encodeDelegationAttributes(attr: DelegationAttributes): Buffer;
export declare function decodeDelegationAttributes(buf: Buffer): DelegationAttributes;
