// File: middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createUploadMiddleware = (type = "default") => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const category = req.body.name || "default";
      const uploadPath = path.join(
        __dirname,
        "../public/uploads",
        type,
        category
      );

      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  });

  return multer({ storage });
};

module.exports = createUploadMiddleware;
