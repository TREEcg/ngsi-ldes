import compression from "compression";
import cors from "cors";
import debug from "debug";
import 'dotenv/config';
import express from "express";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit } from 'node-fetch';

import { router } from "./routes/all.js";
import {getConfig} from "./config/config.js";
const config = getConfig();

import issuer from './utils/OpenIdIssuer.js';

let access_token;

const app = express();

app.use(compression()); // enable gzip

app.options("*", cors()); // add cors to OPTIONS requests
app.use(cors()); // add cors to GET requests

app.use("/", router);
app.set("port", process.env.PORT || 3001);

start();

async function start() {
    let client;

    if (config.enableAuthentication) {
        try {
            const issuerInstance = await issuer();
            const clientId = config.clientId;
            const secretId = config.clientSecret;
            client = new issuerInstance.Client({
                client_id: config.clientId,
                client_secret: config.clientSecret
            });
            const grant = {
                grant_type: 'client_credentials',
                scope: config.scope
            }

            let token = await client.grant(grant);
            access_token = token.access_token;
            app.locals.fetch = authenticatedFetch;
            const maxValidTime: number = token.max_valid_time ? token.max_valid_time : 5 * 60; // 5 minutes default
            setInterval(async () => {
                console.log("Refresh access token")
                token = await client.grant(grant);
                access_token = token.access_token;
            }, maxValidTime * 1000 * 0.95); // in millis and with margin to be on time
        } catch (e) {
            console.error(e);
        }
    } else {
        app.locals.fetch = fetch;
    }

    const server = app.listen(app.get("port"), () => {
        debug("Express server listening on port " + app.get("port"));
    });
}

async function authenticatedFetch(url: RequestInfo, options?: RequestInit): Promise<any> {
    let requestInit : RequestInit = {
    headers: {
        Authorization: `Bearer ${access_token}`,
    },
    };

    if (options) {
        options.headers = {...requestInit.headers, ...options.headers};
        requestInit = options;
    }
    return fetch(url, requestInit);
}

