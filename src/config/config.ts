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
    enableVersioning: boolean;
    versionOfPath: string;
    enableAuthentication: boolean;
    clientId: string | undefined;
    clientSecret: string | undefined;
    authorizationWellKnown: string;
    scope: string;
    xApiKey: string | undefined;
    serverBaseUrl: string;
    serverPort: number;
    publicBaseUrl: string;
    maxAgeMutableFragments: number;
}

let config: IConfig;
export function getConfig(): IConfig {
    if (!config) {
        if (!process.env.NGSI_HOST) {
            throw Error("Env variable NGSI_HOST must be provided.")
        } else if (process.env.NGSI_ISAUTHENTICATED &&
            (
                (!process.env.NGSI_CLIENT_ID || !process.env.NGSI_CLIENT_SECRET || !process.env.NGSI_AUTHORIZATIONWELLKNOWN)
                &&  (!process.env.NGSI_X_API_KEY)
            )) {
            throw Error("NGSI_ISAUTHENTICATED is true, so env variables NGSI_CLIENT_ID, NGSI_CLIENT_SECRET and NGSI_AUTHORIZATIONWELLKNOWN must be provided OR an X-API-Key");
        } else {
            config = {
                sourceURI: process.env.NGSI_HOST,
                types: process.env.NGSI_TYPES ? process.env.NGSI_TYPES.split(' '): [],
                useTimeAt: process.env.NGSI_USETIMEAT === 'true' ? true : false,
                useCountIsTrue: process.env.NGSI_USECOUNTISTRUE === 'true' ? true : false,
                temporalLimit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 10,
                timeProperty: process.env.NGSI_TIMEPROPERTY ? process.env.NGSI_TIMEPROPERTY : "modifiedAt",
                keyValues: process.env.API_KEYVALUES === 'true' ? true : false,
                enableVersioning: process.env.API_ENABLE_VERSIONING === 'true' ? true : false,
                versionOfPath: process.env.API_VERSION_OF_PATH ? process.env.API_VERSION_OF_PATH : "dcterms:isVersionOf",
                enableAuthentication: process.env.NGSI_ISAUTHENTICATED === 'true' ? true : false,
                clientId: process.env.NGSI_CLIENT_ID ? process.env.NGSI_CLIENT_ID : undefined,
                clientSecret: process.env.NGSI_CLIENT_SECRET ? process.env.NGSI_CLIENT_SECRET : undefined,
                authorizationWellKnown: process.env.NGSI_AUTHORIZATIONWELLKNOWN ? process.env.NGSI_AUTHORIZATIONWELLKNOWN : '',
                scope: process.env.NGSI_SCOPE ? process.env.NGSI_SCOPE : "openid",
                xApiKey: process.env.NGSI_X_API_KEY ? process.env.NGSI_X_API_KEY : undefined,
                serverBaseUrl: process.env.SERVER_BASE_URL ? process.env.SERVER_BASE_URL : "http://localhost:3001/",
                serverPort: process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : Number(3001),
                publicBaseUrl: process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL : (process.env.SERVER_BASE_URL ? process.env.SERVER_BASE_URL : "http://localhost:3001/"),
                maxAgeMutableFragments: process.env.MAX_AGE_MUTABLE_FRAGMENTS ? Number(process.env.MAX_AGE_MUTABLE_FRAGMENTS) : 5
            };
        }
    }
    return config;
}
