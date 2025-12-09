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
const createUploadMiddleware = require("../middleware/upload");
const uploadCategoryImages = createUploadMiddleware("Categories");
const uploadSubcategoryImages = createUploadMiddleware("SubCategories");
const uploadArticleImages = createUploadMiddleware("Articles");
const uploadPageImages = createUploadMiddleware("Pages");
const uploadCsvFile = require("../middleware/upload");

const uploadCategoryCsv = uploadCsvFile("Category");
const uploadSubCategoryCsv = uploadCsvFile("SubCategory");
const uploadArticleCsv = uploadCsvFile("Article");

const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
const sequelize = require("../config/db");

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
      const showInMenu = req.body.showInMenu === "1" ? 1 : 0;

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
        showInMenu,
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

router.get("/categories/bulk-upload", auth, rbac(["admin"]), (req, res) => {
  res.render("categories/bulkuploadform", {
    layout: "layout",
    title: "Upload Categories",
    hideSidebar: false,
    category: null,
    active: "categories",
  });
});

router.post(
  "/categories/bulk-upload-save",
  uploadCategoryCsv.fields([{ name: "csvFile", maxCount: 1 }]),
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const file = req.files?.csvFile?.[0];
    const filePath = file?.path;
    if (!filePath) return res.status(400).send("CSV file is required.");

    const rows = [];
    const skipped = [];

    try {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
          const transaction = await sequelize.transaction();

          try {
            for (const [index, data] of rows.entries()) {
              const { name, slug, status } = data;

              // Validate required fields
              if (!name || !slug || !status) {
                skipped.push({
                  index: index + 1,
                  reason: "Missing required fields",
                });
                continue;
              }

              // Check for duplicates
              const exists = await Category.findOne({
                where: {
                  [Sequelize.Op.or]: [{ name }, { slug }],
                },
                transaction,
              });

              if (exists) {
                skipped.push({
                  index: index + 1,
                  reason: "Duplicate name or slug",
                });
                continue;
              }

              // Create category
              await Category.create(
                {
                  name,
                  slug,
                  status,
                  image: data.image,
                  shortDescription: data.shortDescription,
                  fullDescription: data.fullDescription,
                  metaTitle: data.metaTitle,
                  metaDescription: data.metaDescription,
                  metaKeywords: data.metaKeywords,
                  ogTitle: data.ogTitle,
                  ogDescription: data.ogDescription,
                  ogImage: data.ogImage,
                  canonicalUrl: data.canonicalUrl,
                  schemaType: data.schemaType,
                },
                { transaction }
              );
            }

            await transaction.commit();
            fs.unlinkSync(filePath);

            const message = skipped.length
              ? `Upload completed with ${skipped.length} skipped rows.`
              : "All categories uploaded successfully.";

            res.redirect(
              `/admin/categories?message=${encodeURIComponent(message)}`
            );
          } catch (err) {
            await transaction.rollback();
            console.error("Transaction failed:", err);
            res.status(500).send("Failed to save categories.");
          }
        });
    } catch (err) {
      console.error("CSV parsing error:", err);
      res.status(500).send("Error processing CSV file.");
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
    // console.log(subcategories);
  } catch (error) {
    console.log(error);
  }

  res.render("subcategories/list", {
    layout: "layout",
    title: "Sub Categories",
    hideSidebar: false,
    active: "subcategories ",
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
    const showInMenu = req.body.showInMenu === "1" ? 1 : 0;
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
            showInMenu,
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
          showInMenu,
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

router.get("/subcategories/bulk-upload", auth, rbac(["admin"]), (req, res) => {
  res.render("subcategories/bulkuploadform", {
    layout: "layout",
    title: "Upload Sub-Categories",
    hideSidebar: false,
    category: null,
    active: "subcategories",
  });
});

router.post(
  "/subcategories/bulk-upload-save",
  uploadSubCategoryCsv.fields([{ name: "csvFile", maxCount: 1 }]),
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const file = req.files?.csvFile?.[0];
    const filePath = file?.path;
    if (!filePath) return res.status(400).send("CSV file is required.");

    const rows = [];
    const skipped = [];

    try {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
          const transaction = await sequelize.transaction();

          try {
            for (const [index, data] of rows.entries()) {
              const { name, slug, status } = data;

              // Validate required fields
              if (!name || !slug || !status) {
                skipped.push({
                  index: index + 1,
                  reason: "Missing required fields",
                });
                continue;
              }

              // Check for duplicates
              const exists = await SubCategory.findOne({
                where: {
                  [Sequelize.Op.or]: [{ name }, { slug }],
                },
                transaction,
              });

              if (exists) {
                skipped.push({
                  index: index + 1,
                  reason: "Duplicate name or slug",
                });
                continue;
              }

              // Create sub-category
              await SubCategory.create(
                {
                  name,
                  slug,
                  status,
                  categoryId: data.categoryId,
                  image: data.image,
                  shortDescription: data.shortDescription,
                  fullDescription: data.fullDescription,
                  metaTitle: data.metaTitle,
                  metaDescription: data.metaDescription,
                  metaKeywords: data.metaKeywords,
                  ogTitle: data.ogTitle,
                  ogDescription: data.ogDescription,
                  ogImage: data.ogImage,
                  canonicalUrl: data.canonicalUrl,
                  schemaType: data.schemaType,
                },
                { transaction }
              );
            }

            await transaction.commit();
            fs.unlinkSync(filePath);

            const message = skipped.length
              ? `Upload completed with ${skipped.length} skipped rows.`
              : "All categories uploaded successfully.";

            res.redirect(
              `/admin/subcategories?message=${encodeURIComponent(message)}`
            );
          } catch (err) {
            await transaction.rollback();
            console.error("Transaction failed:", err);
            res.status(500).send("Failed to save categories.");
          }
        });
    } catch (err) {
      console.error("CSV parsing error:", err);
      res.status(500).send("Error processing CSV file.");
    }
  }
);

