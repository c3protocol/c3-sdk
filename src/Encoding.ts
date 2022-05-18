import { decodeAddress, encodeAddress } from 'algosdk'
import sha512 from "js-sha512"
import { Buffer } from 'buffer'
import { Address, AssetId, Amount, Price } from './types'
import assert from 'assert'

export const TEAL_SIGNATURE_LENGTH = 64
export const SHA256_HASH_LENGTH = 32
export const PRICE_LENGTH = 17

export type AlgorandType = bigint | string | boolean | number | Uint8Array

export type IPackedInfoFixed = {
    type: "uint" | "number" | "address" | "double" | "boolean" | "price"
}
export type IPackedInfoVariable = {
    type: "string" | "bytes" | "base64"
    size: number
}
export type IPackedInfoObject = {
    type: "object" | "hash"
    info: IPackedInfo
}

export type IPackedInfoAny = IPackedInfoFixed | IPackedInfoVariable | IPackedInfoObject
export type IPackedInfo = Record<string, IPackedInfoAny>

export type IStateType = 'uint' | 'bytes'
export type IStateMap = Record<string, IStateType>

export type IStateVar = Uint8Array | bigint
export type IState = Record<string, IStateVar>

// NOTE: !!!! ONLY MODIFY THIS BY APPENDING TO THE END. THE INDEXES EFFECT THE MERKLE LOG HASH VALUES !!!!
export const packedTypeMap = [
    "uint",
    "number",
    "address",
    "double",
    "boolean",
    "string",
    "bytes",
    "base64",
    "object",
    "hash",
    "price"
]

assert(packedTypeMap.length < 128, 'Too many types in packedTypeMap')

export function concatArrays(arrays: Uint8Array[]): Uint8Array {
    return arrays.reduce((a, b) => Uint8Array.from([...a, ...b]))
}

// Encode the format itself as part of the data for forward compatibility
export function packFormat(format: IPackedInfo): Uint8Array {
    const chunks: Uint8Array[] = []

    // NOTE: Byte-size fields are capped at 128 to allow for future expansion with varints
    // Encode number of fields
    const fieldCount = Object.entries(format).length
    assert(fieldCount < 128, `Too many fields in object: ${fieldCount}`)
    chunks.push(new Uint8Array([fieldCount]))

    for (const [name, type] of Object.entries(format)) {
        // Encode name and type index
        assert(name.length < 128, `Name of property ${name} too long`)
        chunks.push(new Uint8Array([name.length]))
        chunks.push(encodeString(name))

        const typeIndex = packedTypeMap.indexOf(type.type)
        assert(typeIndex >= 0, 'Type index not found in packedTypeMap')

        chunks.push(new Uint8Array([typeIndex]))

        // For complex types, encode additional data
        switch (type.type) {
            case "string":
            case "bytes":
            case "base64":
                assert(type.size < 128, `Sized data was too large: ${type.size}`)
                chunks.push(new Uint8Array([type.size]))
                break

            case "hash":
            case "object": {
                const format = packFormat(type.info)
                chunks.push(encodeUint64(format.length))
                chunks.push(format)
                break
            }
        }
    }

    return concatArrays(chunks)
}

export function unpackFormat(data: Uint8Array): IPackedInfo {
    let index = 0
    
    // Decode field count
    const fieldCount = data[index]
    index++

    const format: IPackedInfo = {}
    for (let i = 0; i < fieldCount; i++) {
        // Decode name
        const nameLen = data[index]
        index++

        const name = decodeString(data.slice(index, index + nameLen))
        index += nameLen

        // Decode type
        const type = packedTypeMap[data[index]]
        index++

        switch (type) {
            case "uint":
            case "number":
            case "address":
            case "double":
            case "boolean":
            case "price":
                format[name] = { type }
                break

            case "string":
            case "bytes":
            case "base64": {
                const size = data[index]
                index++

                format[name] = { type, size }
                break
            }

            case "object":
            case "hash": {
                const length = Number(decodeUint64(data.slice(index, index + 8)))
                index += 8

                const info = unpackFormat(data.slice(index, index + length))
                index += length

                format[name] = { type, info }
                break
            }
        }
    }

    return format
}

