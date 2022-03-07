const ComponentsManager = require('componentsjs').ComponentsManager;

start();

async function start() {
    const manager = await ComponentsManager.build({
        mainModulePath: __dirname + '/..', // Path to your npm package's root
    });
    await manager.configRegistry.register(__dirname + '/../config/config-css.json');
    const myInstance = await manager.instantiate('urn:solid-server:default:App', {
        variables: {
            "urn:solid-server:default:variable:baseUrl": "http://localhost:3000/",
            "urn:solid-server:default:variable:port": "3000",
            "urn:solid-server:default:variable:loggingLevel": "info"
        }
    });
    myInstance.start();
}
