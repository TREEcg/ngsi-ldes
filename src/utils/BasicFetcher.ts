/**
 * Returns fetcher that contains the fetch method to use
 */
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {Fetcher} from "./Fetcher";

export class BasicFetcher implements Fetcher {
    public fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        return fetch(url, init);
    }
}
