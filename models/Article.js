// File: models/Article.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
// const Category = require("./Category");
// const SubCategory = require("./SubCategory");
// const ArticleMedia = require("./ArticleMedia");

const Article = sequelize.define(
  "Article",
  {
    title: DataTypes.STRING,
    slug: { type: DataTypes.STRING, unique: true },
    content: DataTypes.TEXT,
    tags: DataTypes.STRING,
    author: DataTypes.STRING,
    status: DataTypes.ENUM("draft", "published"),
    publishDate: DataTypes.DATE,
    viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    scheduledPublishDate: { type: DataTypes.DATE, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    subCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
  }
);

// Relationships

// Article.associate = (models) => {
//   Article.belongsTo(Category, { foreignKey: "categoryId" });
//   Article.belongsTo(SubCategory, { foreignKey: "subCategoryId" });
//   Article.belongsTo(ArticleMedia, { foreignKey: "articleId" });
// };

module.exports = Article;
