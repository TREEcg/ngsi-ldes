import {Request, Response} from "express";
import { getConfig } from "../config/config.js";
import TimeFragmenter from "../fragmenters/paginated.js";
import {convertToKeyValues, getLdesURI} from "../utils/Util.js";
import {RelationParameters} from "@treecg/types";

async function wrapPage(
    req: Request, // the original request
    offset: number, // the pagination offset
    data: object, // the converted data
    timeFragmenter: TimeFragmenter, // temporal fragmentation strategy
) {
    let relations = [];
    let previousRelation: RelationParameters;
    let nextRelation: RelationParameters;
    // No next relation when this is not stable (the latest fragment)
    if (await timeFragmenter.isStableFragment(offset)) {
        nextRelation = await timeFragmenter.getNextRelation(offset);
        relations.push({
            "@type": nextRelation.type,
            "tree:node": nextRelation.nodeId,
            "tree:remainingItems": nextRelation.remainingItems
        });
    }
    // No previous relation when this is the first page
    if (offset !== 0 && timeFragmenter.isFirstPage(offset)) {
        previousRelation = await timeFragmenter.getPreviousRelation(offset);
        relations.push({
            "@type": previousRelation.type,
            "tree:node": previousRelation.nodeId,
            "tree:remainingItems": previousRelation.remainingItems
        });
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
        "@id": `${getConfig().targetURI}/temporal?type=${timeFragmenter.getType()}&offset=${offset}`,
        "@type": "tree:Node",
        "viewOf": {
            "@id": `${getLdesURI(timeFragmenter.getType())}`,
            "@type": "ldes:EventStream",
        },
        "tree:relation": relations,
        "@included": data,
    };

    return result;
}

async function getPage(
    req: Request, // the original request
    res: Response, // the response object
    timeFragmenter: TimeFragmenter, // temporal fragmentation strategy
) {
    const entitiesCount: number = await timeFragmenter.getEntitiesCount();
    // Return 404 when data from this type of entity is not found
    if (entitiesCount === 0) {
        addHeaders(res, false);
        res.sendStatus(404);
        return;
    }

    const offsetString: any = req.query.offset;
    // Redirect to latest page when no offset is provided
    if (!offsetString) {
        const latestPage: string = await timeFragmenter.getLatestPage();
        addHeaders(res, false);
        res.redirect(latestPage);
        return;
    }

    // cast to number
    const offset: number = Number(offsetString);

    // Check if this offset matches with fragment
    const matches = await timeFragmenter.offsetMatchesFragment(offset);
    if (matches) {
        const isStableFragment: boolean = await timeFragmenter.isStableFragment(offset);
        let data: any = await timeFragmenter.getData(offset);
        // Remove NGSI-LD property graph when keyValues
        if (getConfig().keyValues) {
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
            data = dataInKeyValues;
        }
        // Define these entities as members of the LDES
        const ldesURI = getLdesURI(timeFragmenter.getType());
        if (Array.isArray(data)) {
            for (const index in data) {
                const entity = data[index];
                entity.memberOf = ldesURI;
                data[index] = entity;
            }
        }
        // add metadata to the resulting data
        const pagedData = await wrapPage(req, offset, data, timeFragmenter);
        addHeaders(res, isStableFragment);
        res.status(200).send(pagedData);
    } else {
        // Redirect to latest page when offset is not matching a fragment
        addHeaders(res, false);
        const latestPage: string = await timeFragmenter.getLatestPage();
        res.redirect(latestPage);
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

export async function getPaginatedPage(req, res) {
    const type = req.query.type;

    const timeFragmenter = new TimeFragmenter(req.app.locals.fetch, encodeURIComponent(type), getConfig().temporalLimit);

    res.type("application/ld+json; charset=utf-8");
    res.set("Cache-Control", `public, max-age=${60 * 60 * 24}`);

    await getPage(req, res, timeFragmenter);
}
