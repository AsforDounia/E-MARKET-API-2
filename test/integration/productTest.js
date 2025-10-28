import { expect } from "chai";
import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../server.js";
import {
  Product,
  ProductCategory,
  ProductImage,
  User,
} from "../../models/Index.js";

describe("Product Integration Tests", () => {
  let token, seller;

  before(async function () {
    this.timeout(15000);

    // Nettoyer toutes les collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await ProductCategory.deleteMany({});
    await ProductImage.deleteMany({});

    console.log("All collections cleared in TEST database");

    // Créer un utilisateur seller avec un mot de passe fixe
    const password = "12345678";

    seller = await User.create({
      fullname: faker.person.fullName(),
      email: faker.internet.email(),
      password: password,
      role: "seller",
    });

    console.log("Test seller created:", seller.email);

    // Login avec le seller créé
    const res = await request(app).post("/api/v2/auth/login").send({
      email: seller.email,
      password: password,
    });

    console.log("Login response:", res.status, res.body);

    if (res.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
    }

    token = res.body.token;
    console.log("Seller logged in successfully");
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await ProductCategory.deleteMany({});
    await ProductImage.deleteMany({});
  });

  // create product tests
  describe("POST /products", () => {
    it("should create a new product successfully", async function () {
      this.timeout(5000);

      const productData = {
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 10, max: 1000 }),
        stock: faker.number.int({ min: 1, max: 100 }),
      };

      const res = await request(app)
        .post("/api/v2/products")
        .set("Authorization", `Bearer ${token}`)
        .field("title", productData.title)
        .field("description", productData.description)
        .field("price", productData.price)
        .field("stock", productData.stock);

      console.log("Response status:", res.status);
      console.log("Response body:", res.body);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("title", productData.title);
    });

    it("should return error if required fields are missing", async function () {
      this.timeout(5000);

      const res = await request(app)
        .post("/api/v2/products")
        .set("Authorization", `Bearer ${token}`)
        .field("description", faker.commerce.productDescription());

      expect(res.status).to.equal(400);
    });

    it("should return error if user not authenticated", async function () {
      this.timeout(5000);

      const res = await request(app)
        .post("/api/v2/products")
        .field("title", faker.commerce.productName())
        .field("description", faker.commerce.productDescription())
        .field("price", faker.commerce.price())
        .field("stock", faker.number.int({ min: 1, max: 10 }));

      expect(res.status).to.equal(401);
    });
  });

  // get products tests
  describe("GET /products", () => {
    let testProduct1, testProduct2;

    beforeEach(async function () {
      this.timeout(5000);

      // Créer des produits de test avec Faker
      testProduct1 = await Product.create({
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.number.float({ min: 10, max: 100, precision: 0.01 }),
        stock: faker.number.int({ min: 1, max: 20 }),
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true,
      });

      testProduct2 = await Product.create({
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.number.float({ min: 100, max: 200, precision: 0.01 }),
        stock: faker.number.int({ min: 5, max: 15 }),
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true,
      });

      console.log("Test products created:", {
        product1: { title: testProduct1.title, price: testProduct1.price },
        product2: { title: testProduct2.title, price: testProduct2.price },
      });
    });

    it("should get all products", async function () {
      this.timeout(5000);

      const res = await request(app).get("/api/v2/products");

      console.log("GET /products response:", res.status);
      console.log("Products count:", res.body.data?.products?.length);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("products");
      expect(res.body.data.products).to.be.an("array");
      expect(res.body.data.products.length).to.equal(2);
    });

    it("should get all products with pagination", async function () {
      this.timeout(5000);

      const res = await request(app)
        .get("/api/v2/products")
        .query({ page: 1, limit: 1 });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.have.lengthOf(1);
      expect(res.body.metadata).to.have.property("total", 2);
      expect(res.body.metadata).to.have.property("currentPage", 1);
      expect(res.body.metadata).to.have.property("totalPages", 2);
    });

    it("should filter products by price range", async function () {
      this.timeout(5000);

      // Utiliser les prix réels des produits créés
      const minPrice = testProduct1.price + 10;
      const maxPrice = testProduct2.price + 10;

      const res = await request(app)
        .get("/api/v2/products")
        .query({ minPrice, maxPrice });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.have.lengthOf(1);
      expect(res.body.data.products[0].price).to.be.at.least(minPrice);
      expect(res.body.data.products[0].price).to.be.at.most(maxPrice);
    });

    it("should search products by title", async function () {
      this.timeout(5000);

      // Chercher par une partie du titre du premier produit
      const searchTerm = testProduct1.title.split(" ")[0];

      const res = await request(app)
        .get("/api/v2/products")
        .query({ search: searchTerm });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.be.an("array");
      if (res.body.data.products.length > 0) {
        expect(res.body.data.products[0].title).to.include(searchTerm);
      }
    });

    it("should sort products by price ascending", async function () {
      this.timeout(5000);

      const res = await request(app)
        .get("/api/v2/products")
        .query({ sortBy: "price", order: "asc" });

      expect(res.status).to.equal(200);
      expect(res.body.data.products[0].price).to.be.at.most(
        res.body.data.products[1].price
      );
    });

    it("should sort products by price descending", async function () {
      this.timeout(5000);

      const res = await request(app)
        .get("/api/v2/products")
        .query({ sortBy: "price", order: "desc" });

      expect(res.status).to.equal(200);
      expect(res.body.data.products[0].price).to.be.at.least(
        res.body.data.products[1].price
      );
    });
  });

  describe("GET /products/:id", () => {
    let testProduct;

    beforeEach(async function () {
      this.timeout(5000);

      // Créer un produit de test avec Faker
      testProduct = await Product.create({
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.number.float({ min: 50, max: 150, precision: 0.01 }),
        stock: faker.number.int({ min: 1, max: 50 }),
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true,
      });

      console.log("Test product created for getById:", {
        id: testProduct._id,
        title: testProduct.title,
        price: testProduct.price,
      });
    });

    it("should get a product by valid ID", async function () {
      this.timeout(5000);

      const res = await request(app).get(`/api/v2/products/${testProduct._id}`);

      console.log("GET /products/:id response:", res.status);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("product");
      expect(res.body.data.product).to.have.property(
        "title",
        testProduct.title
      );
      expect(res.body.data.product).to.have.property(
        "price",
        testProduct.price
      );
    });

    it("should return 400 for invalid product ID format", async function () {
      this.timeout(5000);

      const res = await request(app).get("/api/v2/products/invalid-id-format");

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("message", "Invalid product ID");
    });

    it("should return 404 for non-existent product ID", async function () {
      this.timeout(5000);

      const fakeId = "507f1f77bcf86cd799439011"; // Valid ObjectId format mais n'existe pas
      const res = await request(app).get(`/api/v2/products/${fakeId}`);

      expect(res.status).to.equal(404);
      expect(res.body).to.have.property("message", "Product not found");
    });
  });
});
