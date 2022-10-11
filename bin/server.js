const ComponentsManager = require('componentsjs').ComponentsManager;
const config = require('../dist/config/config.js').getConfig();

const XAPIKeyFetcher = require('../dist/utils/XAPIKeyFetcher').XAPIKeyFetcher;
const OIDCFetcher = require('../dist/utils/OIDCFetcher').OIDCFetcher;
const BasicFetcher = require('../dist/utils/BasicFetcher').BasicFetcher;

let fetcher;
if (config.enableAuthentication) {
    if (config.xApiKey) {
        fetcher = new XAPIKeyFetcher({apiKey: config.xApiKey});
    } else {
        const clientId = config.clientId;
        const clientSecret = config.clientSecret;
        const scope = config.scope;
        fetcher = new OIDCFetcher({clientId: clientId, clientSecret: clientSecret, scope: scope});
    }
} else {
    fetcher = new BasicFetcher();
}

start();

async function start() {
    const manager = await ComponentsManager.build({
        mainModulePath: __dirname + '/..', // Path to your npm package's root
        typeChecking: false,
    });
    await manager.configRegistry.register(__dirname + '/../config/config-css.json');
    const myInstance = await manager.instantiate('urn:solid-server:default:App', {
        variables: {
            "urn:solid-server:default:variable:baseUrl": config.serverBaseUrl,
            "urn:solid-server:default:variable:port": config.serverPort,
            "urn:solid-server:default:variable:loggingLevel": "debug",
            "urn:solid-server:default:variable:publicBaseUrl": config.publicBaseUrl,
            "urn:solid-server:default:fetcher": fetcher,
            'urn:solid-server:default:variable:showStackTrace': true
        }
    });
    myInstance.start();
}
