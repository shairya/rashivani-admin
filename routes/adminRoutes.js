// File: routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rbac = require("../middleware/rbac");
const { Article, Category, SubCategory } = require("../models");
const slugify = require("slugify");
const ArticleMedia = require("../models/ArticleMedia");
const User = require("../models/User");
const { fn, col, Op } = require("sequelize");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { secret } = require("../config/jwt");
// const upload = require("../middleware/upload");
const createUploadMiddleware = require("../middleware/upload");
const uploadCategoryImages = createUploadMiddleware("Categories");
const uploadSubcategoryImages = createUploadMiddleware("SubCategories");
const uploadArticleImages = createUploadMiddleware("Articles");

router.get("/", auth, rbac(["admin"]), async (req, res) => {
  const userCount = await User.count();
  const articleCount = await Article.count();
  const categoryCount = await Category.count();
  const subCategoryCount = await SubCategory.count();

  const statusStats = await Article.findAll({
    attributes: ["status", [fn("COUNT", col("status")), "count"]],
    group: ["status"],
    raw: true,
  });

  res.render("dashboard", {
    layout: "layout",
    title: "Dashboard",
    active: "dashboard",
    hideSidebar: false,
    user: req.user,
    stats: {
      userCount,
      articleCount,
      categoryCount,
      subCategoryCount,
      statusStats,
    },
  });
});

// Categories
router.get("/categories", auth, rbac(["admin"]), async (req, res) => {
  const categories = await Category.findAll();
  res.render("categories/list", {
    layout: "layout",
    title: "Categories",
    active: "categories",
    hideSidebar: false,
    categories,
  });
});

router.get("/categories/new", auth, rbac(["admin"]), (req, res) => {
  res.render("categories/form", {
    layout: "layout",
    title: "Create Category",
    hideSidebar: false,
    category: null,
    active: "categories",
  });
});

router.get("/categories/edit/:id", auth, rbac(["admin"]), async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  res.render("categories/form", {
    layout: "layout",
    title: "Edit Category",
    hideSidebar: false,
    category,
    active: "categories",
  });
});

router.post(
  "/categories/save",
  uploadCategoryImages.fields([
    { name: "image", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
  ]),
  auth,
  rbac(["admin"]),
  async (req, res) => {
    try {
      const {
        id,
        name,
        shortDescription,
        fullDescription,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogTitle,
        ogDescription,
        canonicalUrl,
        schemaType,
        status,
      } = req.body;
      const slug = slugify(name, { lower: true });

      // Extract file paths
      const imagePath = req.files.image?.[0]?.originalname
        ? `/uploads/Categories/${name}/${req.files.image[0].originalname}`
        : null;

      const ogImagePath = req.files.ogImage?.[0]?.originalname
        ? `/uploads/Categories/${name}/${req.files.ogImage[0].originalname}`
        : null;

      // Prepare data
      const categoryData = {
        name,
        slug,
        shortDescription,
        fullDescription,
        metaTitle,
        metaDescription,
        metaKeywords,
        ogTitle,
        ogDescription,
        canonicalUrl,
        schemaType,
        status,
        image: imagePath,
        ogImage: ogImagePath,
      };

      // Save to DB
      if (id) {
        await Category.update(categoryData, { where: { id } });
      } else {
        await Category.create(categoryData);
      }

      req.flash("success", "Category saved successfully!");
      res.redirect("/admin/categories");
    } catch (error) {
      console.error("Error saving category:", error);
      req.flash("error", "Failed to save category.");
      res.redirect("/admin/categories");
    }
  }
);

// SubCategories
router.get("/subcategories", auth, rbac(["admin"]), async (req, res) => {
  let subcategories = [];

  try {
    subcategories = await SubCategory.findAll({
      include: [Category],
      order: [["createdAt", "DESC"]],
    });
    console.log(subcategories);
  } catch (error) {
    console.log(error);
  }

  res.render("subcategories/list", {
    layout: "layout",
    title: "Sub Categories",
    hideSidebar: false,
    active: "Dashboard",
    subcategories,
  });
});

router.get("/subcategories/new", auth, rbac(["admin"]), async (req, res) => {
  const categories = await Category.findAll();
  res.render("subcategories/form", {
    layout: "layout",
    title: "Create Sub Category",
    active: "subcategories",
    subcategory: null,
    categories,
    hideSidebar: false,
  });
});

router.get(
  "/subcategories/edit/:id",
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const subcategory = await SubCategory.findByPk(req.params.id);
    const categories = await Category.findAll();
    res.render("subcategories/form", {
      layout: "layout",
      title: "Edit Sub Category",
      subcategory,
      categories,
      active: "subcategories",
      hideSidebar: false,
    });
  }
);

