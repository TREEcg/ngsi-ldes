# NGSI-LDES
Open data API for NGSI-LD context brokers

# How does it work

NGSI-LDES applies the concept of a Linked Data Event Stream (LDES) on an NGSI-LD temporal interface.
This way, consumers can easily replicate and synchronize with the entities provided by a context broker, while increasing the scalability of the broker.

Instead of providing expensive services, such as filtering, to the consumer, NGSI-LDES splits the data into cacheable Web documents.
Such a document contains a fragment of the context broker's data and is linked with TREE hypermedia links towards other fragments.

# Requirements

- NGSI-LD temporal interface
- Support for count parameter

## Get started

Rename `.env.example` to `.env` and fill in the variables.
Note that NGSI_TYPES requires a list of types.
You need to surround the string with double quotes when running locally.
When using Docker, remove the double quotes.

Also add the correct baseUrl and port to `bin/server.js`

```
git clone git@github.com:TREEcg/ngsi-ldes.git
cd ngsi-ldes
yarn start
```

Or with Docker:
```
docker build -t ngsi-ldes .
docker run --env-file .env -p 3001:3001 -d ngsi-ldes
```
Go to `http://localhost:3001` to have a DCAT overview of LDESs.
