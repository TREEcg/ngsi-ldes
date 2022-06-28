/**
 * Returns fetcher that contains the fetch method to use
 */
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import issuer from "../utils/OpenIdIssuer";
import {getConfig} from "../config/config.js";
import {Fetcher} from "./Fetcher";


const config = getConfig();

export interface XAPIKeyFetcherArgs {
    /**
     * API key to use
     */
    apiKey: string;
}

export class XAPIKeyFetcher {
    /**
     * Api Key to perform authenticated requests
     * @range {string}
     */
    private readonly apiKey: string;

    public constructor(args: XAPIKeyFetcherArgs) {
        this.apiKey = args.apiKey;
    }

    public fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        return this.authenticatedFetch(url, init);
    }

    /**
     * Extension of the fetch method that adds an Authorization header with the access token
     */
    async authenticatedFetch(url: RequestInfo, options?: RequestInit): Promise<Response> {
        let requestInit : RequestInit = {
            headers: {
                "X-API-Key": `${this.apiKey}`
            }
        };

        if (options) {
            options.headers = {...requestInit.headers, ...options.headers};
            requestInit = options;
        }
        return fetch(url, requestInit);
    }
}
