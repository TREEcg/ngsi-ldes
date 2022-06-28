// tslint:disable-next-line:no-var-requires
import {getConfig} from "../config/config.js";

import openIdClient from "openid-client";

export default function () {
    console.log("authorization wellknown: " + getConfig().authorizationWellKnown);
    let authorizationWellKnown: string;
    if (getConfig().authorizationWellKnown !== undefined) {
        authorizationWellKnown = getConfig().authorizationWellKnown;
        return openIdClient.Issuer.discover(authorizationWellKnown);
    } else {
        throw Error("Authorization wellknown not configured properly.");
    }
}
