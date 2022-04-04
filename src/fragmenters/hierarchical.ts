import {getConfig} from "../config/config.js";
import {Fetcher} from "../utils/Fetcher";

export default class HierarchicalFragmenter {

    private fetcher: Fetcher; // to fetch
    private baseUrl: string;
    private basePath: string;
    /* Type param of the fragments */
    private type: string;
    /* Limit param of the fragments */
    private limit: number;
    private timeAt: Date;
    private endTimeAt: Date;
    private entitiesCount?: number;

    public constructor(fetcher: Fetcher, baseUrl: string, basePath: string, type: string, limit: number, timeAt: Date, endTimeAt: Date) {
        this.fetcher = fetcher;
        this.baseUrl = baseUrl;
        this.basePath = basePath;
        this.type = type;
        this.limit = limit;
        this.timeAt = timeAt;
        this.endTimeAt = endTimeAt;
    }

    public getFragmentOfToday(): string {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        return this.getFragmentWithInterval(today, tomorrow);
    }
    public getFragmentWithInterval(timeAt: Date, endTimeAt: Date): string {
        return `${this.baseUrl}${this.basePath}?type=${this.type}&timeAt=${timeAt.toISOString()}&endTimeAt=${endTimeAt.toISOString()}`;
    }
    public isTimeIntervalSpecified(): boolean {
        return this.timeAt !== undefined && this.endTimeAt !== undefined;
    }

    public async offsetMatchesFragment(offset: number): Promise<boolean> {
        // Two requirements:
        // 1. module of the offset with the limit must be zero
        const moduleIsZero: boolean = offset % this.limit === 0;
        // 2. must be lower than total number of entities
        const entitiesCount: number = await this.getEntitiesCount();
        const lowerThanTotal: boolean = (offset <= entitiesCount);
        return moduleIsZero && lowerThanTotal;
    }

    public isDayFragment(): boolean {
        return (this.endTimeAt.getTime() - this.timeAt.getTime()) === 60 * 60 * 24 * 1000;
    }

    public async getData(): Promise<any[]> {
        let uri;
        if (getConfig().useTimeAt) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                + `&timeAt=${this.timeAt.toISOString()}&endTimeAt=${this.endTimeAt.toISOString()}&limit=${this.limit}&timeproperty=${getConfig().timeProperty}&options=sysAttrs`;
        } else {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                + `&time=${this.timeAt.toISOString()}&endTime=${this.endTimeAt.toISOString()}&limit=${this.limit}&timeproperty=${getConfig().timeProperty}&options=sysAttrs`;
        }
        console.log("Fetching: " + uri);
        const response = await this.fetcher.fetch(uri);
        return await response.json();
    }

    public isStableFragment(): boolean {
        // End time is before now
        return this.endTimeAt.getTime() < new Date().getTime();
    }

    public getFragmentURI(): string {
        const nodeId: string = `${this.baseUrl}${this.basePath}?type=${this.type}&timeAt=${this.timeAt.toISOString()}&endTimeAt=${this.endTimeAt.toISOString()}`;
        return nodeId;
    }

    public getLatestFragment(): string {
        return `${this.baseUrl}${this.basePath}?type=${this.type}`;
    }

    public getTimeAt(): Date {
        return this.timeAt;
    }

    public getEndTimeAt(): Date {
        return this.endTimeAt;
    }

    public getType(): string {
        return this.type;
    }

    public getBaseUrl(): string {
        return this.baseUrl;
    }

    public getBasePath(): string {
        return this.basePath;
    }

    public getLimit(): number {
        return this.limit;
    }

    public async getBeforeCount(): Promise<number> {
        let uri;
        if (getConfig().useTimeAt && getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
                + `&timeAt=${this.timeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
        } else if (getConfig().useTimeAt && !getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
                + `&timeAt=${this.timeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
        } else if (!getConfig().useTimeAt && !getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
                + `&time=${this.timeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
        } else {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
                + `&time=${this.timeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
        }
        console.log("Fetching: " + uri);
        const response = await this.fetcher.fetch(uri);
        return this.getEntitiesCountFromResponse(response);
    }

    public async getAfterCount(): Promise<number> {
        let uri;
        if (getConfig().useTimeAt && getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=after`
                + `&endTimeAt=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
        } else if (getConfig().useTimeAt && !getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=after`
                + `&endTimeAt=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
        } else if (!getConfig().useTimeAt && !getConfig().useCountIsTrue) {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=after`
                + `&endTimeAt=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
        } else {
            uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=after`
                + `&endTime=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
        }
        console.log("Fetching: " + uri);
        const response = await this.fetcher.fetch(uri);
        return this.getEntitiesCountFromResponse(response);
    }

    public async getEntitiesCount(): Promise<number> {
        if (!this.entitiesCount) {
            const config = getConfig();
            let uri;
            if (getConfig().useTimeAt && getConfig().useCountIsTrue) {
                uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                    + `&timeAt=${this.timeAt.toISOString()}&endTimeAt=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
            } else if (getConfig().useTimeAt && !getConfig().useCountIsTrue) {
                uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                    + `&timeAt=${this.timeAt.toISOString()}&endTimeAt=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
            } else if (!getConfig().useTimeAt && !getConfig().useCountIsTrue) {
                uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                    + `&time=${this.timeAt.toISOString()}&endTime=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&options=count`;
            } else {
                uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=between`
                    + `&time=${this.timeAt.toISOString()}&endTime=${this.endTimeAt.toISOString()}&timeproperty=${getConfig().timeProperty}&limit=0&options=sysAttrs&count=true`;
            }
            console.log("Fetching: " + uri);
            const response = await this.fetcher.fetch(uri);
            const count = this.getEntitiesCountFromResponse(response);
            this.entitiesCount = count;
        }

        return this.entitiesCount;
    }

    private getEntitiesCountFromResponse(response: any): number {
        let entitiesCount: number;
        if (response.headers.get("NGSILD-Results-Count")) {
            entitiesCount = response.headers.get("NGSILD-Results-Count");
        } else if (response.headers.get("count")) {
            entitiesCount = response.headers.get("count");
        } else {
            // Unknown
            entitiesCount = 0;
        }
        return Number(entitiesCount);
    }
}