router.post(
  "/subcategories/save",
  uploadSubcategoryImages.fields([
    { name: "image", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
  ]),
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const {
      id,
      name,
      categoryId,
      shortDescription,
      fullDescription,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogTitle,
      ogDescription,
      canonicalUrl,
      schemaType,
      status,
    } = req.body;
    const slug = slugify(name, { lower: true });
    // Extract file paths
    const imagePath = req.files.image?.[0]?.originalname
      ? `/uploads/Sub-categories/${name}/${req.files.image[0].originalname}`
      : null;

    const ogImagePath = req.files.ogImage?.[0]?.originalname
      ? `/uploads/Sub-categories/${name}/${req.files.ogImage[0].originalname}`
      : null;

    if (id) {
      try {
        await SubCategory.update(
          {
            name,
            slug,
            categoryId,
            shortDescription,
            fullDescription,
            metaTitle,
            metaDescription,
            metaKeywords,
            ogTitle,
            ogDescription,
            canonicalUrl,
            schemaType,
            status,
            image: imagePath,
            ogImage: ogImagePath,
          },
          { where: { id } }
        );
      } catch (err) {
        console.log(err);
      }
    } else {
      try {
        await SubCategory.create({
          name,
          slug,
          categoryId,
          shortDescription,
          fullDescription,
          metaTitle,
          metaDescription,
          metaKeywords,
          ogTitle,
          ogDescription,
          canonicalUrl,
          schemaType,
          status,
          image: imagePath,
          ogImage: ogImagePath,
        });
      } catch (err) {
        console.log(err);
      }
    }
    req.flash("success", "SubCategory saved successfully!");
    res.redirect("/admin/subcategories");
  }
);

// Articles
router.get("/articles", auth, rbac(["admin", "editor"]), async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "DESC",
  } = req.query;
  const offset = (page - 1) * limit;

  const where = {}; // Add filters as before

  if (req.query.q && req.query.q.trim() !== "") {
    where.name = { [Op.like]: `%${req.query.q.trim()}%` };
  }

  if (req.query.status && req.query.status !== "") {
    where.status = req.query.status;
  }

  if (req.query.categoryId && req.query.categoryId !== "") {
    where.categoryId = req.query.categoryId;
  }

  if (req.query.subCategoryId && req.query.subCategoryId !== "") {
    where.subCategoryId = req.query.subCategoryId;
  }

  const { rows: articles, count } = await Article.findAndCountAll({
    where,
    include: [{ model: Category }, { model: SubCategory }],
    order: [[sort, order]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    logging: console.log,
  });

  const totalPages = Math.ceil(count / limit);
  const categories = await Category.findAll();
  const subcategories = await SubCategory.findAll();

  res.render("articles/list", {
    layout: "layout",
    title: "Articles",
    active: "articles",
    articles,
    categories,
    subcategories,
    filters: req.query,
    pagination: { page: parseInt(page), totalPages, limit },
    hideSidebar: false,
  });
});

router.get(
  "/articles/new",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const categories = await Category.findAll();
    const subcategories = await SubCategory.findAll();
    const media = await ArticleMedia.findAll({ logging: console.log });
    res.render("articles/form", {
      layout: "layout",
      title: "Create Article",
      active: "articles",
      article: null,
      categories,
      subcategories,
      media,
      hideSidebar: false,
    });
  }
);

router.get(
  "/articles/edit/:id",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const article = await Article.findByPk(req.params.id);
    const categories = await Category.findAll();
    const subcategories = await SubCategory.findAll();
    const media = await ArticleMedia.findAll({ logging: console.log });
    res.render("articles/form", {
      layout: "layout",
      title: "Edit Article",
      article,
      categories,
      subcategories,
      media,
      active: "articles",
      hideSidebar: false,
    });
  }
);

