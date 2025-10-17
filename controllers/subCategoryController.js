// File: controllers/subCategoryController.js
const SubCategory = require("../models/SubCategory");

exports.create = async (req, res) => {
  const subCategory = await SubCategory.create(req.body);
  res.json(subCategory);
};

exports.list = async (req, res) => {
  const subCategories = await SubCategory.findAll({ include: ["Category"] });
  res.json(subCategories);
};
