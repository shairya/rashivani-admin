// File: server.js
require("dotenv").config();
require("./cron/scheduler");
const express = require("express");
// const sequelize = require("./config/db");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/subcategories", require("./routes/subCategoryRoutes"));
app.use("/api/media", require("./routes/articleMediaRoutes"));

sequelize.sync().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log("Server running...");
  });
});
