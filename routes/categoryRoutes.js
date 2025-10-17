// File: routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { create, list } = require("../controllers/categoryController");

router.post("/", auth, rbac(["admin", "editor"]), create);
router.get("/", list);

module.exports = router;
