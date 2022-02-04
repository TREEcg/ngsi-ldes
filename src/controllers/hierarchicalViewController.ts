import {Request, Response} from "express";
import { getConfig } from "../config/config.js";
import {convertToKeyValues, getLdesURI} from "../utils/Util.js";
import {RelationType} from "@treecg/types";
import HierarchicalFragmenter from "../fragmenters/hierarchical.js";

async function wrapPage(
    req: Request, // the original request
    data: object, // the converted data
    hierarchicalFragmenter: HierarchicalFragmenter, // hierarchical fragmentation strategy
) {
    let relations = [];

    // Add relations to previous and next day when day fragment
    if (hierarchicalFragmenter.isDayFragment()) {
        const previousDayTimeAt: Date = new Date(hierarchicalFragmenter.getTimeAt().getTime() - 24 * 60 * 60 * 1000);
        const previousDayEndTimeAt: Date = hierarchicalFragmenter.getTimeAt();
        // tslint:disable-next-line:max-line-length
        const prevDayFragmenter: HierarchicalFragmenter = new HierarchicalFragmenter(req.app.locals.fetch, hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), previousDayTimeAt, previousDayEndTimeAt);
        // if (await prevDayFragmenter.getEntitiesCount() > 0) {
            relations.push({
                "@type": RelationType.Relation,
                "tree:node": prevDayFragmenter.getFragmentURI(),
                "tree:remainingItems": await hierarchicalFragmenter.getBeforeCount(),
            });
        // }
        if (hierarchicalFragmenter.isStableFragment()) {
            const nextDayTimeAt: Date = hierarchicalFragmenter.getEndTimeAt();
            // tslint:disable-next-line:max-line-length
            const nextDayEndTimeAt: Date = new Date(hierarchicalFragmenter.getEndTimeAt().getTime() + 24 * 60 * 60 * 1000);
            // tslint:disable-next-line:max-line-length
            const nextDayFragmenter: HierarchicalFragmenter = new HierarchicalFragmenter(req.app.locals.fetch, hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), nextDayTimeAt, nextDayEndTimeAt);
            // if (await prevDayFragmenter.getEntitiesCount() > 0) {
            relations.push({
                "@type": RelationType.Relation,
                "tree:node": nextDayFragmenter.getFragmentURI(),
                "tree:remainingItems": await hierarchicalFragmenter.getAfterCount(),
            });
            // }
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
            const levelFragment: HierarchicalFragmenter = new HierarchicalFragmenter(req.app.locals.fetch, hierarchicalFragmenter.getType(), hierarchicalFragmenter.getLimit(), levelTimeAt, levelEndTimeAt);
            const levelCount = await levelFragment.getEntitiesCount();
            if (levelCount > 0) {
                relations.push({
                    "@type": RelationType.Relation,
                    "tree:node": levelFragment.getFragmentURI(),
                    "tree:remainingItems": levelCount,
                });
                // All members are located here, hence no other relations are necessary
                if (levelCount === await hierarchicalFragmenter.getEntitiesCount()) { continue; }
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
        },
    ];

    // build the fragment
    const result = {
        "@context": vocabulary,
        "@id": hierarchicalFragmenter.getFragmentURI(),
        "@type": "tree:Node",
        "viewOf": {
            "@id": `${getLdesURI(hierarchicalFragmenter.getType())}`,
            "@type": "ldes:EventStream",
        },
        "tree:relation": relations,
        "@included": data,
    };

    return result;
}

function removePropertyGraph(data: any) {
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

function addMemberMetadata(data: any, ldesURI: string) {
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

async function getPage(
    req: Request, // the original request
    res: Response, // the response object
    hierarchicalFragmenter: HierarchicalFragmenter, // hierarchical fragmentation strategy
) {
    let data: any;

    if (!hierarchicalFragmenter.isTimeIntervalSpecified()) {
        // Redirect to today when no interval is specified
        addHeaders(res, false);
        res.redirect(HierarchicalFragmenter.getFragmentOfToday(hierarchicalFragmenter.getType()));
        return;
    } else {
        const count: number = await hierarchicalFragmenter.getEntitiesCount();
        if (count > getConfig().temporalLimit || count === 0) {
            // Too much data for one fragment
            data = [];
        } else {
            data = await hierarchicalFragmenter.getData();
            if (getConfig().keyValues) { data = removePropertyGraph(data); }
            const ldesURI = getLdesURI(hierarchicalFragmenter.getType());
            addMemberMetadata(data, ldesURI);
        }
        // Add metadata to the resulting data
        const pagedData = await wrapPage(req, data, hierarchicalFragmenter);
        addHeaders(res, hierarchicalFragmenter.isStableFragment());
        res.status(200).send(pagedData);
    }
}

function addHeaders(
    res: Response, // the response object
    stable?: boolean, // is the fragment considered to be stable?
) {
    res.type("application/ld+json; charset=utf-8");
    if (stable) {
        // stable fragments are cached for a day
        res.set("Cache-Control", `public, max-age=${60 * 60 * 24}`);
    } else {
        // unstable fragments are cached for 5 seconds
        res.set("Cache-Control", "public, max-age=5");
    }
}

export async function getHierarchicalPage(req, res) {
    const type = req.query.type;
    const timeAtString = req.query.timeAt;
    const endTimeAtString = req.query.endTimeAt;
    if (!type) {
        res.status(404);
        res.send("Type, timeAt and endTimeAt query parameters must be filled in.")
    } else if (!timeAtString || !endTimeAtString) {
        addHeaders(res, false);
        res.redirect(HierarchicalFragmenter.getFragmentOfToday(encodeURIComponent(type)));
    } else if ((timeAtString && !Date.parse(timeAtString))
        || (endTimeAtString && !Date.parse(endTimeAtString))) {
        res.status(404);
        res.send("timeAt and endTimeAt query parameters must be valid dates in ISO format.")
    } else {
        // tslint:disable-next-line:max-line-length
        const hierarchicalFragmenter = new HierarchicalFragmenter(req.app.locals.fetch, encodeURIComponent(type), getConfig().temporalLimit, new Date(timeAtString), new Date(endTimeAtString));

        res.type("application/ld+json; charset=utf-8");

        await getPage(req, res, hierarchicalFragmenter);
    }
}
