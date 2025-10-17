const express = require("express");
const router = express.Router();
const path = require("path");
const auth = require("../middleware/auth");

router.get("/:filename", auth, async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../private_uploads",
    req.params.filename
  );
  res.sendFile(filePath);
});
