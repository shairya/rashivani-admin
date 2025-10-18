// File: models/Article.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Article = sequelize.define(
  "Article",
  {
    title: DataTypes.STRING,
    sanskritTitle: DataTypes.STRING,
    deity: DataTypes.STRING,
    verseCount: DataTypes.INTEGER,
    language: DataTypes.STRING,
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

module.exports = Article;
