// tslint:disable-next-line:no-var-requires
import {getConfig} from "../config/config.js";

import openIdClient from "openid-client";

export default function () {
    console.log("authorization wellknown: " + getConfig().authorizationWellKnown);
    return openIdClient.Issuer.discover(getConfig().authorizationWellKnown);
}
