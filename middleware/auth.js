const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt");

module.exports = function (req, res, next) {
  const token =
    req.headers.authorization?.split(" ")[1] || req.cookies?.adminToken;
  if (!token) return res.redirect("/admin/login");

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.redirect("/admin/login");
  }
};
