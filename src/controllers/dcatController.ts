import { getConfig } from "../config/config.js";
import {HttpHandler, HttpHandlerInput, HttpRequest, HttpResponse} from "@solid/community-server";

export class DcatController extends HttpHandler {
    handle(input: HttpHandlerInput): Promise<void> {
        return this.getDcatPage(input.request, input.response);
    }
    canHandle(input: HttpHandlerInput): Promise<void> {
        return super.canHandle(input);
    }

    async getDcatPage(req: HttpRequest, res: HttpResponse) {
        const md: any = {
            "@context": ["https://apidg.gent.be/opendata/adlib2eventstream/v1/context/DCAT-AP-VL.jsonld", {
                "dcterms": "http://purl.org/dc/terms/",
                "ldes": "https://w3id.org/ldes#",
                "tree": "https://w3id.org/tree#",
                "tree:view": {
                    "@type": "@id"
                }
            }],
            "@id": getConfig().targetURI + "/dcat/ngsi-ldes",
            "@type": "Datasetcatalogus",
            "Datasetcatalogus.titel": {
                "@value": "Catalogus NGSI-LDES",
                "@language": "nl"
            },
            "Datasetcatalogus.beschrijving": {
                "@value": "Catalogus van datasets bovenop NGSI-LD broker.",
                "@language": "nl",
            },
            "Datasetcatalogus.heeftLicentie": {
                "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
            },
            "Datasetcatalogus.heeftDataset": [],
        };

        const types = getConfig().types;
        console.log(types);
        for (const type of types) {
            const encodedType: string = encodeURIComponent(type);
            const hierarchicalView: string = getConfig().targetURI + "/hierarchical?type=" + encodedType;
            const datasetURI: string = getConfig().targetURI + "/dataset?type=" + encodedType;
            const beschrijving: string = `Event Stream van entiteiten van het type: ${type}`;
            const dataset = {
                "@id": datasetURI,
                "@type": [
                    "Dataset",
                    "ldes:EventStream",
                ],
                "tree:view": [ hierarchicalView ],
                "Dataset.titel": {
                    "@value": beschrijving,
                    "@language": "nl",
                },
                "Dataset.beschrijving": {
                    "@value": beschrijving,
                    "@language": "nl",
                },
                "Dataset.toegankelijkheid": "http://publications.europa.eu/resource/authority/access-right/PUBLIC",
                "heeftDistributie": {
                    "@type": "Distributie",
                    "toegangsURL": hierarchicalView,
                    "dcterms: conformsTo": "https://w3id.org/tree",
                    "Distributie.heeftLicentie": {
                        "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
                    },
                },
            };
            md["Datasetcatalogus.heeftDataset"].push(dataset);
        }

        res.setHeader("Content-Type", "application/ld+json; charset=utf-8");
        res.setHeader("Cache-Control", `public, max-age=${60 * 60 * 24}`);

        res.end(JSON.stringify(md));
    }
}
