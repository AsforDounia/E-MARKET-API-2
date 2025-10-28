import { expect } from "chai";
import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../server.js";
import { User, Notification, UserNotification } from "../../models/Index.js";
import notificationService from "../../services/notificationService.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

describe("Notification Integration Tests", () => {
  let buyerToken, sellerToken;
  let buyerUser, sellerUser;
  let testNotification, testUserNotification;

  before(async () => {
    // Créer un acheteur (buyer)
    const hashedPasswordBuyer = await bcrypt.hash("Password123!", 10);
    buyerUser = await User.create({
      fullname: faker.person.fullName(),
      email: faker.internet.email(),
      password: hashedPasswordBuyer,
      role: "user",
    });
    buyerToken = jwt.sign(
      { id: buyerUser._id, role: buyerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Créer un vendeur (seller)
    const hashedPasswordSeller = await bcrypt.hash("Password123!", 10);
    sellerUser = await User.create({
      fullname: faker.person.fullName(),
      email: faker.internet.email(),
      password: hashedPasswordSeller,
      role: "seller",
    });
    sellerToken = jwt.sign(
      { id: sellerUser._id, role: sellerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterEach(async () => {
    // Nettoyer les notifications de test
    await Notification.deleteMany({});
    await UserNotification.deleteMany({});
  });

  after(async () => {
    // Nettoyer tous les utilisateurs de test
    await User.deleteMany({});
  });

  // ==================== GET NOTIFICATIONS ====================
  describe("GET /notifications", () => {
    beforeEach(async () => {
      // Créer une notification template
      testNotification = await Notification.create({
        type: "PUBLISH_PRODUCT",
        title: faker.lorem.sentence(),
        message: faker.lorem.paragraph(),
        data: { productId: faker.database.mongodbObjectId() },
        senderId: sellerUser._id,
        targetAudience: "buyers",
        priority: "normal",
      });

      // Créer une notification utilisateur pour le buyer
      testUserNotification = await UserNotification.create({
        userId: buyerUser._id,
        notificationId: testNotification._id,
        isRead: false,
      });
    });

    it("should get all notifications for authenticated user", async () => {
      const response = await request(app)
        .get("/api/v2/notifications")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).to.have.property("success", true);
      expect(response.body).to.have.property("data");
      expect(response.body.data).to.be.an("array");
      expect(response.body.data).to.have.lengthOf(1);

      const userNotif = response.body.data[0];
      expect(userNotif).to.have.property("isRead", false);
      expect(userNotif).to.have.property("notification");
      expect(userNotif.notification).to.have.property("title");
      expect(userNotif.notification).to.have.property("message");
    });

    it("should return empty array when user has no notifications", async () => {
      // Nettoyer complètement toutes les notifications
      await UserNotification.deleteMany({});
      await Notification.deleteMany({});

      const response = await request(app)
        .get("/api/v2/notifications")
        .set("Authorization", `Bearer ${sellerToken}`)
        .query({ _t: Date.now() }) // Éviter le cache
        .expect(200);

      expect(response.body.data).to.be.an("array");
      expect(response.body.data).to.have.lengthOf(0);
    });

    it("should support pagination", async () => {
      // Créer plusieurs notifications
      const notifications = [];
      for (let i = 0; i < 15; i++) {
        const notif = await Notification.create({
          type: "PUBLISH_PRODUCT",
          title: faker.lorem.sentence(),
          message: faker.lorem.paragraph(),
          senderId: sellerUser._id,
          targetAudience: "buyers",
        });
        notifications.push(notif);
      }

      // Créer les UserNotifications
      const userNotifications = notifications.map((n) => ({
        userId: buyerUser._id,
        notificationId: n._id,
        isRead: false,
      }));
      await UserNotification.insertMany(userNotifications);

      // Tester la pagination - page 1
      const response1 = await request(app)
        .get("/api/v2/notifications?page=1&limit=10")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(response1.body.data).to.have.lengthOf(10);
      expect(response1.body.pagination).to.have.property("currentPage", 1);
      expect(response1.body.pagination).to.have.property("totalPages", 2);

      // Tester la pagination - page 2
      const response2 = await request(app)
        .get("/api/v2/notifications?page=2&limit=10")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(response2.body.data).to.have.lengthOf(6); // 15 + 1 from beforeEach = 16, donc 6 sur page 2
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app)
        .get("/api/v2/notifications")
        .expect(401);

      expect(response.body).to.have.property("status", 401);
      expect(response.body).to.have.property("message");
    });
  });

  // ==================== MARK NOTIFICATION AS READ ====================
  describe("PATCH /notifications/:id/read", () => {
    beforeEach(async () => {
      // Créer une notification non lue
      testNotification = await Notification.create({
        type: "PUBLISH_PRODUCT",
        title: faker.lorem.sentence(),
        message: faker.lorem.paragraph(),
        senderId: sellerUser._id,
        targetAudience: "buyers",
      });

      testUserNotification = await UserNotification.create({
        userId: buyerUser._id,
        notificationId: testNotification._id,
        isRead: false,
      });
    });

    it("should mark notification as read successfully", async () => {
      const response = await request(app)
        .patch(`/api/v2/notifications/${testUserNotification._id}/read`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body).to.have.property("success", true);
      expect(response.body).to.have.property("message");

      // Vérifier dans la base de données
      const updatedNotification = await UserNotification.findById(
        testUserNotification._id
      );
      expect(updatedNotification.isRead).to.be.true;
      expect(updatedNotification.readAt).to.be.instanceOf(Date);
    });

    it("should return 404 for non-existent notification", async () => {
      const fakeId = faker.database.mongodbObjectId();

      const response = await request(app)
        .patch(`/api/v2/notifications/${fakeId}/read`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body).to.have.property("success", false);
    });

    it("should return 400 for invalid notification ID", async () => {
      const response = await request(app)
        .patch(`/api/v2/notifications/invalid-id/read`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(400);

      expect(response.body).to.have.property("success", false);
    });

    it("should not allow marking another user's notification as read", async () => {
      // Créer une notification pour un autre utilisateur
      const otherUserNotif = await UserNotification.create({
        userId: sellerUser._id,
        notificationId: testNotification._id,
        isRead: false,
      });

      const response = await request(app)
        .patch(`/api/v2/notifications/${otherUserNotif._id}/read`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(404);

      expect(response.body).to.have.property("success", false);

      // Vérifier que la notification n'a pas été modifiée
      const unchangedNotif = await UserNotification.findById(
        otherUserNotif._id
      );
      expect(unchangedNotif.isRead).to.be.false;
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app)
        .patch(`/api/v2/notifications/${testUserNotification._id}/read`)
        .expect(401);

      expect(response.body).to.have.property("status", 401);
      expect(response.body).to.have.property("message");
    });
  });

  // ==================== NOTIFICATION SERVICE INTEGRATION ====================
  describe("NotificationService Integration", () => {
    it("should create notification when product is published", async () => {
      const productData = {
        productId: faker.database.mongodbObjectId(),
        sellerId: sellerUser._id,
        title: faker.commerce.productName(),
      };

      // Émettre l'événement
      await notificationService.handlePublishProduct(productData);

      // Vérifier que la notification a été créée
      const notification = await Notification.findOne({
        type: "PUBLISH_PRODUCT",
        "data.productId": productData.productId,
      });

      expect(notification).to.exist;
      expect(notification.title).to.equal("New Product Available");
      expect(notification.message).to.include(productData.title);

      // Vérifier que les buyers ont reçu la notification
      const userNotifications = await UserNotification.find({
        notificationId: notification._id,
        userId: buyerUser._id,
      });

      expect(userNotifications).to.have.lengthOf(1);
    });

    it("should create notification when order is created", async () => {
      const orderData = {
        orderId: faker.database.mongodbObjectId(),
        userId: buyerUser._id,
        total: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
      };

      // Émettre l'événement
      await notificationService.handleOrderCreated(orderData);

      // Vérifier que la notification a été créée
      const notification = await Notification.findOne({
        type: "ORDER_CREATED",
        "data.orderId": orderData.orderId,
      });

      expect(notification).to.exist;
      expect(notification.title).to.equal("New Order Created");

      // Vérifier que les sellers ont reçu la notification
      const userNotifications = await UserNotification.find({
        notificationId: notification._id,
        userId: sellerUser._id,
      });

      expect(userNotifications).to.have.lengthOf(1);
    });

    it("should create notification when order is updated", async () => {
      const orderData = {
        orderId: faker.database.mongodbObjectId(),
        orderUserId: buyerUser._id,
      };

      // Émettre l'événement
      await notificationService.handleOrderUpdated(orderData, "ORDER_UPDATED");

      // Vérifier que la notification a été créée
      const notification = await Notification.findOne({
        type: "ORDER_UPDATED",
        "data.orderId": orderData.orderId,
      });

      expect(notification).to.exist;
      expect(notification.title).to.equal("Order Updated");
    });

    it("should not create notification for invalid product data", async () => {
      const invalidData = {
        productId: faker.database.mongodbObjectId(),
        // Missing sellerId and title
      };

      // Vérifier le nombre de notifications avant
      const countBefore = await Notification.countDocuments();

      // Tenter d'émettre l'événement avec des données invalides
      try {
        await notificationService.handlePublishProduct(invalidData);
      } catch (error) {
        // Expected to fail
      }

      // Vérifier qu'aucune notification n'a été créée
      const countAfter = await Notification.countDocuments();
      expect(countAfter).to.equal(countBefore);
    });
  });
});