router.post(
  "/articles/save",
  uploadArticleImages.fields([
    { name: "imageUrl", maxCount: 1 },
    { name: "ogImage", maxCount: 1 },
  ]),
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const { scheduledPublishDate, ...rest } = req.body;
    const publishDate = scheduledPublishDate || rest.publishDate;
    const {
      id,
      name,
      sanskritTitle,
      deity,
      author,
      verseCount,
      language,
      languageCode,
      benefits,
      content,
      bestTime,
      duration,
      repetitions,
      verses,
      fullContent,
      audioUrl,
      youtubeUrl,
      relatedMantras,
      festivals,
      tags,
      status,
      categoryId,
      subCategoryId,
      keywords,
      introText,
      metaTitle,
      metaDescription,
      ogTitle,
      ogDescription,
      canonicalUrl,
      schemaType,
    } = req.body;
    const slug = slugify(name, { lower: true });

    // Extract file paths
    const imagePath = req.files.imageUrl?.[0]?.originalname
      ? `/uploads/Articles/${name}/${req.files.imageUrl[0].originalname}`
      : null;

    const ogImagePath = req.files.ogImage?.[0]?.originalname
      ? `/uploads/Articles/${name}/${req.files.ogImage[0].originalname}`
      : null;

    if (id) {
      try {
        await Article.update(
          {
            name,
            sanskritTitle,
            deity,
            author,
            verseCount,
            language,
            languageCode,
            benefits,
            slug,
            content,
            bestTime,
            duration,
            repetitions,
            verses,
            fullContent,
            audioUrl,
            imageUrl: imagePath,
            youtubeUrl,
            relatedMantras,
            festivals,
            tags,
            status,
            publishDate,
            categoryId,
            subCategoryId,
            scheduledPublishDate,
            keywords,
            introText,
            metaTitle,
            metaDescription,
            ogTitle,
            ogDescription,
            ogImage: ogImagePath,
            canonicalUrl,
            schemaType,
          },
          { where: { id } }
        );
      } catch (err) {
        console.log(err);
      }
    } else {
      await Article.create({
        name,
        slug,
        sanskritTitle,
        deity,
        content,
        bestTime,
        duration,
        repetitions,
        verses,
        verseCount,
        language,
        languageCode,
        benefits,
        fullContent,
        audioUrl,
        imageUrl: imagePath,
        youtubeUrl,
        relatedMantras,
        festivals,
        tags,
        author,
        status,
        publishDate,
        categoryId,
        subCategoryId,
        scheduledPublishDate,
        keywords,
        introText,
        metaTitle,
        metaDescription,
        ogTitle,
        ogDescription,
        ogImage: ogImagePath,
        canonicalUrl,
        schemaType,
      });
    }
    req.flash("success", "Article saved successfully!");
    res.redirect("/admin/articles");
  }
);

router.get(
  "/articles/edit/:id",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const article = await Article.findByPk(req.params.id);
    const categories = await Category.findAll();
    const subcategories = await SubCategory.findAll();
    const media = await ArticleMedia.findAll({
      where: { articleId: article.id },
    });

    res.render("articles/form", {
      layout: "layout",
      title: "Edit Article",
      article,
      categories,
      subcategories,
      media,
      hideSidebar: false,
    });
  }
);

router.post(
  "/articles/toggle-status/:id",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).send("Article not found");

    const newStatus = article.status === "draft" ? "published" : "draft";
    await article.update({ status: newStatus });

    res.redirect("/admin/articles");
  }
);

router.post(
  "/articles/bulk-action",
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const { action, selectedIds = [] } = req.body;

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.redirect("/admin/articles");
    }

    if (action === "delete") {
      await Article.destroy({ where: { id: selectedIds } });
    } else if (action === "publish") {
      await Article.update(
        { status: "published" },
        { where: { id: selectedIds } }
      );
    }

    res.redirect("/admin/articles");
  }
);

// Login
router.get("/login", (req, res) => {
  res.render("login", {
    layout: "layout",
    title: "Login",
    active: "Login",
    hideSidebar: true,
    error: null,
  });
});

router.post("/login", async (req, res) => {
  const { username, password, remember } = req.body;
  const user = await User.findOne({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!["admin", "editor"].includes(user.role)) {
    return res.render("login", {
      layout: "layout",
      title: "Login",
      error: "Access denied",
      hideSidebar: true,
    });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, secret, {
    expiresIn: "7d",
  });
  res.cookie("adminToken", token, {
    httpOnly: true,
    maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : null, // 7 days if "Remember Me" is checked
  });

  res.redirect("/admin");
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("adminToken");
  res.redirect("/admin/login");
});

// Registration
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existing = await User.findOne({ where: { username } });

  if (existing)
    return res.status(409).json({ message: "Username already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    password: hashedPassword,
    role: "user",
  });

  const token = jwt.sign({ id: user.id, role: user.role }, secret, {
    expiresIn,
  });
  res.json({ token, role: user.role });
});

// User Managements
router.get("/users", auth, rbac(["admin"]), async (req, res) => {
  const users = await User.findAll({ order: [["createdAt", "DESC"]] });
  res.render("users/list", {
    layout: "layout",
    title: "Users",
    users,
    hideSidebar: false,
  });
});

// CSV
router.get("/export/articles/csv", auth, rbac(["admin"]), async (req, res) => {
  const articles = await Article.findAll({ raw: true });
  const parser = new Parser();
  const csv = parser.parse(articles);

  res.header("Content-Type", "text/csv");
  res.attachment("articles.csv");
  res.send(csv);
});

router.get("/export/users/pdf", auth, rbac(["admin"]), async (req, res) => {
  const users = await User.findAll({ raw: true });
  const doc = new PDFDocument();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=users.pdf");
  doc.pipe(res);

  doc.fontSize(18).text("User List", { align: "center" });
  doc.moveDown();

  users.forEach((user) => {
    doc.fontSize(12).text(`Username: ${user.username} | Role: ${user.role}`);
  });

  doc.end();
});

module.exports = router;
