import { getConfig } from "../config/config.js";
import {convertToKeyValues, convertToVersionedObject, getLdesURI} from "../utils/Util.js";
import {RelationParameters, RelationType} from "@treecg/types";
import HierarchicalFragmenter from "../fragmenters/hierarchical";
import {HttpHandler, HttpHandlerInput, HttpRequest, HttpResponse} from "@solid/community-server";
import * as queryString from 'query-string';
import {Fetcher} from "../utils/Fetcher";
import {query} from "express";

export interface HierarchicalViewControllerArgs {
    /**
     * Fetcher to use
     */
    fetcher: Fetcher;
    /**
     * Base URL of the fragments
     */
    baseUrl: string;
}

export class HierarchicalViewController extends HttpHandler {
    private readonly fetcher: Fetcher;
    private readonly baseUrl: string;

    public constructor(args: HierarchicalViewControllerArgs) {
        super();
        this.fetcher = args.fetcher;
        this.baseUrl = args.baseUrl;
    }

    handle(input: HttpHandlerInput): Promise<void> {
        return new Promise((resolve): void => {
            const req = input.request;
            const res = input.response;
            const queryparams = queryString.parseUrl(req.url as string);
            const basePath = queryparams.url.indexOf('/') === 0 ? queryparams.url.substring(1) : queryparams.url; // probably /hierarchical
            const type = queryparams.query.type as string;
            const timeAtString = queryparams.query.timeAt as string;
            const endTimeAtString = queryparams.query.endTimeAt as string;
            if (!type) {
                res.statusCode = 404;
                res.write("Type, timeAt and endTimeAt query parameters must be filled in.")
                res.end();
            } else if (!timeAtString || !endTimeAtString) {
                this.addHeaders(res, false);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                today.setHours(0, 0, 0, 0);
                tomorrow.setHours(0, 0, 0, 0);
                const fragmentOfToday = `${this.baseUrl}${basePath}?type=${encodeURIComponent(type)}&timeAt=${today.toISOString()}&endTimeAt=${tomorrow.toISOString()}`;
                res.setHeader("Location", fragmentOfToday);
                res.statusCode = 302;
                res.end();
            } else if ((timeAtString && !Date.parse(timeAtString))
                || (endTimeAtString && !Date.parse(endTimeAtString))) {
                res.write("timeAt and endTimeAt query parameters must be valid dates in ISO format.");
                res.statusCode = 404
                res.end();
            } else {
                // tslint:disable-next-line:max-line-length
                const hierarchicalFragmenter = new HierarchicalFragmenter(this.fetcher, this.baseUrl, basePath, encodeURIComponent(type), getConfig().temporalLimit, new Date(timeAtString), new Date(endTimeAtString));

                res.setHeader("Content-Type", "application/ld+json; charset=utf-8");
                this.getPage(input.request, input.response, hierarchicalFragmenter);
            }
        });
    }

