const ComponentsManager = require('componentsjs').ComponentsManager;
require('dotenv').config()
const baseUrl = process.env.BASE_URL ? process.env.BASE_URL : "http://localhost:3001/";
const port = process.env.PORT ? process.env.PORT : "3001";

start();

async function start() {
    const manager = await ComponentsManager.build({
        mainModulePath: __dirname + '/..', // Path to your npm package's root
    });
    await manager.configRegistry.register(__dirname + '/../config/config-css.json');
    const myInstance = await manager.instantiate('urn:solid-server:default:App', {
        variables: {
            "urn:solid-server:default:variable:baseUrl": baseUrl,
            "urn:solid-server:default:variable:port": port,
            "urn:solid-server:default:variable:loggingLevel": "info"
        }
    });
    myInstance.start();
}
