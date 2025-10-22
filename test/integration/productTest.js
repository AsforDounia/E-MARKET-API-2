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
});