"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSON = exports.parseUnsupportedDataTypes = exports.stringifyJSON = exports.addUnsupportedDataTypeToObjects = void 0;
const Encoding_1 = require("./Encoding");
function addUnsupportedDataTypeToObjects(key, value) {
    if (value instanceof Map)
        return { dataType: 'Map', value: Array.from(value.entries()) };
    if (typeof value === "bigint")
        return { dataType: 'bigint', value: value.toString() };
    if (value instanceof Uint8Array)
        return { dataType: 'Uint8Array', value: (0, Encoding_1.encodeBase64)(value) };
    return value;
}
exports.addUnsupportedDataTypeToObjects = addUnsupportedDataTypeToObjects;
function stringifyJSON(entity) {
    return JSON.stringify(entity, addUnsupportedDataTypeToObjects);
}
exports.stringifyJSON = stringifyJSON;
function parseUnsupportedDataTypes(key, value) {
    if (typeof value === 'object' && value !== null && value.dataType === 'Map')
        return new Map(value.value);
    if (typeof value === 'object' && value !== null && value.dataType === 'bigint')
        return BigInt(value.value);
    if (typeof value === 'object' && value !== null && value.dataType === 'Uint8Array')
        return (0, Encoding_1.decodeBase64)(value.value);
    return value;
}
exports.parseUnsupportedDataTypes = parseUnsupportedDataTypes;
function parseJSON(jsonEntity) {
    return JSON.parse(jsonEntity, parseUnsupportedDataTypes);
}
exports.parseJSON = parseJSON;
//# sourceMappingURL=Json.js.map