// File: models/ArticleMedia.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Article = require("./Article");

const ArticleMedia = sequelize.define(
  "ArticleMedia",
  {
    type: { type: DataTypes.ENUM("image", "video"), allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    caption: DataTypes.STRING,
    altText: DataTypes.STRING,
  },
  {
    timestamps: true,
  }
);

ArticleMedia.associate = (models) => {
  ArticleMedia.belongsTo(models.Article, { foreignKey: "articleId" });
};

module.exports = ArticleMedia;
