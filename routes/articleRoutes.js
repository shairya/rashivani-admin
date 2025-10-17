// File: routes/articleRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { create, update, list } = require("../controllers/articleController");

router.post("/", auth, rbac(["admin", "editor"]), create);
router.put("/:id", auth, rbac(["admin", "editor"]), update);
router.get("/", list);

router.post("/view/:id", async (req, res) => {
  const article = await Article.findByPk(req.params.id);
  if (!article) return res.status(404).json({ message: "Not found" });

  await article.increment("viewCount");
  res.json({ message: "View recorded" });
});

module.exports = router;
