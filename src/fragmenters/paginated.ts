import type {RelationParameters} from "@treecg/types";
import {RelationType} from "@treecg/types";
import {getConfig} from "../config/config.js";

export default class TimeFragmenter {
    private fetch: any;
    /* Type param of the fragments */
    private type: string;
    /* Limit param of the fragments */
    private limit: number;
    public constructor(fetch: any, type: string, limit: number) {
        this.fetch = fetch;
        this.type = type;
        this.limit = limit;
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

    public async getLatestPage(): Promise<string> {
        const entitiesCount: number = await this.getEntitiesCount();
        const latestOffset = entitiesCount - (entitiesCount % this.limit);
        return`${getConfig().targetURI}/paginated?type=${this.type}&offset=${latestOffset}`;
    }

    public async getData(offset: number): Promise<any[]> {
        const now = new Date().toISOString();
        const uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
            + `&time=${now}&limit=${this.limit}&offset=${offset}&timeproperty=${getConfig().timeProperty}&options=sysAttrs`;
        const response = await this.fetch(uri);
        return await response.json();
    }

    public isFirstPage(offset: number): boolean {
       return offset - this.limit > 0;
    }

    public async getNextRelation(offset: number): Promise<RelationParameters> {
        const nextOffset = offset + this.limit;
        const nodeId: string = `${getConfig().targetURI}/paginated?type=${this.type}&offset=${nextOffset}`;
        const type: RelationType = RelationType.Relation;
        const remainingItems: number = await this.getEntitiesCount() - this.limit - offset; // This can increase later
        return {
            nodeId,
            type,
            remainingItems,
        };
    }

    public async getPreviousRelation(offset: number): Promise<RelationParameters> {
        const previousOffset = offset - this.limit;
        const nodeId: string = `${getConfig().targetURI}/paginated?type=${this.type}&offset=${previousOffset}`;
        const type: RelationType = RelationType.Relation;
        const remainingItems: number = offset; // Offset starts at zero
        return {
            nodeId,
            type,
            remainingItems,
        };
    }

    public async isStableFragment(offset: number): Promise<boolean> {
        const count = await this.getEntitiesCount();
        return (offset + this.limit) <= count;
    }

    public getType(): string {
        return this.type;
    }

    private async getEntitiesCountFromResponse(response: any): Promise<number> {
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

    public async getEntitiesCount(): Promise<number> {
        const now = new Date().toISOString();
        const uri = `${getConfig().sourceURI}/temporal/entities?type=${this.type}&timerel=before`
            + `&time=${now}&limit=0&count=true`;
        const response = await this.fetch(uri);
        return this.getEntitiesCountFromResponse(response);
    }
}