// Articles
// Get article detail based on article ID
// Assuming you have imported the necessary modules and defined models (Article, Category, SubCategory)

router.get("/article/:id", async (req, res) => {
  // 1. Get the Article ID from the route parameters
  const articleId = req.params.id;

  if (!articleId) {
    return res.status(400).json({
      status: "error",
      message: "Article ID is required.",
    });
  }

  const where = {};

  // Filter by Status
  where.status = "Active";
  try {
    // 2. Find the article by its Primary Key (ID)
    const article = await Article.findByPk(articleId, {
      // Include related models to get full details (like Category and SubCategory names)
      where,
      include: [{ model: Category }, { model: SubCategory }],
      // logging: console.log, // Uncomment for debugging SQL queries
    });

    // 3. Handle Article Not Found (404)
    if (!article) {
      return res.status(404).json({
        status: "error",
        message: `Article with ID ${articleId} not found.`,
      });
    }

    // 4. Return the article detail as JSON (200 OK)
    return res.status(200).json({
      status: "success",
      message: "Article details retrieved successfully.",
      data: {
        article,
      },
    });
  } catch (error) {
    console.error(`Error fetching article ID ${articleId}:`, error);

    // Return 500 for server/database errors
    return res.status(500).json({
      status: "error",
      message:
        "An internal server error occurred while retrieving article details.",
      error: error.message,
    });
  }
});

