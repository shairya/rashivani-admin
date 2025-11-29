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

const uploadCsv = (type = "default") => {
  const storage = multer.diskStorage({
    limits: { fileSize: 5 * 1024 * 1024 },
    destination: function (req, file, cb) {
      const category = req.body.name || "default";
      const uploadPath = path.join(
        __dirname,
        "../public/uploads/csv",
        type,
        category
      );

      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        cb(null, true);
      } else {
        cb(new Error("Only CSV files are allowed"));
      }
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  });

  return multer({ storage });
};

module.exports = uploadCsv;
module.exports = createUploadMiddleware;