export function packData(value: Record<string, any>, format: IPackedInfo, includeType = false): Uint8Array {
    const chunks: Uint8Array[] = []

    if (includeType) {
        const packedFormat = packFormat(format)
        chunks.push(encodeUint64(packedFormat.length))
        chunks.push(packedFormat)
    }

    // Encode the data fields
    for (const [name, type] of Object.entries(format)) {
        const v = value[name]
        if (v === undefined) {
            const printedValue = JSON.stringify(value, (_, value) => typeof value === 'bigint' ? value.toString() : value)
            throw new Error(`Key ${name} missing from value:\n${printedValue}`)
        }

        switch (type.type) {
            case 'object':
                if (v instanceof Object) {
                    chunks.push(packData(v, type.info, false))
                    break
                } else {
                    throw new Error(`${name}: Expected object, got ${v}`)
                }
            case 'hash':
                if (v instanceof Object) {
                    // NOTE: Hashes always refer to the typed version of the data to enable forward compatibility
                    chunks.push(sha256Hash(packData(v, type.info, true)))
                    break
                } else {
                    throw new Error(`${name}: Expected object for hashing, got ${v}`)
                }
            case 'address':
                if (v instanceof Uint8Array && v.length === 32) {
                    chunks.push(v)
                    break
                } else if (typeof v === 'string') {
                    chunks.push(decodeAddress(v).publicKey)
                } else {
                    throw new Error(`${name}: Expected address, got ${v}`)
                }
                break;

            case 'bytes':
                if (v instanceof Uint8Array) {
                    if (v.length === type.size) {
                        chunks.push(v)
                        break
                    } else {
                        throw new Error(`${name}: Bytes length is wrong, expected ${type.size}, got ${v.length}`)
                    }
                } else {
                    throw new Error(`${name}: Expected bytes[${type.size}], got ${v}`)
                }
            case 'base64':
                if (typeof v === 'string') {
                    try {
                        const bytes = decodeBase64(v)
                        if (bytes.length === type.size) {
                            chunks.push(bytes)
                            break
                        } else {
                            throw new Error(`${name}: Base64 length is wrong, expected ${type.size}, got ${bytes.length}`)
                        }
                    } catch {
                        throw new Error(`${name}: Base64 encoding is wrong, got ${v}`)
                    }
                } else {
                    throw new Error(`${name}: Expected Base64 string, got ${v}`)
                }
            case 'double':
                if (typeof v === 'number') {
                    const bytes = new ArrayBuffer(8)
                    Buffer.from(bytes).writeDoubleLE(v, 0)
                    chunks.push(new Uint8Array(bytes))
                    break
                } else {
                    throw new Error(`${name}: Expected double, got ${v}`)
                }
            case 'boolean':
                if (typeof v === 'boolean') {
                    chunks.push(new Uint8Array([v ? 1 : 0]))
                    break
                } else {
                    throw new Error(`${name}: Expected boolean, got ${v}`)
                }
            case 'number':
            case 'uint':
                if (typeof v === 'bigint' || typeof v === 'number') {
                    chunks.push(encodeUint64(v))
                    break
                } else {
                    throw new Error(`${name}: Expected uint or number, got ${v}`)
                }
            case 'string':
                if (typeof v === 'string') {
                    const str = encodeString(v)
                    if (str.length === type.size) {
                        chunks.push(str)
                        break
                    } else {
                        throw new Error(`${name}: Expected string length ${type.size}, got string length ${str.length}`)
                    }
                } else {
                    throw new Error(`${name}: Expected string length ${type.size}, got ${v}`)
                }
            case 'price':
                if (typeof v === 'bigint') {
                    chunks.push(encodePrice(v))
                    break
                } else {
                    throw new Error(`${name}: Expected bigint, got ${v}`)
                }
        }
    }

    return concatArrays(chunks)
}

