// File: models/User.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    username: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: {
      type: DataTypes.ENUM("admin", "editor", "user"),
      defaultValue: "user",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User;
