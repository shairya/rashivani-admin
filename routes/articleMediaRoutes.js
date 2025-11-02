// File: routes/articleMediaRoutes.js
const express = require("express");
const router = express.Router();
// const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const ArticleMedia = require("../models/ArticleMedia");
const createUploadMiddleware = require("../middleware/upload");
const upload = createUploadMiddleware("Articles");

router.post(
  "/upload/:articleId",
  auth,
  rbac(["admin", "editor"]),
  upload.array("media", 5),
  async (req, res) => {
    const { articleId } = req.params;
    const { captions = [], altTexts = [] } = req.body;

    const mediaEntries = req.files.map((file, index) => ({
      articleId,
      type: file.mimetype.startsWith("video") ? "video" : "image",
      url: `/uploads/${file.filename}`,
      caption: captions[index] || null,
      altText: altTexts[index] || null,
    }));

    await ArticleMedia.bulkCreate(mediaEntries);
    res.json({ message: "Media uploaded", files: mediaEntries });
  }
);

router.get("/:articleId", async (req, res) => {
  const media = await ArticleMedia.findAll({
    where: { articleId: req.params.articleId },
    order: [["createdAt", "DESC"]],
  });
  res.json(media);
});

// Delete media
router.delete("/:id", auth, rbac(["admin", "editor"]), async (req, res) => {
  await ArticleMedia.destroy({ where: { id: req.params.id } });
  res.json({ message: "Media deleted" });
});

// Edit media
router.put("/:id", auth, rbac(["admin", "editor"]), async (req, res) => {
  const { caption, altText } = req.body;
  await ArticleMedia.update(
    { caption, altText },
    { where: { id: req.params.id } }
  );
  res.json({ message: "Media updated" });
});

module.exports = router;