export function unpackData(data: Uint8Array, formatOpt?: IPackedInfo): Record<string, any> {
    let format: IPackedInfo
    let index = 0

    // Decode format
    if (formatOpt) {
        format = formatOpt
    } else {
        const length = Number(decodeUint64(data.slice(index, index + 8)))
        index += 8

        format = unpackFormat(data.slice(index, index + length))
        index += length
    }

    // Decode data
    // NOTE: This needs to be an inner function to maintain the index across calls
    const unpackInner = (data: Uint8Array, format: IPackedInfo) => {
        const object: Record<string, any> = {}
        for (const [name, type] of Object.entries(format)) {
            if (index >= data.length) {
                throw new Error('Unpack data length was not enough for the format provided')
            }

            let value: any
            switch (type.type) {
                case 'object':
                    value = unpackInner(data, type.info)
                    break
                case 'hash':
                    value = data.slice(index, index + SHA256_HASH_LENGTH)
                    index += SHA256_HASH_LENGTH
                    break
                case 'address':
                    value = encodeAddress(data.slice(index, index + 32))
                    index += 32
                    break
                case 'bytes':
                    value = data.slice(index, index + type.size)
                    index += type.size
                    break
                case 'base64':
                    value = encodeBase64(data.slice(index, index + type.size))
                    index += type.size
                    break
                case 'double':
                    value = Buffer.from(data.slice(index, index + 8)).readDoubleLE(0)
                    index += 8
                    break
                case 'boolean':
                    value = data.slice(index, index + 1)[0] === 1
                    index += 1
                    break
                case 'number':
                    value = Number(decodeUint64(data.slice(index, index + 8)))
                    index += 8
                    break
                case 'uint':
                    value = decodeUint64(data.slice(index, index + 8))
                    index += 8
                    break
                case 'string':
                    value = decodeString(data.slice(index, index + type.size))
                    index += type.size
                    break
                case 'price':
                    value = decodePrice(data.slice(index, index + PRICE_LENGTH))
                    index += PRICE_LENGTH
                    break
            }

            object[name] = value
        }

        return object
    }

    const result = unpackInner(data, format)

    if (index !== data.length) {
        throw new Error(`Data length(${index}) did not match expected (${data.length}) for format\n${JSON.stringify(format)}`)
    }

    return result
}

export function decodeC3PyTealDictionary(keys: Uint8Array, values: Uint8Array): Map<AssetId, Amount> {
    const decodedDictionary = new Map<AssetId, Amount> ()

    const numericFields: [string, IPackedInfoAny][] = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }])
    const decodingFields: [string, IPackedInfoAny][] = [
        ...numericFields,
        ['length', { type: 'bytes', size: 1 } ]
    ]
    const decodingInfo = Object.fromEntries(decodingFields)

    const decodedIds = unpackData(keys, decodingInfo)
    const decodedValues = unpackData(values, decodingInfo)
    const lengthIds = decodedIds["length"]
    const lengthValues = decodedValues["length"]
    if (!lengthIds || !lengthValues || lengthIds[0] !== lengthValues[0])
        throw new Error("Deposits dictionary is corrupted")
    for (let i = 0; i < lengthIds[0]; i++)
        decodedDictionary.set(Number(decodedIds[i.toString()]), BigInt(decodedValues[i.toString()]))
    return decodedDictionary
}

export function encodeC3PyTealDictionary(dictionary: Map<AssetId, Amount>): {
    keys: Uint8Array
    values: Uint8Array
} {
    // @NOTE: length should be placed at 120th byte index at the end in the list
    // @NOTE: empty key-value pairs should be encoded as 0 bytes in the list
    // @NOTE: the maximun length of pairs is 15 in the list
    const length = dictionary.size
    const numericFields: [string, IPackedInfoAny][] = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }])
    const encodingFields: [string, IPackedInfoAny][] = [
        ['length', { type: 'bytes', size: 1 } ],
        ...numericFields
    ]
    const encodingInfo = Object.fromEntries(encodingFields)

    const encodedIds: Record<string, any> = {
        "length": Uint8Array.from([length])
    }
    const encodedValues: Record<string, any> = {
        "length": Uint8Array.from([length])
    }
    let i = 0;
    dictionary.forEach((value, key) => {
        encodedIds[i.toString()] = key;
        encodedValues[i.toString()] = value;
        i++;
    })
    while (i < 15) {
        encodedIds[i.toString()] = 0;
        encodedValues[i.toString()] = 0;
        i++;
    }

    const keys = packData(encodedIds, encodingInfo)
    const values = packData(encodedValues, encodingInfo)

    return {
        keys,
        values
    }
}