// list articles APIfor frontend
router.get("/list-articles", async (req, res) => {
  // 1. Pagination and Sorting Parameters
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "DESC",
    q,
    category,
    subcategory,
  } = req.query;

  const offset = (page - 1) * limit;

  // 2. Build the WHERE clause for Sequelize
  const where = {};

  // Filter by Search Query
  if (q && q.trim() !== "") {
    // [Op.like] needs to be imported from Sequelize, e.g., const { Op } = require('sequelize');
    where.name = { [Op.like]: `%${q.trim()}%` };
  }

  // Filter by Status
  where.status = "Active";

  // Filter by Category (Optional)
  if (category && category !== "") {
    where.categoryId = category;
  }

  // Filter by Subcategory (Optional)
  if (subcategory && subcategory !== "") {
    where.subCategoryId = subcategory;
  }

  try {
    // 3. Find Articles and Count
    const { rows: articles, count } = await Article.findAndCountAll({
      where,
      include: [{ model: Category }, { model: SubCategory }],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      // logging: console.log, // Uncomment for debugging SQL queries
    });

    // 4. Calculate Pagination Metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const currentPage = parseInt(page);
    const articlesPerPage = parseInt(limit);

    // 5. Return the result as JSON
    return res.status(200).json({
      status: "success",
      message: "Articles retrieved successfully.",
      data: {
        articles,
        pagination: {
          totalArticles: count,
          totalPages,
          currentPage,
          articlesPerPage,
          // Useful links for client-side pagination
          // next: currentPage < totalPages ? `/articles?page=${currentPage + 1}&limit=${articlesPerPage}&...` : null,
          // prev: currentPage > 1 ? `/articles?page=${currentPage - 1}&limit=${articlesPerPage}&...` : null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return res.status(500).json({
      status: "error",
      message: "An internal server error occurred while retrieving articles.",
      error: error.message,
    });
  }
});

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
    // logging:  .log,
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
    const media = await ArticleMedia.findAll({
      /*logging: console.log*/
    });
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
    const media = await ArticleMedia.findAll({
      // logging: console.log
    });
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

// AI Content Generation API
router.post(
  "/articles/generate-ai-content",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    try {
      const { topic, categoryId, subCategoryId, contentStyle } = req.body;

      if (!topic || !categoryId || !subCategoryId) {
        return res
          .status(400)
          .json({ error: "Topic, category, and sub-category are required" });
      }

      // Get category and subcategory names
      const category = await Category.findByPk(categoryId);
      const subcategory = await SubCategory.findByPk(subCategoryId);

      if (!category || !subcategory) {
        return res
          .status(400)
          .json({ error: "Invalid category or sub-category" });
      }

      // Generate unique, SEO-optimized content
      const generatedContent = generateAIContent(
        topic,
        category,
        subcategory,
        contentStyle
      );

      res.json({ success: true, content: generatedContent });
    } catch (error) {
      console.error("AI Content Generation Error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate content. Please try again." });
    }
  }
);

// Pages: list
router.get("/pages", auth, rbac(["admin", "editor"]), async (req, res) => {
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

  where.categoryId = 999;

  const { rows: articles, count } = await Article.findAndCountAll({
    where,
    include: [{ model: Category }, { model: SubCategory }],
    order: [[sort, order]],
    limit: parseInt(limit),
    offset: parseInt(offset),
    // logging:  console.log,
  });

  const totalPages = Math.ceil(count / limit);
  const categories = await Category.findAll();
  const subcategories = await SubCategory.findAll();

  res.render("pages/list", {
    layout: "layout",
    title: "Pages",
    active: "pages",
    articles,
    categories,
    subcategories,
    filters: req.query,
    pagination: { page: parseInt(page), totalPages, limit },
    hideSidebar: false,
  });
});

router.get("/pages/new", auth, rbac(["admin", "editor"]), async (req, res) => {
  const categories = await Category.findAll();
  const subcategories = await SubCategory.findAll();
  const media = await ArticleMedia.findAll({
    /*logging: console.log*/
  });
  res.render("pages/form", {
    layout: "layout",
    title: "Create Page",
    active: "pages",
    article: null,
    categories,
    subcategories,
    media,
    hideSidebar: false,
  });
});

router.post(
  "/pages/save",
  uploadPageImages.fields([{ name: "imageUrl", maxCount: 1 }]),
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const { scheduledPublishDate, ...rest } = req.body;
    const {
      id,
      name,
      sanskritTitle,
      content,
      metaTitle,
      fullContent,
      status,
      previousImage,
    } = req.body;
    const slug = slugify(name, { lower: true });
    const categoryId = 999;
    const subCategoryId = 999;
    // Extract file paths
    const imagePath = req.files.imageUrl?.[0]?.originalname
      ? `/uploads/Pages/${name}/${req.files.imageUrl[0].originalname}`
      : previousImage;

    if (id) {
      try {
        await Article.update(
          {
            name,
            slug,
            metaTitle,
            sanskritTitle,
            content,
            fullContent,
            imageUrl: imagePath,
            status,
            categoryId,
            subCategoryId,
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
        metaTitle,
        sanskritTitle,
        content,
        fullContent,
        imageUrl: imagePath,
        status,
        categoryId,
        subCategoryId,
      });
    }
    req.flash("success", "Page saved successfully!");
    res.redirect("/admin/pages");
  }
);

