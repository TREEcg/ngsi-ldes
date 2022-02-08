import express from "express";
import { getDcatPage } from "../controllers/dcatController.js";
import { getHierarchicalPage } from "../controllers/hierarchicalViewController.js";
import { getPaginatedPage } from "../controllers/paginatedViewController.js";
import {getConfig} from "../config/config";

const router = express.Router();

router.get('/', (req, res) => {
    res.redirect(getConfig().targetURI + '/dcat');
});
router.get('/dataset', (req, res) => {
    res.redirect(getConfig().targetURI + '/dcat');
});

router.get("/dcat", getDcatPage);
router.get("/paginated", getPaginatedPage);
router.get("/hierarchical", getHierarchicalPage);

export { router };