export function encodeArgArray(params: AlgorandType[]): Uint8Array[] {
    return params.map(param => {
        if (param instanceof Uint8Array)
            return new Uint8Array(param)
        if (typeof param === "string")
            return encodeString(param)
        if (typeof param === "boolean")
            param = BigInt(param ? 1 : 0)
        if (typeof param === "number")
            param = BigInt(param)
        return encodeUint64(param)
    })
}

export function encodeString(value: string | Uint8Array): Uint8Array {
    return new Uint8Array(Buffer.from(value))
}

export function decodeString(value: Uint8Array): string {
    return Buffer.from(value).toString('utf-8')
}

export function decodeState(state: Record<string, Record<string, string>>[], stateMap: IStateMap, errorOnMissing = true): IState {
    const result: IState = {}
    for (const [name, type] of Object.entries(stateMap)) {
        const stateName = encodeBase64(encodeString(name))
        const key = state.find((v: any) => v['key'] === stateName)
        if (errorOnMissing && key === undefined) {
            throw new Error(`Expected key ${name} was not found in state`)
        }

        const value = key ? key['value'][type] : undefined
        if (errorOnMissing && value === undefined) {
            throw new Error(`Expected value for key ${name} was not found in state`)
        }

        const typedValue = type === 'bytes' ? decodeBase64(value ?? '') : BigInt(value ?? '')
        result[name] = typedValue
    }
    return result
}

export function encodePrice(value: Price): Uint8Array {
    const bytes: Buffer = Buffer.alloc(PRICE_LENGTH)
    for (let index = 0; index < PRICE_LENGTH; index++)
        bytes[16 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF))
    return new Uint8Array(bytes)
}

export function decodePrice(value: Uint8Array): Price {
    let num = BigInt(0)
    for (let index = 0; index < PRICE_LENGTH; index++)
        num = (num << BigInt(8)) | BigInt(value[index])
    return num
}

export function encodeUint64(value: number | bigint): Uint8Array {
    const bytes: Buffer = Buffer.alloc(8)
    for (let index = 0; index < 8; index++)
        bytes[7 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF))
    return new Uint8Array(bytes)
}

export function decodeUint64(value: Uint8Array): bigint {
    let num = BigInt(0)
    for (let index = 0; index < 8; index++)
        num = (num << BigInt(8)) | BigInt(value[index])
    return num
}

export function encodeUint32(value: number): Uint8Array {
    const bytes: Buffer = Buffer.alloc(4)
    for (let index = 0; index < 4; index++)
        bytes[3 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF))
    return new Uint8Array(bytes)
}

export function decodeUint32(value: Uint8Array): number {
    let num = BigInt(0)
    for (let index = 0; index < 4; index++)
        num = (num << BigInt(8)) | BigInt(value[index])
    return Number(num)
}

export function decodeBase16(value: string): Uint8Array {
    return Buffer.from(value, 'hex')
}

export function encodeBase64(value: Uint8Array): string {
    return Buffer.from(value).toString('base64')
}

export function decodeBase64(value: string): Uint8Array {
    return Buffer.from(value, 'base64')
}

export function sha256Hash(arr: sha512.Message): Uint8Array {
    return new Uint8Array(sha512.sha512_256.arrayBuffer(arr))
}

export function encodeApplicationAddress(id: number): Address {
    const APP_ID_PREFIX = Buffer.from('appID');
    const toBeSigned = concatArrays([APP_ID_PREFIX, encodeUint64(BigInt(id))]);
    return encodeAddress(sha256Hash(toBeSigned));
}

export function compareArrays(a: Uint8Array[], b: Uint8Array[]) {
    return a.length === b.length && a.reduce((equal, item, index) => equal && item===b[index], true)
}

function getDelta(response: any, key: string): any | undefined {
    const delta = response['global-state-delta'].find((v: any) => v.key === key)
    if (delta === undefined)
        return undefined
    return delta['value']
}

export function getDeltaUint(response: any, key: string): bigint | undefined {
    const delta = getDelta(response, key)
    if (delta === undefined)
        return undefined
    return BigInt(delta['uint'])
}

export function getDeltaBytes(response: any, key: string): Uint8Array | undefined {
    const delta = getDelta(response, key)
    if (delta === undefined)
        return undefined
    return decodeBase64(delta['bytes'])
}

export { encodeAddress } from 'algosdk'