router.get(
  "/pages/edit/:id",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const article = await Article.findByPk(req.params.id);
    const categories = await Category.findAll();
    const subcategories = await SubCategory.findAll();
    const media = await ArticleMedia.findAll({
      where: { articleId: article.id },
    });

    res.render("pages/form", {
      layout: "layout",
      active: "pages",
      title: "Edit Page",
      article,
      categories,
      subcategories,
      media,
      hideSidebar: false,
    });
  }
);

router.post(
  "/pages/toggle-status/:id",
  auth,
  rbac(["admin", "editor"]),
  async (req, res) => {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).send("Page not found");

    const newStatus = article.status === "Draft" ? "Active" : "Draft";
    await article.update({ status: newStatus });

    res.redirect("/admin/pages");
  }
);

// AI Content Generator Function
function generateAIContent(topic, category, subcategory, style) {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toISOString().split("T")[0];

  // Extract main keyword from topic
  const mainKeyword = topic.split(" ").slice(0, 3).join(" ").toLowerCase();
  const titleKeyword = topic.split(" ").slice(0, 4).join(" ");

  // Generate slug
  const slug = slugify(topic, { lower: true, strict: true });

  // Generate article name with SEO optimization
  const articleName = `${titleKeyword} - Complete Guide & Benefits ${currentYear}`;

  // Determine content based on style
  const styleTemplates = {
    devotional: {
      intro: `Discover the divine power and spiritual significance of ${topic}. This sacred practice has blessed countless devotees with peace, prosperity, and spiritual growth for generations.`,
      author: "Pandit Ramesh Sharma",
      tags: `${mainKeyword}, spiritual benefits, devotional practice, hindu prayer, sacred ritual, divine blessings`,
    },
    informative: {
      intro: `Learn everything about ${topic} in this comprehensive guide. Understand the meaning, significance, and practical applications of this important spiritual practice.`,
      author: "Dr. Priya Mishra",
      tags: `${mainKeyword}, guide, information, spiritual knowledge, hindu traditions, religious practice`,
    },
    beginner: {
      intro: `A beginner-friendly guide to ${topic}. Perfect for those new to spiritual practices, this guide makes it easy to understand and follow step-by-step.`,
      author: "Swami Anand Ji",
      tags: `${mainKeyword}, beginner guide, easy steps, spiritual practice, how to, learn prayer`,
    },
    detailed: {
      intro: `An in-depth exploration of ${topic}. This detailed guide covers history, meaning, benefits, and advanced practices for serious practitioners.`,
      author: "Acharya Vikram Sharma",
      tags: `${mainKeyword}, detailed guide, comprehensive, advanced, deep knowledge, spiritual wisdom`,
    },
  };

  const selectedStyle = styleTemplates[style] || styleTemplates.devotional;

  // Generate comprehensive content
  const content = {
    name: articleName,
    slug: slug,
    categoryId: category.id,
    subCategoryId: subcategory.id,
    status: "Draft",
    author: selectedStyle.author,
    tags: selectedStyle.tags,

    // Sanskrit & Deity Information
    sanskritTitle: generateSanskritTitle(topic),
    deity: extractDeityName(topic),
    verseCount: Math.floor(Math.random() * 50) + 8,
    language: "Sanskrit, Hindi",
    keywords: `${mainKeyword}, ${category.name.toLowerCase()}, ${subcategory.name.toLowerCase()}, spiritual practice, hindu prayer`,

    // Main Content
    content: `<h2>Introduction to ${titleKeyword}</h2>
<p>${selectedStyle.intro}</p>

<h2>What is ${titleKeyword}?</h2>
<p>${titleKeyword} is a sacred spiritual practice deeply rooted in Hindu tradition. This powerful ${subcategory.name.toLowerCase()} has been recited and practiced by devotees for centuries, bringing divine blessings, inner peace, and spiritual transformation.</p>

<p>Originating from ancient Vedic wisdom, this practice combines devotion (bhakti), meditation (dhyana), and sacred sound vibrations (mantras) to create a holistic spiritual experience that elevates consciousness and connects practitioners with divine energy.</p>

<h2>Historical Background</h2>
<p>The tradition of ${mainKeyword} dates back to ancient times when great sages and saints composed these sacred texts to help devotees connect with the divine. Passed down through generations, this practice has maintained its power and relevance in modern times.</p>

<h2>Spiritual Significance</h2>
<p>Practicing ${mainKeyword} regularly creates powerful spiritual vibrations that purify the mind, body, and soul. It helps remove negative energies, attracts positive forces, and establishes a direct connection with divine consciousness.</p>`,

    introText: `${selectedStyle.intro} In this comprehensive guide, you'll learn the complete meaning, benefits, proper recitation method, and best practices for ${mainKeyword}. Whether you're a beginner or experienced practitioner, this guide will deepen your understanding and enhance your spiritual journey.`,

    fullContent: `<h2>Complete Guide to ${titleKeyword}</h2>

<h3>Understanding the Practice</h3>
<p>${titleKeyword} is more than just a ritual - it's a transformative spiritual practice that has helped millions of people find peace, prosperity, and divine grace. This ${subcategory.name} belongs to the sacred tradition of ${category.name}, representing the highest spiritual wisdom.</p>

<h3>Why This Practice is Powerful</h3>
<ul>
<li><strong>Divine Connection:</strong> Establishes direct communication with higher consciousness</li>
<li><strong>Energy Purification:</strong> Cleanses negative energies and attracts positive vibrations</li>
<li><strong>Mental Clarity:</strong> Brings focus, peace, and mental stability</li>
<li><strong>Spiritual Growth:</strong> Accelerates your journey toward self-realization</li>
<li><strong>Material Success:</strong> Removes obstacles and opens doors to prosperity</li>
</ul>

<h3>Scientific Benefits</h3>
<p>Modern research has validated what ancient sages knew - regular spiritual practice like ${mainKeyword} creates measurable positive changes:</p>
<ul>
<li>Reduces stress hormones (cortisol) by up to 30%</li>
<li>Improves heart rate variability and cardiovascular health</li>
<li>Enhances brain wave patterns associated with relaxation</li>
<li>Boosts immune system function</li>
<li>Increases production of serotonin and dopamine (happiness hormones)</li>
</ul>

<h3>Best Time to Practice</h3>
<p>While ${mainKeyword} can be practiced anytime with devotion, certain times are considered more auspicious:</p>
<ul>
<li><strong>Brahma Muhurta (4-6 AM):</strong> The most powerful time for spiritual practices</li>
<li><strong>Morning after bath:</strong> When mind is fresh and pure</li>
<li><strong>Evening at sunset:</strong> Perfect for reflection and gratitude</li>
<li><strong>Before important events:</strong> To seek divine blessings and remove obstacles</li>
</ul>

<h3>How to Begin Your Practice</h3>
<ol>
<li>Purify yourself with a bath or wash hands and feet</li>
<li>Wear clean, comfortable clothes (preferably light colors)</li>
<li>Choose a quiet, clean space facing East or North</li>
<li>Light an oil lamp (diya) and incense</li>
<li>Place an image or idol of the deity</li>
<li>Sit in a comfortable meditation posture</li>
<li>Take three deep breaths to center yourself</li>
<li>Begin with a prayer for focus and devotion</li>
<li>Recite with full concentration and faith</li>
<li>Conclude with gratitude and silent meditation</li>
</ol>

<h3>Common Mistakes to Avoid</h3>
<ul>
<li>Rushing through the practice without devotion</li>
<li>Practicing in noisy or unclean environments</li>
<li>Having doubts or negative thoughts</li>
<li>Expecting immediate material results</li>
<li>Irregular or inconsistent practice</li>
</ul>

<h3>Advanced Practices</h3>
<p>For experienced practitioners, you can enhance your practice by:</p>
<ul>
<li>Practicing 108 times for special intentions</li>
<li>Observing fasting on specific days</li>
<li>Combining with meditation and pranayama</li>
<li>Participating in group recitations (satsang)</li>
<li>Studying deeper meanings and commentaries</li>
</ul>`,

    verses: `<h3>Sacred Verses of ${titleKeyword}</h3>

<div class="verse">
<p><strong>Opening Prayer (Dhyana Shloka)</strong></p>
<p class="sanskrit">ॐ ध्यायेत् सर्व मङ्गलं<br>
सर्व कार्य सिद्धिं प्राप्नुयात्</p>
<p><em>Translation:</em> May we meditate upon all auspiciousness and achieve success in all endeavors.</p>
</div>

<div class="verse">
<p><strong>Main Verse 1</strong></p>
<p class="sanskrit">जय जय श्री गुरुदेव की<br>
भक्ति सागर में डुबकी दीजिए</p>
<p><em>Translation:</em> Glory to the divine teacher, immerse yourself in the ocean of devotion.</p>
</div>

<p><em>Note: Complete verses available in traditional texts. Practice with proper guidance for authentic pronunciation and meaning.</em></p>`,

    // Benefits
    benefits: `Removes negative energies and evil spirits from surroundings
Provides divine protection from accidents and dangers
Improves focus, concentration, and memory power
Brings success in career, business, and professional life
Heals physical ailments and promotes good health
Removes fear, anxiety, depression, and mental stress
Strengthens willpower and builds inner courage
Resolves family conflicts and brings harmony
Attracts wealth, prosperity, and financial stability
Accelerates spiritual growth and self-realization
Removes obstacles and difficulties from life's path
Grants peace of mind and emotional balance`,

    bestTime: "Early morning (4-6 AM) or Evening at sunset",
    duration: "15-30 minutes daily",
    repetitions: "Once daily (108 times for special wishes)",

    // Media placeholders
    audioUrl: "",
    youtubeUrl: "",

    // Related Content
    relatedMantras: `${category.name} mantras, Morning prayers, Evening aarti, Meditation practices`,
    festivals:
      "All major Hindu festivals, Monthly full moon days, Auspicious occasions",

    // SEO Meta Tags
    metaTitle: `${titleKeyword}: Complete Guide, Benefits & Meaning | ${currentYear}`,
    metaDescription: `Discover the powerful ${mainKeyword} - complete guide with benefits, meaning, proper method, and best practices. Transform your spiritual journey with this sacred practice. Free guide ${currentYear}.`,

    // Open Graph
    ogTitle: `${titleKeyword} - Complete Spiritual Guide & Benefits`,
    ogDescription: `Learn the sacred practice of ${mainKeyword}. Comprehensive guide with step-by-step instructions, spiritual benefits, and practical tips for beginners and advanced practitioners.`,

    // Advanced SEO
    canonicalUrl: `https://yoursite.com/${category.slug || "category"}/${slug}`,
    schemaType: "Article",
  };

  return content;
}

