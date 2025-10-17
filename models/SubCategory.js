const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SubCategory = sequelize.define(
  "SubCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
  }
);

module.exports = SubCategory;
