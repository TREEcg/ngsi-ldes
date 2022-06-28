import {RequestInfo, RequestInit, Response} from "node-fetch";

export interface Fetcher {
    fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
}
