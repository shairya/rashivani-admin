// File: cron/scheduler.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Article = require("../models/Article");

// cron.schedule("*/30 * * * *", async () => {
//   const now = new Date();
//   const articles = await Article.findAll({
//     where: {
//       status: "draft",
//       scheduledPublishDate: { [Op.lte]: now },
//     },
//   });

//   for (const article of articles) {
//     await article.update({ status: "published" });
//     console.log(`Published scheduled article: ${article.title}`);
//   }
// });
