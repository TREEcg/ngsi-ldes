import compression from "compression";
import cors from "cors";
import debug from "debug";
import 'dotenv/config';
import express from "express";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit } from 'node-fetch';

import { router } from "../routes/all.js";
import {getConfig} from "../config/config.js";
const config = getConfig();

import issuer from '../utils/OpenIdIssuer.js';

/**
 * This starts the server
 */
export class App {
    /**
     * Access token to perform authenticated requests
     * @range {string}
     */
    protected accessToken: string;
    /**
     * App
     * @ignored
     */
    public app;
    constructor() {
        this.app = express();

        this.app.use(compression()); // enable gzip

        this.app.options("*", cors()); // add cors to OPTIONS requests
        this.app.use(cors()); // add cors to GET requests

        this.app.use("/", router);
        this.app.set("port", process.env.PORT || 3001);
    };

    /**
     * Starts an Express Web server and adds the appropriate fetch method to the app.locals object
     * When authentication must be enabled, a fetch method that adds an access token to the request is added and frequently refreshes the token
     */
    async start() {
        let client;

        if (config.enableAuthentication) {
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
                this.app.locals.fetch = this.authenticatedFetch;
                const maxValidTime: number = token.max_valid_time ? token.max_valid_time : 5 * 60; // 5 minutes default
                setInterval(async () => {
                    console.log("Refresh access token")
                    token = await client.grant(grant);
                    this.accessToken = token.access_token;
                }, maxValidTime * 1000 * 0.95); // in millis and with margin to be on time
            } catch (e) {
                console.error(e);
            }
        } else {
            this.app.locals.fetch = fetch;
        }

        const server = this.app.listen(this.app.get("port"), () => {
            debug("Express server listening on port " + this.app.get("port"));
        });
    }

    /**
     * Extension of the fetch method that adds an Authorization header with the access token
     */
    async authenticatedFetch(url: RequestInfo, options?: RequestInit): Promise<any> {
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
