import dotenv from "dotenv";
dotenv.config();

interface IConfig {
    sourceURI: string;
    types: string[];
    useTimeAt: boolean;
    useCountIsTrue: boolean;
    temporalLimit: number;
    timeProperty: string;
    keyValues: boolean;
    enableAuthentication: boolean;
    clientId: string | undefined;
    clientSecret: string | undefined;
    authorizationWellKnown: string;
    scope: string;
}

let config: IConfig;
export function getConfig(): IConfig {
    if (!config) {
        if (!process.env.NGSI_HOST
        || !process.env.NGSI_TYPES) {
            throw Error("Env variable NGSI_HOST or NGSI_TYPES must be provided.")
        }
        else if (process.env.NGSI_ISAUTHENTICATED &&
            (!process.env.NGSI_CLIENT_ID || !process.env.NGSI_CLIENT_SECRET || !process.env.NGSI_AUTHORIZATIONWELLKNOWN)) {
            throw Error("Env variables NGSI_CLIENT_ID, NGSI_CLIENT_SECRET and NGSI_AUTHORIZATIONWELLKNOWN must be provided when NGSI_ISAUTHENTICATED is true");
        } else {
            config = {
                sourceURI: process.env.NGSI_HOST,
                types: process.env.NGSI_TYPES.split(' '),
                useTimeAt: process.env.NGSI_USETIMEAT === 'true' ? true : false,
                useCountIsTrue: process.env.NGSI_USECOUNTISTRUE === 'true' ? true : false,
                temporalLimit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 10,
                timeProperty: process.env.NGSI_TIMEPROPERTY ? process.env.NGSI_TIMEPROPERTY : "modifiedAt",
                keyValues: process.env.API_KEYVALUES === 'true' ? true : false,
                enableAuthentication: process.env.NGSI_ISAUTHENTICATED === 'true' ? true : false,
                clientId: process.env.NGSI_CLIENT_ID ? process.env.NGSI_CLIENT_ID : undefined,
                clientSecret: process.env.NGSI_CLIENT_SECRET ? process.env.NGSI_CLIENT_SECRET : undefined,
                authorizationWellKnown: process.env.NGSI_AUTHORIZATIONWELLKNOWN ? process.env.NGSI_AUTHORIZATIONWELLKNOWN : '',
                scope: process.env.NGSI_SCOPE ? process.env.NGSI_SCOPE : "openid",
            };
        }
    }
    return config;
}
