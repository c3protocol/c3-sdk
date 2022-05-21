"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeAddress = exports.getDeltaBytes = exports.getDeltaUint = exports.compareArrays = exports.encodeApplicationAddress = exports.sha256Hash = exports.decodeBase64 = exports.encodeBase64 = exports.decodeBase16 = exports.decodeUint32 = exports.encodeUint32 = exports.decodeUint64 = exports.encodeUint64 = exports.decodePrice = exports.encodePrice = exports.decodeState = exports.decodeString = exports.encodeString = exports.encodeArgArray = exports.encodeC3PyTealDictionary = exports.decodeC3PyTealDictionary = exports.unpackData = exports.packData = exports.unpackFormat = exports.packFormat = exports.concatArrays = exports.packedTypeMap = exports.PRICE_LENGTH = exports.SHA256_HASH_LENGTH = exports.TEAL_SIGNATURE_LENGTH = void 0;
const algosdk_1 = require("algosdk");
const js_sha512_1 = __importDefault(require("js-sha512"));
const buffer_1 = require("buffer");
const assert_1 = __importDefault(require("assert"));
exports.TEAL_SIGNATURE_LENGTH = 64;
exports.SHA256_HASH_LENGTH = 32;
exports.PRICE_LENGTH = 17;
// NOTE: !!!! ONLY MODIFY THIS BY APPENDING TO THE END. THE INDEXES EFFECT THE MERKLE LOG HASH VALUES !!!!
exports.packedTypeMap = [
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
];
(0, assert_1.default)(exports.packedTypeMap.length < 128, 'Too many types in packedTypeMap');
function concatArrays(arrays) {
    return arrays.reduce((a, b) => Uint8Array.from([...a, ...b]));
}
exports.concatArrays = concatArrays;
// Encode the format itself as part of the data for forward compatibility
function packFormat(format) {
    const chunks = [];
    // NOTE: Byte-size fields are capped at 128 to allow for future expansion with varints
    // Encode number of fields
    const fieldCount = Object.entries(format).length;
    (0, assert_1.default)(fieldCount < 128, `Too many fields in object: ${fieldCount}`);
    chunks.push(new Uint8Array([fieldCount]));
    for (const [name, type] of Object.entries(format)) {
        // Encode name and type index
        (0, assert_1.default)(name.length < 128, `Name of property ${name} too long`);
        chunks.push(new Uint8Array([name.length]));
        chunks.push(encodeString(name));
        const typeIndex = exports.packedTypeMap.indexOf(type.type);
        (0, assert_1.default)(typeIndex >= 0, 'Type index not found in packedTypeMap');
        chunks.push(new Uint8Array([typeIndex]));
        // For complex types, encode additional data
        switch (type.type) {
            case "string":
            case "bytes":
            case "base64":
                (0, assert_1.default)(type.size < 128, `Sized data was too large: ${type.size}`);
                chunks.push(new Uint8Array([type.size]));
                break;
            case "hash":
            case "object": {
                const format = packFormat(type.info);
                chunks.push(encodeUint64(format.length));
                chunks.push(format);
                break;
            }
        }
    }
    return concatArrays(chunks);
}
exports.packFormat = packFormat;
function unpackFormat(data) {
    let index = 0;
    // Decode field count
    const fieldCount = data[index];
    index++;
    const format = {};
    for (let i = 0; i < fieldCount; i++) {
        // Decode name
        const nameLen = data[index];
        index++;
        const name = decodeString(data.slice(index, index + nameLen));
        index += nameLen;
        // Decode type
        const type = exports.packedTypeMap[data[index]];
        index++;
        switch (type) {
            case "uint":
            case "number":
            case "address":
            case "double":
            case "boolean":
            case "price":
                format[name] = { type };
                break;
            case "string":
            case "bytes":
            case "base64": {
                const size = data[index];
                index++;
                format[name] = { type, size };
                break;
            }
            case "object":
            case "hash": {
                const length = Number(decodeUint64(data.slice(index, index + 8)));
                index += 8;
                const info = unpackFormat(data.slice(index, index + length));
                index += length;
                format[name] = { type, info };
                break;
            }
        }
    }
    return format;
}
exports.unpackFormat = unpackFormat;
function packData(value, format, includeType = false) {
    const chunks = [];
    if (includeType) {
        const packedFormat = packFormat(format);
        chunks.push(encodeUint64(packedFormat.length));
        chunks.push(packedFormat);
    }
    // Encode the data fields
    for (const [name, type] of Object.entries(format)) {
        const v = value[name];
        if (v === undefined) {
            const printedValue = JSON.stringify(value, (_, value) => typeof value === 'bigint' ? value.toString() : value);
            throw new Error(`Key ${name} missing from value:\n${printedValue}`);
        }
        switch (type.type) {
            case 'object':
                if (v instanceof Object) {
                    chunks.push(packData(v, type.info, false));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected object, got ${v}`);
                }
            case 'hash':
                if (v instanceof Object) {
                    // NOTE: Hashes always refer to the typed version of the data to enable forward compatibility
                    chunks.push(sha256Hash(packData(v, type.info, true)));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected object for hashing, got ${v}`);
                }
            case 'address':
                if (v instanceof Uint8Array && v.length === 32) {
                    chunks.push(v);
                    break;
                }
                else if (typeof v === 'string') {
                    chunks.push((0, algosdk_1.decodeAddress)(v).publicKey);
                }
                else {
                    throw new Error(`${name}: Expected address, got ${v}`);
                }
                break;
            case 'bytes':
                if (v instanceof Uint8Array) {
                    if (v.length === type.size) {
                        chunks.push(v);
                        break;
                    }
                    else {
                        throw new Error(`${name}: Bytes length is wrong, expected ${type.size}, got ${v.length}`);
                    }
                }
                else {
                    throw new Error(`${name}: Expected bytes[${type.size}], got ${v}`);
                }
            case 'base64':
                if (typeof v === 'string') {
                    try {
                        const bytes = decodeBase64(v);
                        if (bytes.length === type.size) {
                            chunks.push(bytes);
                            break;
                        }
                        else {
                            throw new Error(`${name}: Base64 length is wrong, expected ${type.size}, got ${bytes.length}`);
                        }
                    }
                    catch (_a) {
                        throw new Error(`${name}: Base64 encoding is wrong, got ${v}`);
                    }
                }
                else {
                    throw new Error(`${name}: Expected Base64 string, got ${v}`);
                }
            case 'double':
                if (typeof v === 'number') {
                    const bytes = new ArrayBuffer(8);
                    buffer_1.Buffer.from(bytes).writeDoubleLE(v, 0);
                    chunks.push(new Uint8Array(bytes));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected double, got ${v}`);
                }
            case 'boolean':
                if (typeof v === 'boolean') {
                    chunks.push(new Uint8Array([v ? 1 : 0]));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected boolean, got ${v}`);
                }
            case 'number':
            case 'uint':
                if (typeof v === 'bigint' || typeof v === 'number') {
                    chunks.push(encodeUint64(v));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected uint or number, got ${v}`);
                }
            case 'string':
                if (typeof v === 'string') {
                    const str = encodeString(v);
                    if (str.length === type.size) {
                        chunks.push(str);
                        break;
                    }
                    else {
                        throw new Error(`${name}: Expected string length ${type.size}, got string length ${str.length}`);
                    }
                }
                else {
                    throw new Error(`${name}: Expected string length ${type.size}, got ${v}`);
                }
            case 'price':
                if (typeof v === 'bigint') {
                    chunks.push(encodePrice(v));
                    break;
                }
                else {
                    throw new Error(`${name}: Expected bigint, got ${v}`);
                }
        }
    }
    return concatArrays(chunks);
}
exports.packData = packData;
function unpackData(data, formatOpt) {
    let format;
    let index = 0;
    // Decode format
    if (formatOpt) {
        format = formatOpt;
    }
    else {
        const length = Number(decodeUint64(data.slice(index, index + 8)));
        index += 8;
        format = unpackFormat(data.slice(index, index + length));
        index += length;
    }
    // Decode data
    // NOTE: This needs to be an inner function to maintain the index across calls
    const unpackInner = (data, format) => {
        const object = {};
        for (const [name, type] of Object.entries(format)) {
            if (index >= data.length) {
                throw new Error('Unpack data length was not enough for the format provided');
            }
            let value;
            switch (type.type) {
                case 'object':
                    value = unpackInner(data, type.info);
                    break;
                case 'hash':
                    value = data.slice(index, index + exports.SHA256_HASH_LENGTH);
                    index += exports.SHA256_HASH_LENGTH;
                    break;
                case 'address':
                    value = (0, algosdk_1.encodeAddress)(data.slice(index, index + 32));
                    index += 32;
                    break;
                case 'bytes':
                    value = data.slice(index, index + type.size);
                    index += type.size;
                    break;
                case 'base64':
                    value = encodeBase64(data.slice(index, index + type.size));
                    index += type.size;
                    break;
                case 'double':
                    value = buffer_1.Buffer.from(data.slice(index, index + 8)).readDoubleLE(0);
                    index += 8;
                    break;
                case 'boolean':
                    value = data.slice(index, index + 1)[0] === 1;
                    index += 1;
                    break;
                case 'number':
                    value = Number(decodeUint64(data.slice(index, index + 8)));
                    index += 8;
                    break;
                case 'uint':
                    value = decodeUint64(data.slice(index, index + 8));
                    index += 8;
                    break;
                case 'string':
                    value = decodeString(data.slice(index, index + type.size));
                    index += type.size;
                    break;
                case 'price':
                    value = decodePrice(data.slice(index, index + exports.PRICE_LENGTH));
                    index += exports.PRICE_LENGTH;
                    break;
            }
            object[name] = value;
        }
        return object;
    };
    const result = unpackInner(data, format);
    if (index !== data.length) {
        throw new Error(`Data length(${index}) did not match expected (${data.length}) for format\n${JSON.stringify(format)}`);
    }
    return result;
}
exports.unpackData = unpackData;
function decodeC3PyTealDictionary(keys, values) {
    const decodedDictionary = new Map();
    const numericFields = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }]);
    const decodingFields = [
        ...numericFields,
        ['length', { type: 'bytes', size: 1 }]
    ];
    const decodingInfo = Object.fromEntries(decodingFields);
    const decodedIds = unpackData(keys, decodingInfo);
    const decodedValues = unpackData(values, decodingInfo);
    const lengthIds = decodedIds["length"];
    const lengthValues = decodedValues["length"];
    if (!lengthIds || !lengthValues || lengthIds[0] !== lengthValues[0])
        throw new Error("Deposits dictionary is corrupted");
    for (let i = 0; i < lengthIds[0]; i++)
        decodedDictionary.set(Number(decodedIds[i.toString()]), BigInt(decodedValues[i.toString()]));
    return decodedDictionary;
}
exports.decodeC3PyTealDictionary = decodeC3PyTealDictionary;
function encodeC3PyTealDictionary(dictionary) {
    // @NOTE: length should be placed at 120th byte index at the end in the list
    // @NOTE: empty key-value pairs should be encoded as 0 bytes in the list
    // @NOTE: the maximun length of pairs is 15 in the list
    const length = dictionary.size;
    const numericFields = [...Array(15)].map((_, i) => [i.toString(), { type: 'uint' }]);
    const encodingFields = [
        ['length', { type: 'bytes', size: 1 }],
        ...numericFields
    ];
    const encodingInfo = Object.fromEntries(encodingFields);
    const encodedIds = {
        "length": Uint8Array.from([length])
    };
    const encodedValues = {
        "length": Uint8Array.from([length])
    };
    let i = 0;
    dictionary.forEach((value, key) => {
        encodedIds[i.toString()] = key;
        encodedValues[i.toString()] = value;
        i++;
    });
    while (i < 15) {
        encodedIds[i.toString()] = 0;
        encodedValues[i.toString()] = 0;
        i++;
    }
    const keys = packData(encodedIds, encodingInfo);
    const values = packData(encodedValues, encodingInfo);
    return {
        keys,
        values
    };
}
exports.encodeC3PyTealDictionary = encodeC3PyTealDictionary;
function encodeArgArray(params) {
    return params.map(param => {
        if (param instanceof Uint8Array)
            return new Uint8Array(param);
        if (typeof param === "string")
            return encodeString(param);
        if (typeof param === "boolean")
            param = BigInt(param ? 1 : 0);
        if (typeof param === "number")
            param = BigInt(param);
        return encodeUint64(param);
    });
}
exports.encodeArgArray = encodeArgArray;
function encodeString(value) {
    return new Uint8Array(buffer_1.Buffer.from(value));
}
exports.encodeString = encodeString;
function decodeString(value) {
    return buffer_1.Buffer.from(value).toString('utf-8');
}
exports.decodeString = decodeString;
function decodeState(state, stateMap, errorOnMissing = true) {
    const result = {};
    for (const [name, type] of Object.entries(stateMap)) {
        const stateName = encodeBase64(encodeString(name));
        const key = state.find((v) => v['key'] === stateName);
        if (errorOnMissing && key === undefined) {
            throw new Error(`Expected key ${name} was not found in state`);
        }
        const value = key ? key['value'][type] : undefined;
        if (errorOnMissing && value === undefined) {
            throw new Error(`Expected value for key ${name} was not found in state`);
        }
        const typedValue = type === 'bytes' ? decodeBase64(value !== null && value !== void 0 ? value : '') : BigInt(value !== null && value !== void 0 ? value : '');
        result[name] = typedValue;
    }
    return result;
}
exports.decodeState = decodeState;
function encodePrice(value) {
    const bytes = buffer_1.Buffer.alloc(exports.PRICE_LENGTH);
    for (let index = 0; index < exports.PRICE_LENGTH; index++)
        bytes[16 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF));
    return new Uint8Array(bytes);
}
exports.encodePrice = encodePrice;
function decodePrice(value) {
    let num = BigInt(0);
    for (let index = 0; index < exports.PRICE_LENGTH; index++)
        num = (num << BigInt(8)) | BigInt(value[index]);
    return num;
}
exports.decodePrice = decodePrice;
function encodeUint64(value) {
    const bytes = buffer_1.Buffer.alloc(8);
    for (let index = 0; index < 8; index++)
        bytes[7 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF));
    return new Uint8Array(bytes);
}
exports.encodeUint64 = encodeUint64;
function decodeUint64(value) {
    let num = BigInt(0);
    for (let index = 0; index < 8; index++)
        num = (num << BigInt(8)) | BigInt(value[index]);
    return num;
}
exports.decodeUint64 = decodeUint64;
function encodeUint32(value) {
    const bytes = buffer_1.Buffer.alloc(4);
    for (let index = 0; index < 4; index++)
        bytes[3 - index] = Number((BigInt(value) >> BigInt(index * 8)) & BigInt(0xFF));
    return new Uint8Array(bytes);
}
exports.encodeUint32 = encodeUint32;
function decodeUint32(value) {
    let num = BigInt(0);
    for (let index = 0; index < 4; index++)
        num = (num << BigInt(8)) | BigInt(value[index]);
    return Number(num);
}
exports.decodeUint32 = decodeUint32;
function decodeBase16(value) {
    return buffer_1.Buffer.from(value, 'hex');
}
exports.decodeBase16 = decodeBase16;
function encodeBase64(value) {
    return buffer_1.Buffer.from(value).toString('base64');
}
exports.encodeBase64 = encodeBase64;
function decodeBase64(value) {
    return buffer_1.Buffer.from(value, 'base64');
}
exports.decodeBase64 = decodeBase64;
function sha256Hash(arr) {
    return new Uint8Array(js_sha512_1.default.sha512_256.arrayBuffer(arr));
}
exports.sha256Hash = sha256Hash;
function encodeApplicationAddress(id) {
    const APP_ID_PREFIX = buffer_1.Buffer.from('appID');
    const toBeSigned = concatArrays([APP_ID_PREFIX, encodeUint64(BigInt(id))]);
    return (0, algosdk_1.encodeAddress)(sha256Hash(toBeSigned));
}
exports.encodeApplicationAddress = encodeApplicationAddress;
function compareArrays(a, b) {
    return a.length === b.length && a.reduce((equal, item, index) => equal && item === b[index], true);
}
exports.compareArrays = compareArrays;
function getDelta(response, key) {
    const delta = response['global-state-delta'].find((v) => v.key === key);
    if (delta === undefined)
        return undefined;
    return delta['value'];
}
function getDeltaUint(response, key) {
    const delta = getDelta(response, key);
    if (delta === undefined)
        return undefined;
    return BigInt(delta['uint']);
}
exports.getDeltaUint = getDeltaUint;
function getDeltaBytes(response, key) {
    const delta = getDelta(response, key);
    if (delta === undefined)
        return undefined;
    return decodeBase64(delta['bytes']);
}
exports.getDeltaBytes = getDeltaBytes;
var algosdk_2 = require("algosdk");
Object.defineProperty(exports, "encodeAddress", { enumerable: true, get: function () { return algosdk_2.encodeAddress; } });
//# sourceMappingURL=Encoding.js.map