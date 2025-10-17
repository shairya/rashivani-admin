// File: controllers/articleController.js
// const Article = require("../models/Article");
const { Article, Category, SubCategory } = require("../models");

exports.create = async (req, res) => {
  const article = await Article.create(req.body);
  res.json(article);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  await Article.update(req.body, { where: { id } });
  res.json({ message: "Updated" });
};

exports.list = async (req, res) => {
  const articles = await Article.findAll();
  res.json(articles);
};
