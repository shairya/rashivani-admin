const sequelize = require("../config/db");
const Category = require("./Category");
const SubCategory = require("./SubCategory");
const Article = require("./Article");
const ArticleMedia = require("./ArticleMedia");
const User = require("./User");

// Define associations
Category.hasMany(Article, { foreignKey: "categoryId" });
SubCategory.hasMany(Article, { foreignKey: "subCategoryId" });
Category.hasMany(SubCategory, { foreignKey: "categoryId" });
SubCategory.belongsTo(Category, { foreignKey: "categoryId" });
Article.belongsTo(Category, { foreignKey: "categoryId" });
Article.belongsTo(SubCategory, { foreignKey: "subCategoryId" });
Article.hasMany(ArticleMedia, { foreignKey: "articleId" });
ArticleMedia.belongsTo(Article, { foreignKey: "articleId" });

module.exports = {
  sequelize,
  Category,
  SubCategory,
  Article,
  ArticleMedia,
  User,
};
