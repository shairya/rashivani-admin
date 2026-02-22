// File: server.js
require("dotenv").config();
require("./cron/scheduler");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const express = require("express");
const session = require("express-session");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
const expressLayouts = require("express-ejs-layouts");

const app = express();
app.use(
  session({
    secret: "rashivani-secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(cors());
app.use(flash());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/subcategories", require("./routes/subCategoryRoutes"));
app.use("/api/media", require("./routes/articleMediaRoutes"));

sequelize.sync().then(() => {
  app.listen(process.env.PORT || 3001, () => {
    console.log("Server running at port 3001");
  });
});
