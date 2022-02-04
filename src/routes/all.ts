import express from "express";
import { getDcatPage } from "../controllers/dcatController.js";
import { getHierarchicalPage } from "../controllers/hierarchicalViewController.js";
import { getPaginatedPage } from "../controllers/paginatedViewController.js";

const router = express.Router();

router.get('/', (req, res) => {
    res.redirect('/dcat');
});
router.get('/dataset', (req, res) => {
    res.redirect('/dcat');
});

router.get("/dcat", getDcatPage);
router.get("/paginated", getPaginatedPage);
router.get("/hierarchical", getHierarchicalPage);

export { router };
