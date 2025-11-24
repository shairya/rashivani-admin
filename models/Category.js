// File: models/Category.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CATEGORY_STATUSES = ["Active", "Draft", "Inactive"];

const Category = sequelize.define(
  "Category",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    image: { type: DataTypes.STRING },
    shortDescription: { type: DataTypes.STRING },
    fullDescription: { type: DataTypes.STRING },
    metaTitle: { type: DataTypes.STRING },
    metaDescription: { type: DataTypes.STRING },
    metaKeywords: { type: DataTypes.STRING },
    ogTitle: { type: DataTypes.STRING },
    ogDescription: { type: DataTypes.STRING },
    ogImage: { type: DataTypes.STRING },
    canonicalUrl: { type: DataTypes.STRING, unique: true },
    schemaType: { type: DataTypes.STRING },
    showInMenu: { type: DataTypes.BOOLEAN },
    status: {
      type: DataTypes.ENUM(...CATEGORY_STATUSES),
      defaultValue: "Draft",
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Category;
module.exports.STATUSES = CATEGORY_STATUSES;
