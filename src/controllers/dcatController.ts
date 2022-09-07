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

        // Send Context Registry request
        this.notifyContextRegistry();
    }

    handle(input: HttpHandlerInput): Promise<void> {
        return this.getDcatPage(input.request, input.response);
    }
    canHandle(input: HttpHandlerInput): Promise<void> {
        return super.canHandle(input);
    }

    async getDcatPage(req: HttpRequest, res: HttpResponse) {
        // 1. Setup default context and DCAT Catalogue
        const defaultContext = ["https://data.vlaanderen.be/doc/applicatieprofiel/DCAT-AP-VL/erkendestandaard/2021-12-02/context/DCAT-AP-VL-20.jsonld", {
            "dcterms": "http://purl.org/dc/terms/",
            "ldes": "https://w3id.org/ldes#",
            "tree": "https://w3id.org/tree#",
            "tree:view": {
                "@type": "@id"
            },
            "sh": "https://www.w3.org/ns/shacl#",
            "NodeShape":"sh:NodeShape",
            "shape":"tree:shape",
            "sh:nodeKind": {
                "@type":"@id"
            },
            "sh:path":{
                "@type":"@id"
            },
            "sh:datatype": {
                "@type":"@id"
            },
            "sh:class": {
                "@type":"@id"
            },
            "Catalogus.heeftCatalogus": {
                "@container": "@set",
                "@id": "http://www.w3.org/ns/dcat#catalog",
                "@type": "@id"
            }
        }];
        const md: any = {
            "@context": defaultContext,
            "@id": this.baseUrl + "dcat/ngsi-ldes",
            "@type": "Datasetcatalogus",
            "Catalogus.titel": {
                "@value": "Catalogus NGSI-LDES",
                "@language": "nl"
            },
            "Catalogus.beschrijving": {
                "@value": "Catalogus van datasets bovenop NGSI-LD broker.",
                "@language": "nl",
            },
            "Catalogus.licentie": {
                "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
            },
            "Catalogus.heeftDataset": [],
            "Catalogus.heeftDataService": [],
            "Catalogus.heeftCatalogus": []
        };

        const typesEndpoint = `${getConfig().sourceURI}/types`;
        const typesResponse = await this.getResponse(typesEndpoint);
        // 2. Add @context from broker
        const context = await this.getContext(typesResponse);
        if (context && Array.isArray(context)) {
            for (const c of context) {
                md["@context"].push(c);
            }
        }
        else if (context) md["@context"].push(context);

        // 3. Create datasets and data services from types list
        const types = await this.getTypes(typesEndpoint, typesResponse);

        for (const type of types) {
            const expandedType = type.id;
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
                "Dataset.toegankelijkheid": "http://publications.europa.eu/resource/authority/access-right/PUBLIC",
                "tree:shape": this.generateShape(type)
            };
            md["Catalogus.heeftDataset"].push(dataset);

            const eventSourceService = {
                "@type": ["ldes:EventSource", "Dataservice"],
                "Dataservice.biedtInformatieAanOver": datasetURI,
                "Dataservice.endpointUrl": hierarchicalView,
                "Dataservice.conformAanProtocol": "https://w3id.org/ldes",
                "Dataservice.licentie": {
                    "@id": "https://creativecommons.org/publicdomain/zero/1.0/"
                }
            };

            md["Catalogus.heeftDataService"].push(eventSourceService);

            const ngsiLdService = {
                "@type": ["Dataservice"],
                "Dataservice.biedtInformatieAanOver": datasetURI,
                "Dataservice.endpointUrl": getConfig().sourceURI,
                "Dataservice.conformAanProtocol": "https://uri.etsi.org/ngsi-ld/"
            };

            md["Catalogus.heeftDataService"].push(ngsiLdService);
        }

        // 4. Create catalogues from context sources based on the dcat info property
        const csourceRegistrationsEndpoint = `${getConfig().sourceURI}/csourceRegistrations?limit=1000`;
        const csourceRegistrationsResponse = await this.getResponse(csourceRegistrationsEndpoint);
        for (const csource of csourceRegistrationsResponse) {
            if (csource.contextSourceInfo && csource.contextSourceInfo.dcat) {
               const dcat = csource.contextSourceInfo.dcat;
               if (!md["Catalogus.heeftCatalogus"].includes(dcat)) md["Catalogus.heeftCatalogus"].push(dcat);
            }
        }

        res.setHeader("Content-Type", "application/ld+json; charset=utf-8");
        res.setHeader("Cache-Control", `public, max-age=${getConfig().maxAgeMutableFragments}`);

        res.end(JSON.stringify(md));
    }

    async notifyContextRegistry() {
        if (getConfig().notifyContextRegistry) {
            console.log("Sending request to context registry " + getConfig().notifyContextRegistry);
            const typesEndpoint = `${getConfig().sourceURI}/types`;
            const typesResponse = await this.getResponse(typesEndpoint);
            const typeList = await this.getTypes(typesEndpoint, typesResponse);
            const entities = [];
            for (const type of typeList) {
                entities.push({
                    'type': type.id
                });
            }
            const csourceRegistrationId = 'urn:ngsi-ld:ContextSourceRegistration:ngsi-ldes-' + encodeURIComponent(getConfig().sourceURI + '-' + new Date().getTime());
            const body = {
                "id": csourceRegistrationId,
                "type": "ContextSourceRegistration",
                "endpoint": getConfig().sourceURI,
                "information": [{
                    "entities": entities
                }],
                "contextSourceInfo": {
                    "dcat": getConfig().publicBaseUrl
                },
                "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.3.jsonld"
            };
            const notifyRegistryUrl = getConfig().notifyContextRegistry! + '/csourceRegistrations';
            const response = await this.fetcher.fetch(new URL(notifyRegistryUrl), {
                'body': JSON.stringify(body),
                'headers': {
                    'Content-Type': 'application/ld+json'
                },
                'method': 'POST'
            });
            console.log("Context registry notified: " + response.statusText);
        }
    }

    async getResponse(endpoint: string): Promise<any> {
        const response = await this.fetcher.fetch(endpoint, {
            'headers': {
                'Accept': 'application/ld+json'
            }
        });
        return await response.json();
    }

    async getTypes(typesEndpoint: string, typesResponse: any): Promise<any[]> {
        const types = [];
        if (typesResponse.typeList) {
            if (Array.isArray(typesResponse.typeList)) {
                for (const type of typesResponse.typeList) {
                    const typeInfo = await this.fetcher.fetch(`${typesEndpoint}/${encodeURIComponent(type)}`);
                    const typeInfoJson = await typeInfo.json();
                    types.push(typeInfoJson);
                }
            } else if (typesResponse.typeList) {
                const typeInfo = await this.fetcher.fetch(`${typesEndpoint}/${encodeURIComponent(typesResponse.typeList)}`);
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

    async getContext(typesResponse: any): Promise<any> {
        try {
            return typesResponse['@context'];
        } catch (e) {
            return null;
        }
    }

    generateShape(typeInfo: any): any {
        let shape: any;
        if (typeInfo && typeInfo.attributeDetails) {
            const expandedType = typeInfo.id;
            const encodedExpandedType: string = encodeURIComponent(expandedType);
            const shapeURI: string = this.baseUrl + "shape?type=" + encodedExpandedType;

            shape = {
                "@id": shapeURI,
                "@type": "NodeShape",
                "sh:targetClass": expandedType,
                "sh:property": []
            };

            if (typeInfo.attributeDetails) {
                for (const attr of typeInfo.attributeDetails) {
                    shape['sh:property'].push({
                        "sh:path": attr.id
                    });
                }
            }
        }

        return shape;
    }
}
