// File: controllers/categoryController.js
const Category = require("../models/Category");

exports.create = async (req, res) => {
  const category = await Category.create(req.body);
  res.json(category);
};

exports.list = async (req, res) => {
  const categories = await Category.findAll();
  res.json(categories);
};