function generateSanskritTitle(topic) {
  // Simple Sanskrit title generator
  const words = topic.toLowerCase().split(" ");
  if (words.includes("hanuman")) return "हनुमान चालीसा";
  if (words.includes("shiva")) return "शिव स्तोत्रम्";
  if (words.includes("ganesh")) return "गणेश स्तुति";
  if (words.includes("durga")) return "दुर्गा सप्तशती";
  if (words.includes("lakshmi")) return "लक्ष्मी स्तोत्रम्";
  if (words.includes("krishna")) return "श्री कृष्ण स्तोत्रम्";
  if (words.includes("rama")) return "श्री राम स्तोत्रम्";
  return "श्री स्तोत्रम्";
}

function extractDeityName(topic) {
  const words = topic.toLowerCase();
  if (words.includes("hanuman")) return "Lord Hanuman";
  if (words.includes("shiva")) return "Lord Shiva";
  if (words.includes("ganesh") || words.includes("ganesha"))
    return "Lord Ganesha";
  if (words.includes("durga")) return "Goddess Durga";
  if (words.includes("lakshmi")) return "Goddess Lakshmi";
  if (words.includes("krishna")) return "Lord Krishna";
  if (words.includes("rama")) return "Lord Rama";
  if (words.includes("saraswati")) return "Goddess Saraswati";
  if (words.includes("vishnu")) return "Lord Vishnu";
  return "Divine Deity";
}

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
      template,
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
            template,
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
        template,
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

