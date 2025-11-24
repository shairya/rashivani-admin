// File: models/Article.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const CATEGORY_STATUSES = ["Active", "Draft", "Inactive"];

const Article = sequelize.define(
  "Article",
  {
    name: DataTypes.STRING,
    sanskritTitle: DataTypes.STRING,
    deity: DataTypes.STRING,
    verseCount: DataTypes.INTEGER,
    language: DataTypes.STRING,
    languageCode: DataTypes.STRING,
    benefits: DataTypes.TEXT,
    slug: { type: DataTypes.STRING, unique: true },
    content: DataTypes.TEXT,
    tags: DataTypes.STRING,
    author: DataTypes.STRING,
    bestTime: DataTypes.STRING,
    duration: DataTypes.STRING,
    repetitions: DataTypes.STRING,
    verses: DataTypes.STRING,
    fullContent: DataTypes.STRING,
    audioUrl: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    youtubeUrl: DataTypes.STRING,
    relatedMantras: DataTypes.STRING,
    festivals: DataTypes.STRING,
    keywords: DataTypes.STRING,
    introText: DataTypes.STRING,
    metaTitle: DataTypes.STRING,
    metaDescription: DataTypes.STRING,
    ogTitle: DataTypes.STRING,
    ogDescription: DataTypes.STRING,
    ogImage: DataTypes.STRING,
    canonicalUrl: DataTypes.STRING,
    schemaType: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM(...CATEGORY_STATUSES),
      defaultValue: "Draft",
      allowNull: false,
    },
    publishDate: DataTypes.DATE,
    viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    template: DataTypes.INTEGER,
    scheduledPublishDate: { type: DataTypes.DATE, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    subCategoryId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
  }
);

module.exports = Article;
module.exports.STATUSES = CATEGORY_STATUSES;
