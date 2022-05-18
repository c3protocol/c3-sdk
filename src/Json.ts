export function addUnsupportedDataTypeToObjects(key: string, value: any): any {
    if (value instanceof Map)
        return { dataType: 'Map', value: Array.from(value.entries()) }
    if (typeof value === "bigint")
        return { dataType: 'bigint', value: value.toString() }
    return value
}

export function stringifyJSON<T>(entity: T): string {

    return JSON.stringify(entity, addUnsupportedDataTypeToObjects)
}

export function parseUnsupportedDataTypes(key: string, value: any): any {
    if (typeof value === 'object' && value !== null && value.dataType === 'Map')
        return new Map(value.value)
    if (typeof value === 'object' && value !== null && value.dataType === 'bigint')
        return BigInt(value.value)
    return value
}

export function parseJSON<T>(jsonEntity: string): T {
    return JSON.parse(jsonEntity, parseUnsupportedDataTypes)
}
