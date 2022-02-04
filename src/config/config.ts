import dotenv from "dotenv";

dotenv.config();

interface IConfig {
    sourceURI: string;
    types: string[];
    targetURI: string;
    useTimeAt: boolean;
    temporalLimit: number;
    timeProperty: string;
    keyValues: boolean;
    enableAuthentication: boolean;
    clientId: string;
    clientSecret: string;
    authorizationWellKnown: string;
    scope: string;
}

let config: IConfig;
export function getConfig(): IConfig {
    if (!config) {
        config = {
            sourceURI: process.env.NGSI_HOST,
            types: process.env.NGSI_TYPES.split(' '),
            targetURI: process.env.API_HOST,
            useTimeAt: process.env.NGSI_USETIMEAT === 'true' ? true : false,
            temporalLimit: Number(process.env.API_LIMIT),
            timeProperty: process.env.NGSI_TIMEPROPERTY ? process.env.NGSI_TIMEPROPERTY : "modifiedAt",
            keyValues: process.env.API_KEYVALUES === 'true' ? true : false,
            enableAuthentication: process.env.NGSI_ISAUTHENTICATED === 'true' ? true : false,
            clientId: process.env.NGSI_CLIENT_ID ? process.env.NGSI_CLIENT_ID : undefined,
            clientSecret: process.env.NGSI_CLIENT_SECRET ? process.env.NGSI_CLIENT_SECRET : undefined,
            authorizationWellKnown: process.env.NGSI_AUTHORIZATIONWELLKNOWN ? process.env.NGSI_AUTHORIZATIONWELLKNOWN : undefined,
            scope: process.env.NGSI_SCOPE ? process.env.NGSI_SCOPE : "openid",
        };
    }

    return config;
}