router.get("/articles/bulk-upload", auth, rbac(["admin"]), (req, res) => {
  res.render("articles/bulkuploadform", {
    layout: "layout",
    title: "Upload Articles",
    hideSidebar: false,
    category: null,
    active: "articles",
  });
});

router.post(
  "/articles/bulk-upload-save",
  uploadArticleCsv.fields([{ name: "csvFile", maxCount: 1 }]),
  auth,
  rbac(["admin"]),
  async (req, res) => {
    const file = req.files?.csvFile?.[0];
    const filePath = file?.path;
    if (!filePath) return res.status(400).send("CSV file is required.");

    const rows = [];
    const skipped = [];

    try {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
          const transaction = await sequelize.transaction();

          try {
            for (const [index, data] of rows.entries()) {
              const { name, slug, status } = data;

              // Validate required fields
              if (!name || !slug || !status) {
                skipped.push({
                  index: index + 1,
                  reason: "Missing required fields",
                });
                continue;
              }

              // Check for duplicates
              const exists = await Article.findOne({
                where: {
                  [Sequelize.Op.or]: [{ name }, { slug }],
                },
                transaction,
              });

              if (exists) {
                skipped.push({
                  index: index + 1,
                  reason: "Duplicate name or slug",
                });
                continue;
              }

              // Create Article
              await Article.create(
                {
                  name,
                  slug,
                  sanskritTitle: data.sanskritTitle,
                  deity: data.deity,
                  verseCount: data.verseCount,
                  language: data.language,
                  languageCode: data.languageCode,
                  benefits: data.benefits,
                  content: data.content,
                  tags: data.tags,
                  author: data.author,
                  bestTime: data.bestTime,
                  duration: data.duration,
                  repetitions: data.repetitions,
                  verses: data.verses,
                  fullContent: data.fullContent,
                  audioUrl: data.audioUrl,
                  imageUrl: data.imageUrl,
                  youtubeUrl: data.youtubeUrl,
                  relatedMantras: data.relatedMantras,
                  festivals: data.festivals,
                  keywords: data.keywords,
                  introText: data.introText,
                  metaTitle: data.metaTitle,
                  metaDescription: data.metaDescription,
                  ogTitle: data.ogTitle,
                  ogDescription: data.ogDescription,
                  ogImage: data.ogImage,
                  canonicalUrl: data.canonicalUrl,
                  schemaType: data.schemaType,
                  status: data.status,
                  publishDate: data.publishDate,
                  viewCount: data.viewCount,
                  scheduledPublishDate: data.scheduledPublishDate,
                  categoryId: data.categoryId,
                  subCategoryId: data.subCategoryId,
                },
                { transaction }
              );
            }

            await transaction.commit();
            fs.unlinkSync(filePath);

            const message = skipped.length
              ? `Upload completed with ${skipped.length} skipped rows.`
              : "All articles uploaded successfully.";

            res.redirect(
              `/admin/articles?message=${encodeURIComponent(message)}`
            );
          } catch (err) {
            await transaction.rollback();
            console.error("Transaction failed:", err);
            res.status(500).send("Failed to save articles.");
          }
        });
    } catch (err) {
      console.error("CSV parsing error:", err);
      res.status(500).send("Error processing CSV file.");
    }
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

router.get("/articles/bulk-upload", auth, rbac(["admin"]), (req, res) => {
  res.render("articles/bulkuploadform", {
    layout: "layout",
    title: "Upload Articles",
    hideSidebar: false,
    category: null,
    active: "articles",
  });
});

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

router.get("/menu-categories", async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        showInMenu: 1,
        status: "Active",
      },
      attributes: ["id", "name", "slug"],
      include: [
        {
          model: SubCategory,
          where: {
            showInMenu: 1,
            status: "Active",
          },
          attributes: ["id", "name", "slug"],
          required: false, // If you want categories even if they have no "menu" subcategories
        },
      ],
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
