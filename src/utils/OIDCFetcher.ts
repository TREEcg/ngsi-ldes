/**
 * Returns fetcher that contains the fetch method to use
 */
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import issuer from "../utils/OpenIdIssuer";
import {getConfig} from "../config/config.js";


const config = getConfig();

export class OIDCFetcher {
    /**
     * Access token to perform authenticated requests
     * @range {string}
     */
    protected accessToken?: string;

    public constructor() {
        if (config.enableAuthentication) {
            this.initAuthentication();
        }
    }
    public fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        if (config.enableAuthentication) {
            return this.authenticatedFetch(url, init);
        } else {
            return fetch(url, init);
        }
    }
    private async initAuthentication(): Promise<void> {
        let client: any;
        if (!config.clientId || !config.clientSecret || !config.scope) throw Error("Client credentials and scope must be provided");
        try {
            const issuerInstance = await issuer();
            client = new issuerInstance.Client({
                client_id: config.clientId,
                client_secret: config.clientSecret
            });
            const grant = {
                grant_type: 'client_credentials',
                scope: config.scope
            }

            let token = await client.grant(grant);
            this.accessToken = token.access_token;
            const maxValidTime: number = token.max_valid_time ? token.max_valid_time : 5 * 60; // 5 minutes default
            setInterval(async () => {
                console.log("Refresh access token")
                token = await client.grant(grant);
                this.accessToken = token.access_token;
            }, maxValidTime * 1000 * 0.95); // in millis and with margin to be on time
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Extension of the fetch method that adds an Authorization header with the access token
     */
    async authenticatedFetch(url: RequestInfo, options?: RequestInit): Promise<Response> {
        let requestInit : RequestInit = {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        };

        if (options) {
            options.headers = {...requestInit.headers, ...options.headers};
            requestInit = options;
        }
        return fetch(url, requestInit);
    }
}
