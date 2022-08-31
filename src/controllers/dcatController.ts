import { getConfig } from "../config/config.js";
import {
    encodeUriPathComponents,
    HttpHandler,
    HttpHandlerInput,
    HttpRequest,
    HttpResponse
} from "@solid/community-server";
import {HierarchicalViewControllerArgs} from "./hierarchicalViewController";
import {Fetcher} from "../utils/Fetcher";

export interface DcatControllerArgs {
    /**
     * Base URL of the server
     */
    baseUrl: string;
    /**
     * Fetcher to use
     */
    fetcher: Fetcher;
}

export class DcatController extends HttpHandler {
    private readonly baseUrl: string;
    private readonly fetcher: Fetcher;

    public constructor(args: DcatControllerArgs) {
        super();
        this.baseUrl = args.baseUrl;
        this.fetcher = args.fetcher;
    }

    handle(input: HttpHandlerInput): Promise<void> {
        return this.getDcatPage(input.request, input.response);
    }
    canHandle(input: HttpHandlerInput): Promise<void> {
        return super.canHandle(input);
    }

    async getDcatPage(req: HttpRequest, res: HttpResponse) {
        const md: any = {
            "@context": ["https://data.vlaanderen.be/doc/applicatieprofiel/DCAT-AP-VL/erkendestandaard/2021-12-02/context/DCAT-AP-VL-20.jsonld", {
                "dcterms": "http://purl.org/dc/terms/",
                "ldes": "https://w3id.org/ldes#",
                "tree": "https://w3id.org/tree#",
                "tree:view": {
                    "@type": "@id"
                }
            }],
            "@id": this.baseUrl + "dcat/ngsi-ldes",
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
            "Datasetcatalogus.heeftService": []
        };

        const types = await this.getTypes();
        for (const type of types) {
            const expandedType = type.id;
            if (expandedType.indexOf('ngsi-ld:') !== -1) expandedType.replace('ngsi-ld:', 'https://uri.etsi.org/ngsi-ld/');
            const encodedExpandedType: string = encodeURIComponent(expandedType);
            const hierarchicalView: string = this.baseUrl + "hierarchical?type=" + encodedExpandedType;
            const datasetURI: string = this.baseUrl + "dataset?type=" + encodedExpandedType;
            const beschrijving: string = `Event Stream van entiteiten van het type: ${expandedType}`;
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
                "Dataset.toegankelijkheid": "http://publications.europa.eu/resource/authority/access-right/PUBLIC"
            };
            md["Datasetcatalogus.heeftDataset"].push(dataset);

            const service = {
                "@type": ["ldes:EventSource", "Dataservice"],
                "Dataservice.biedtInformatieAanOver": datasetURI,
                "Dataservice.endpointUrl": hierarchicalView,
                "Dataservice.conformAanProtocol": "https://w3id.org/ldes",
                "Dataservice.licentie": {
                    "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
                }
            };

            md["Datasetcatalogus.heeftService"].push(service);
        }

        res.setHeader("Content-Type", "application/ld+json; charset=utf-8");
        res.setHeader("Cache-Control", `public, max-age=${60 * 60 * 24}`);

        res.end(JSON.stringify(md));
    }

    async getTypes(): Promise<any[]> {
        const types = [];
        const typesEndpoint = 'http://localhost:9090/ngsi-ld/v1/types';
        const response = await this.fetcher.fetch(typesEndpoint);
        const typesResponse = await response.json();

        if (typesResponse.typeList) {
            for (const type of typesResponse.typeList) {
                const typeInfo = await this.fetcher.fetch(typesEndpoint + '/' + encodeURIComponent(type));
                const typeInfoJson = await typeInfo.json();
                types.push(typeInfoJson);
            }
        }
        else {
            // use config types when nothing found
            for (const type of getConfig().types) {
                types.push({
                    "id": type
                })
            }
        }
        return types;
    }
}
