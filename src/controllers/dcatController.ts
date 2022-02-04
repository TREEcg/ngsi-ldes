import { getConfig } from "../config/config.js";

export async function getDcatPage(req, res) {
    let md = {
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
        const encodedType = encodeURIComponent(type);
        const paginatedView = getConfig().targetURI + "/paginated?type=" + encodedType;
        const hierarchicalView = getConfig().targetURI + "/hierarchical?type=" + encodedType;
        const dataset = {
            "@id": getConfig().targetURI + "/dataset?type=" + encodedType,
            "@type": [
                "Dataset",
                "ldes:EventStream",
            ],
            "tree:view": [ paginatedView, hierarchicalView ],
            "Dataset.titel": {
                "@value": "Event Stream van ObservationCollection entiteiten",
                "@language": "nl",
            },
            "Dataset.beschrijving": {
                "@value": "Event stream van ObservationCollection entiteiten",
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

    res.type("application/ld+json; charset=utf-8");
    res.set("Cache-Control", `public, max-age=${60 * 60 * 24}`);

    res.send(md);
}