    async wrapPage(
        req: HttpRequest, // the original request
        data: object, // the converted data
        hierarchicalFragmenter: HierarchicalFragmenter, // hierarchical fragmentation strategy
    ) {
        const relations: RelationParameters[]  = [];

        // Add relations to previous and next day when day fragment
        if (hierarchicalFragmenter.isDayFragment()) {
            const remainingItemsBefore = await hierarchicalFragmenter.getBeforeCount();
            if (remainingItemsBefore > 0) {
                const previousDayTimeAt: Date = new Date(hierarchicalFragmenter.getTimeAt().getTime() - 24 * 60 * 60 * 1000);
                const previousDayEndTimeAt: Date = hierarchicalFragmenter.getTimeAt();
                // tslint:disable-next-line:max-line-length
                const prevDayFragmenter: HierarchicalFragmenter = new HierarchicalFragmenter(this.fetcher, hierarchicalFragmenter.getBaseUrl(), hierarchicalFragmenter.getBasePath(), hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), previousDayTimeAt, previousDayEndTimeAt);
                relations.push({
                    "type": RelationType.Relation,
                    "nodeId": prevDayFragmenter.getFragmentURI(),
                    "remainingItems": remainingItemsBefore,
                });
            }
            if (hierarchicalFragmenter.isStableFragment()) {
                const remainingItemsAfter = await hierarchicalFragmenter.getAfterCount();
                if (remainingItemsAfter > 0) {
                    const nextDayTimeAt: Date = hierarchicalFragmenter.getEndTimeAt();
                    // tslint:disable-next-line:max-line-length
                    const nextDayEndTimeAt: Date = new Date(hierarchicalFragmenter.getEndTimeAt().getTime() + 24 * 60 * 60 * 1000);
                    // tslint:disable-next-line:max-line-length
                    const nextDayFragmenter: HierarchicalFragmenter = new HierarchicalFragmenter(this.fetcher, hierarchicalFragmenter.getBaseUrl(), hierarchicalFragmenter.getBasePath(), hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), nextDayTimeAt, nextDayEndTimeAt);
                    relations.push({
                        "type": RelationType.Relation,
                        "nodeId": nextDayFragmenter.getFragmentURI(),
                        "remainingItems": remainingItemsAfter,
                    });
                } else {
                    // refer to node of this view where new entities will arive
                    const latestFragment = hierarchicalFragmenter.getLatestFragment();
                    relations.push({
                        "type": RelationType.Relation,
                        "nodeId": `${latestFragment}`
                    });
                }
            }
        }

        // Add relations to lower level when too much data
        const count: number = await hierarchicalFragmenter.getEntitiesCount();
        if (count > getConfig().temporalLimit) {
            // tslint:disable-next-line:max-line-length
            const intervalTime: number = hierarchicalFragmenter.getEndTimeAt().getTime() - hierarchicalFragmenter.getTimeAt().getTime();
            // tslint:disable-next-line:max-line-length
            // We'll use limit for the number of fragments
            for (let level = 0; level < getConfig().temporalLimit; level++) {
                // tslint:disable-next-line:max-line-length
                const timeAtNumber: number = +hierarchicalFragmenter.getTimeAt().getTime() + +(intervalTime * level / Number(getConfig().temporalLimit));
                // tslint:disable-next-line:max-line-length
                const levelTimeAt: Date = new Date(timeAtNumber);
                // tslint:disable-next-line:max-line-length
                const endTimeAtNumber: number = +hierarchicalFragmenter.getTimeAt().getTime() + +(intervalTime * (level + 1) / Number(getConfig().temporalLimit));
                const levelEndTimeAt: Date = new Date(endTimeAtNumber);
                // tslint:disable-next-line:max-line-length
                const levelFragment: HierarchicalFragmenter = new HierarchicalFragmenter(this.fetcher, hierarchicalFragmenter.getBaseUrl(), hierarchicalFragmenter.getBasePath(), hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), levelTimeAt, levelEndTimeAt);
                const levelCount = await levelFragment.getEntitiesCount();
                if (levelCount > 0) {
                    relations.push({
                        "type": RelationType.Relation,
                        "nodeId": levelFragment.getFragmentURI(),
                        "remainingItems": levelCount,
                    });
                    // All members are located here, hence no other relations are necessary
                    if (levelCount === await hierarchicalFragmenter.getEntitiesCount()) {
                        continue;
                    }
                }
            }
        }

        // adapt/use a new json-ld context
        const vocabulary = [
            "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld",
            {
                "dcterms": "http://purl.org/dc/terms/",
                "ldes": "https://w3id.org/ldes#",
                "tree": "https://w3id.org/tree#",
                "type": "@type",
                "nodeId": {
                    "@id": "tree:node",
                    "@type": "@id"
                },
                "remainingItems": {
                    "@id": "tree:remainingItems"
                },
                "memberOf": {
                    "@reverse": "tree:member",
                    "@type": "@id",
                },
                "viewOf": {
                    "@reverse": "tree:view",
                    "@type": "@id",
                },
                "tree:node": {
                    "@type": "@id",
                },
                "tree:path": {
                    "@type": "@id",
                },
                "dcterms:isVersionOf": {
                    "@type": "@id",
                },
            },
        ];

        // build the fragment
        const result = {
            "@context": vocabulary,
            "@id": hierarchicalFragmenter.getFragmentURI(),
            "@type": "tree:Node",
            "viewOf": {
                "@id": `${getLdesURI(this.baseUrl, hierarchicalFragmenter.getType())}`,
                "@type": "ldes:EventStream",
            },
            "tree:relation": relations,
            "@included": data,
        };

        return result;
    }

    removePropertyGraph(data: any) {
        // Remove NGSI-LD property graph
        let dataInKeyValues: any;
        if (Array.isArray(data)) {
            dataInKeyValues = [];
            // tslint:disable-next-line:forin
            for (const entity of data) {
                dataInKeyValues.push(convertToKeyValues(entity));
            }
        } else {
            dataInKeyValues = convertToKeyValues(data);
        }
        return dataInKeyValues;
    }

    enableVersioning(data: any) {
        // Create version objects
        let dataWithVersionObjects: any;
        const timeProperty = getConfig().timeProperty;
        const versionOfPath = getConfig().versionOfPath;
        const keyValues = getConfig().keyValues;
        if (Array.isArray(data)) {
            dataWithVersionObjects = [];
            // tslint:disable-next-line:forin
            for (const entity of data) {
                dataWithVersionObjects.push(convertToVersionedObject(entity, keyValues, timeProperty, versionOfPath));
            }
        } else {
            dataWithVersionObjects = convertToVersionedObject(data, keyValues, timeProperty, versionOfPath);
        }
        return dataWithVersionObjects;
    }

    addMemberMetadata(data: any, ldesURI: string) {
        // Define these entities as members of the LDES
        if (Array.isArray(data)) {
            for (const index in data) {
                const entity = data[index];
                entity.memberOf = ldesURI;
                data[index] = entity;
            }
        } else {
            data.memberOf = ldesURI;
        }
    }

    async getPage(
        req: HttpRequest, // the original request
        res: HttpResponse, // the response object
        hierarchicalFragmenter: HierarchicalFragmenter, // hierarchical fragmentation strategy
    ) {
        let data: any;

        if (!hierarchicalFragmenter.isTimeIntervalSpecified()) {
            // Redirect to today when no interval is specified
            this.addHeaders(res, false);
            res.statusCode = 302;
            res.setHeader("Location", hierarchicalFragmenter.getFragmentOfToday());
            res.end();
        } else {
            const count: number = await hierarchicalFragmenter.getEntitiesCount();
            if (count > getConfig().temporalLimit || count === 0) {
                // Too much data for one fragment
                data = [];
            } else {
                data = await hierarchicalFragmenter.getData();
                if (getConfig().keyValues) { data = this.removePropertyGraph(data); }
                if (getConfig().enableVersioning) { data = this.enableVersioning(data); }
                const ldesURI = getLdesURI(this.baseUrl, hierarchicalFragmenter.getType());
                this.addMemberMetadata(data, ldesURI);
            }
            // Add metadata to the resulting data
            const pagedData = await this.wrapPage(req, data, hierarchicalFragmenter);
            this.addHeaders(res, hierarchicalFragmenter.isStableFragment());
            res.statusCode = 200;
            res.write(JSON.stringify(pagedData));
            res.end();
        }
    }

    addHeaders(
        res: HttpResponse, // the response object
        stable?: boolean, // is the fragment considered to be stable?
    ) {
        res.setHeader('Content-Type', "application/ld+json; charset=utf-8");
        if (stable) {
            // stable fragments are cached for a day
            res.setHeader("Cache-Control", `public, max-age=${60 * 60 * 24}`);
        } else {
            // unstable fragments are cached for 5 seconds
            res.setHeader("Cache-Control", `public, max-age=${getConfig().maxAgeMutableFragments}`);
        }
    }
}
