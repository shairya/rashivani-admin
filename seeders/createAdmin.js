// File: seeders/createAdmin.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const sequelize = require("../config/db");
const User = require("../models/User");

(async () => {
  try {
    await sequelize.sync();

    const existing = await User.findOne({ where: { username: "admin" } });
    if (existing) {
      console.log("Admin user already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash("VaniRashi@321", 10);
    await User.create({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin user created successfully.");
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    process.exit();
  }
})();
