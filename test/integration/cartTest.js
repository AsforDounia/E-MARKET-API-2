import { expect } from "chai";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import { Product, Cart, CartItem, User } from "../../models/Index.js";
import jwt from "jsonwebtoken";

describe("Cart Integration Tests", () => {
  let authToken;
  let userId;
  let productId1;
  let productId2;

  // Nettoyage et création des données de test avant chaque test
  beforeEach(async () => {
    // Nettoyer toutes les collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await CartItem.deleteMany({});

    // Créer un utilisateur de test
    const user = await User.create({
      fullname: "Test User",
      email: "test@example.com",
      password: "hashedPassword123",
      role: "user",
    });

    userId = user._id.toString();

    // Générer un token JWT pour l'authentification
    authToken = jwt.sign(
      { id: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );

    // Créer des produits de test
    const product1 = await Product.create({
      title: "Product 1",
      description: "Description 1",
      price: 100,
      stock: 10,
      sellerId: userId,
      category: "Electronics",
      imageUrls: ["image1.jpg"],
    });

    const product2 = await Product.create({
      title: "Product 2",
      description: "Description 2",
      price: 50,
      stock: 5,
      sellerId: userId,
      category: "Electronics",
      imageUrls: ["image2.jpg"],
    });

    productId1 = product1._id.toString();
    productId2 = product2._id.toString();
  });

  describe("POST /api/v2/cart/add - addToCart", () => {
    it("should add a new product to cart successfully", async () => {
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 })
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Product added to cart successfully");
      expect(response.body.data.cart.items).to.have.lengthOf(1);
      expect(response.body.data.cart.items[0].quantity).to.equal(2);
      expect(response.body.data.cart.totalAmount).to.equal(200);

      // Vérifier dans la base de données
      const cartItems = await CartItem.find({});
      expect(cartItems).to.have.lengthOf(1);
      expect(cartItems[0].quantity).to.equal(2);
    });

    it("should update quantity when adding existing product", async () => {
      // Ajouter le produit une première fois
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });

      // Ajouter le même produit à nouveau
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 3 })
        .expect(200);

      expect(response.body.data.cart.items).to.have.lengthOf(1);
      expect(response.body.data.cart.items[0].quantity).to.equal(5);
      expect(response.body.data.cart.totalAmount).to.equal(500);
    });

    it("should add multiple different products to cart", async () => {
      // Ajouter le premier produit
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });

      // Ajouter le deuxième produit
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId2, quantity: 1 })
        .expect(200);

      expect(response.body.data.cart.items).to.have.lengthOf(2);
      expect(response.body.data.cart.totalAmount).to.equal(250);
    });

    it("should return error for invalid product ID", async () => {
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: "invalid-id", quantity: 2 })
        .expect(400);

        expect(response.body.success).to.equal(false);
        expect(response.body.message).to.equal("Invalid product ID");
    });

    it("should return error for non-existent product", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: fakeId.toString(), quantity: 2 })
        .expect(404);

      expect(response.body.success).to.equal(false);
      
      expect(response.body.message).to.equal("Product not found");
    });

    it("should return error for insufficient stock", async () => {
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 20 })
        .expect(400);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Insufficient stock");
    });

    it("should return error when not authenticated", async () => {
      const response = await request(app)
        .post("/api/v2/cart/add")
        .send({ productId: productId1, quantity: 2 })
        .expect(401);
      console.log("6666666666666666666666", response.body);
      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");


    });
  });

  describe("GET /api/v2/cart - getCart", () => {
    it("should return empty cart when no items exist", async () => {
      const response = await request(app)
        .get("/api/v2/cart")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Cart is empty");
      expect(response.body.data.cart.items).to.be.an("array").that.is.empty;
      expect(response.body.data.cart.totalAmount).to.equal(0);
    });

    it("should return cart with items", async () => {
      // Ajouter des produits au panier
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });

      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId2, quantity: 1 });

      // Récupérer le panier
      const response = await request(app)
        .get("/api/v2/cart")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Cart retrieved successfully");
      expect(response.body.data.cart.items).to.have.lengthOf(2);
      expect(response.body.data.cart.totalAmount).to.equal(250);

      // Vérifier les détails des produits
      const items = response.body.data.cart.items;
      expect(items[0].productId.title).to.exist;
      expect(items[0].productId.price).to.exist;
    });

    it("should return error when not authenticated", async () => {
      console.log("88888888888888855555555",);
      const response = await request(app)
        .get("/api/v2/cart")
        .expect(401);

      console.log("888888888888888888888888888", response.body);
      expect(response.body.status).to.equal(401);
      expect(response.body.message).to.equal("Invalid token.");

    });
  });

  describe("DELETE /api/v2/cart/item/:productId - removeFromCart", () => {
    beforeEach(async () => {
      // Ajouter des produits au panier pour les tests
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });

      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId2, quantity: 1 });
    });

    it("should remove product from cart successfully", async () => {
      const response = await request(app)
        .delete(`/api/v2/cart/item/${productId1}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Product removed from cart successfully");
      expect(response.body.data.cart.items).to.have.lengthOf(1);
      expect(response.body.data.cart.totalAmount).to.equal(50);

      // Vérifier dans la base de données
      const cartItems = await CartItem.find({});
      expect(cartItems).to.have.lengthOf(1);
    });

    it("should return error for invalid product ID", async () => {
      const response = await request(app)
        .delete("/api/v2/cart/item/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Invalid product ID");
    });

    it("should return error when product not in cart", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/cart/item/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Product not found in cart");
    });

    it("should return error when cart doesn't exist", async () => {
      // Créer un nouvel utilisateur sans panier
      const newUser = await User.create({
        fullname: "New User",
        email: "new@example.com",
        password: "password123",
        role: "user",
      });

      const newToken = jwt.sign(
        { id: newUser._id.toString(), email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .delete(`/api/v2/cart/item/${productId1}`)
        .set("Authorization", `Bearer ${newToken}`)
        .expect(404);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Cart not found");
    });
  });

  describe("PUT /api/v2/cart/item/:productId - updateCartItem", () => {
    beforeEach(async () => {
      // Ajouter un produit au panier
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });
    });

    it("should update cart item quantity successfully", async () => {
      const response = await request(app)
        .put(`/api/v2/cart/item/${productId1}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Cart item updated successfully");
      expect(response.body.data.cart.items[0].quantity).to.equal(5);
      expect(response.body.data.cart.totalAmount).to.equal(500);

      // Vérifier dans la base de données
      const cartItem = await CartItem.findOne({ productId: productId1 });
      expect(cartItem.quantity).to.equal(5);
    });

    it("should return error for invalid product ID", async () => {
      const response = await request(app)
        .put("/api/v2/cart/item/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(400);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Invalid product ID");
    });

    it("should return error for insufficient stock", async () => {
      const response = await request(app)
        .put(`/api/v2/cart/item/${productId1}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 20 })
        .expect(400);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Insufficient stock");
    });

    it("should return error when product not in cart", async () => {
      const response = await request(app)
        .put(`/api/v2/cart/item/${productId2}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 3 })
        .expect(404);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Product not found in cart");
    });
  });

  describe("DELETE /api/v2/cart - clearCart", () => {
    beforeEach(async () => {
      // Ajouter des produits au panier
      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 2 });

      await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId2, quantity: 1 });
    });

    it("should clear cart successfully", async () => {
      const response = await request(app)
        .delete("/api/v2/cart")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.message).to.equal("Cart cleared successfully");

      // Vérifier dans la base de données
      const cartItems = await CartItem.find({});
      expect(cartItems).to.be.an("array").that.is.empty;

      // Vérifier que le panier est maintenant vide
      const getCartResponse = await request(app)
        .get("/api/v2/cart")
        .set("Authorization", `Bearer ${authToken}`);

      expect(getCartResponse.body.data.cart.items).to.be.an("array").that.is.empty;
    });

    it("should return error when cart doesn't exist", async () => {
      // Créer un nouvel utilisateur sans panier
      const newUser = await User.create({
        fullname: "New User",
        email: "new@example.com",
        password: "password123",
        role: "user",
      });

      const newToken = jwt.sign(
        { id: newUser._id.toString(), email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .delete("/api/v2/cart")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(404);

      expect(response.body.success).to.equal(false);
      expect(response.body.message).to.equal("Cart not found");
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple concurrent cart operations", async () => {
      // Simuler plusieurs opérations simultanées
      const operations = [
        request(app)
          .post("/api/v2/cart/add")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ productId: productId1, quantity: 1 }),
        request(app)
          .post("/api/v2/cart/add")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ productId: productId2, quantity: 2 }),
        request(app)
          .post("/api/v2/cart/add")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ productId: productId1, quantity: 1 }),
      ];

      for (const op of operations) {
        await op;
      }

      // Vérifier le résultat final
      const response = await request(app)
        .get("/api/v2/cart")
        .set("Authorization", `Bearer ${authToken}`);

      // console.log("kkkkkkkkkkkkkkkkkkkkkkkkkk",response.body.data.cart.items);
      expect(response.body.data.cart.items).to.have.lengthOf(2);
      
      const product1Item = response.body.data.cart.items.find(
        item => item.productId._id.toString() === productId1
      );
      expect(product1Item.quantity).to.equal(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle maximum stock quantity", async () => {
      const response = await request(app)
        .post("/api/v2/cart/add")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: productId1, quantity: 10 })
        .expect(200);

      expect(response.body.data.cart.items[0].quantity).to.equal(10);
      expect(response.body.data.cart.totalAmount).to.equal(1000);
    });
  });
});