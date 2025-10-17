// File: models/Category.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
// const Article = require("./Article"); // ✅ Import Article model

const Category = sequelize.define(
  "Category",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
  },
  {
    timestamps: true,
  }
);

// ✅ Define association AFTER model definition
// Category.hasMany(Article, { foreignKey: "categoryId" });

module.exports = Category;
