// File: config/jwt.js
module.exports = {
  secret: process.env.JWT_SECRET || "Two_Eight_Nine_One",
  expiresIn: "7d",
};
