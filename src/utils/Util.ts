import {getConfig} from "../config/config.js";

export function convertToKeyValues(entity: any): any {
    // Retrieve entities with options=keyValues
    const converted: any = {};
    if (!(typeof entity === "object")) { return entity; } else {
        // tslint:disable-next-line:forin
        for (const k in Object.keys(entity)) {
            try {
                if (entity[Object.keys(entity)[k]].type) {
                    if (entity[Object.keys(entity)[k]].type === "Relationship") {
                        converted[Object.keys(entity)[k]] = convertToKeyValues(entity[Object.keys(entity)[k]].object);
                        // tslint:disable-next-line:max-line-length
                    } else if (entity[Object.keys(entity)[k]].type === "Property" || entity[Object.keys(entity)[k]].type === "GeoProperty") {
                        converted[Object.keys(entity)[k]] = convertToKeyValues(entity[Object.keys(entity)[k]].value);
                    } else {
                        converted[Object.keys(entity)[k]] = convertToKeyValues(entity[Object.keys(entity)[k]]);
                    }
                } else if (Array.isArray(entity[Object.keys(entity)[k]])) {
                    converted[Object.keys(entity)[k]] = [];
                    for (const a of entity[Object.keys(entity)[k]]) {
                        // Apply the same logic for the entities within the array
                        if (a.type) {
                            if (a.type === "Relationship") {
                                converted[Object.keys(entity)[k]].push(convertToKeyValues(a.object));
                                // tslint:disable-next-line:max-line-length
                            } else if (a.type === "Property" || a.type === "GeoProperty") {
                                converted[Object.keys(entity)[k]].push(convertToKeyValues(a.value));
                            } else {
                                converted[Object.keys(entity)[k]].push(convertToKeyValues(a));
                            }
                        }
                    }
                } else if (typeof entity[Object.keys(entity)[k]] === "object") {
                    converted[Object.keys(entity)[k]] = convertToKeyValues(entity[Object.keys(entity)[k]]);
                } else {
                    converted[Object.keys(entity)[k]] = entity[Object.keys(entity)[k]];
                }
            } catch (e) {
                console.error("something went wrong with converting to keyValues. Continuing...");
            }
        }
    }
    return converted;
}

export function getLdesURI(type: string) {
    return getConfig().targetURI + "/dataset?type=" + type;
}

