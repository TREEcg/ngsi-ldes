const ComponentsManager = require('componentsjs').ComponentsManager;

start();

async function start() {
    const manager = await ComponentsManager.build({
        mainModulePath: __dirname + '/..', // Path to your npm package's root
    });
    await manager.configRegistry.register(__dirname + '/../config/config.json');
    const myInstance = await manager.instantiate('urn:ngsi-ldes-server:default:App');
    myInstance.start();
}
