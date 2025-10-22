import { expect } from "chai";
import request from "supertest";
import app from "../../server.js";
import { Product, ProductCategory, ProductImage, User } from "../../models/Index.js";

describe("Product Integration Tests", () => {
  let token, seller;

  before(async function () {
    this.timeout(15000);
    
    // Nettoyer toutes les collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await ProductCategory.deleteMany({});
    await ProductImage.deleteMany({});

    console.log('All collections cleared in TEST database');

    // Créer un utilisateur seller pour les tests
    seller = await User.create({
      fullname: 'Test Seller',
      email: 'seller@example.com',
      password: '12345678',
      role: 'seller'
    });

    console.log('Test seller created in TEST database');

    // Login avec le seller créé
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: 'seller@example.com',
        password: '12345678'
      });

    if (res.status !== 200) {
      console.error('Login failed:', res.body);
    }

    token = res.body.token;
    console.log('Seller logged in successfully');
  });

  afterEach(async () => {
    await Product.deleteMany({});
    await ProductCategory.deleteMany({});
    await ProductImage.deleteMany({});
  });
 // create product tests
  describe("POST /products", () => {
    it("should create a new product successfully", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .field("title", "Test Product")
        .field("description", "This is a test product")
        .field("price", "99.99")
        .field("stock", "10");

      console.log('Response status:', res.status);
      console.log('Response body:', res.body);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("title", "Test Product");
    });

    it("should return error if required fields are missing", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .post("/products")
        .set("Authorization", `Bearer ${token}`)
        .field("description", "Missing title and price");

      expect(res.status).to.equal(400);
    });

    it("should return error if user not authenticated", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .post("/products")
        .field("title", "No Auth Product")
        .field("description", "User not logged in")
        .field("price", "20")
        .field("stock", "3");

      expect(res.status).to.equal(401);
    });
  });

  // get products tests
  describe("GET /products", () => {
    let testProduct1, testProduct2;

    beforeEach(async function() {
      this.timeout(5000);
      
      // Créer des produits de test avant chaque test GET
      testProduct1 = await Product.create({
        title: "Product 1",
        description: "First test product",
        price: 50,
        stock: 5,
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true
      });

      testProduct2 = await Product.create({
        title: "Product 2",
        description: "Second test product",
        price: 100,
        stock: 10,
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true
      });

      console.log('Test products created for GET tests');
    });

    it("should get all products", async function() {
      this.timeout(5000);
      
      const res = await request(app).get("/products");

      console.log('GET /products response:', res.status);
      console.log('Products count:', res.body.data?.products?.length);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("products");
      expect(res.body.data.products).to.be.an("array");
      expect(res.body.data.products.length).to.equal(2);
    });

    it("should get all products with pagination", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .get("/products")
        .query({ page: 1, limit: 1 });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.have.lengthOf(1);
      expect(res.body.metadata).to.have.property("total", 2);
      expect(res.body.metadata).to.have.property("currentPage", 1);
      expect(res.body.metadata).to.have.property("totalPages", 2);
    });

    it("should filter products by price range", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .get("/products")
        .query({ minPrice: 60, maxPrice: 150 });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.have.lengthOf(1);
      expect(res.body.data.products[0].price).to.equal(100);
    });

    it("should search products by title", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .get("/products")
        .query({ search: "Product 1" });

      expect(res.status).to.equal(200);
      expect(res.body.data.products).to.have.lengthOf(1);
      expect(res.body.data.products[0].title).to.include("Product 1");
    });

    it("should sort products by price ascending", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .get("/products")
        .query({ sortBy: "price", order: "asc" });

      expect(res.status).to.equal(200);
      expect(res.body.data.products[0].price).to.equal(50);
      expect(res.body.data.products[1].price).to.equal(100);
    });

    it("should sort products by price descending", async function() {
      this.timeout(5000);
      
      const res = await request(app)
        .get("/products")
        .query({ sortBy: "price", order: "desc" });

      expect(res.status).to.equal(200);
      expect(res.body.data.products[0].price).to.equal(100);
      expect(res.body.data.products[1].price).to.equal(50);
    });
  });

  describe("GET /products/:id", () => {
    let testProduct;

    beforeEach(async function() {
      this.timeout(5000);
      
      // Créer un produit de test
      testProduct = await Product.create({
        title: "Single Product Test",
        description: "Product for testing getById",
        price: 75,
        stock: 8,
        sellerId: seller._id,
        validationStatus: "approved",
        isVisible: true
      });

      console.log('Test product created for getById tests');
    });

    it("should get a product by valid ID", async function() {
      this.timeout(5000);
      
      const res = await request(app).get(`/products/${testProduct._id}`);

      console.log('GET /products/:id response:', res.status);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("success", true);
      expect(res.body.data).to.have.property("product");
      expect(res.body.data.product).to.have.property("title", "Single Product Test");
      expect(res.body.data.product).to.have.property("price", 75);
    });

    it("should return 400 for invalid product ID format", async function() {
      this.timeout(5000);
      
      const res = await request(app).get("/products/invalid-id-format");

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property("message", "Invalid product ID");
    });

    it("should return 404 for non-existent product ID", async function() {
      this.timeout(5000);
      
      const fakeId = "507f1f77bcf86cd799439011"; // Valid ObjectId format mais n'existe pas
      const res = await request(app).get(`/products/${fakeId}`);

      expect(res.status).to.equal(404);
      expect(res.body).to.have.property("message", "Product not found");
    });
  });
});