import { expect } from "chai";
import sinon from "sinon";
import { faker } from "@faker-js/faker";
import * as notificationController from "../../controllers/notificationController.js";
import { Notification, UserNotification, User } from "../../models/Index.js";
import notificationService from "../../services/notificationService.js";

describe("Notification Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  // ==================== GET NOTIFICATIONS ====================
  describe("getNotifications", () => {
    beforeEach(() => {
      req = {
        user: { _id: faker.database.mongodbObjectId() },
        query: { page: 1, limit: 10 }
      };
    });

    it("should get all user notifications successfully", async () => {
      const fakeNotifications = [
        {
          _id: faker.database.mongodbObjectId(),
          userId: req.user._id,
          isRead: false,
          readAt: null,
          createdAt: faker.date.recent(),
          notificationId: {
            _id: faker.database.mongodbObjectId(),
            type: "PUBLISH_PRODUCT",
            title: faker.lorem.sentence(),
            message: faker.lorem.paragraph(),
            priority: "normal",
            data: { productId: faker.database.mongodbObjectId() },
            senderId: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent()
          }
        },
        {
          _id: faker.database.mongodbObjectId(),
          userId: req.user._id,
          isRead: true,
          readAt: faker.date.recent(),
          createdAt: faker.date.recent(),
          notificationId: {
            _id: faker.database.mongodbObjectId(),
            type: "ORDER_CREATED",
            title: faker.lorem.sentence(),
            message: faker.lorem.paragraph(),
            priority: "high",
            data: { orderId: faker.database.mongodbObjectId() },
            senderId: faker.database.mongodbObjectId(),
            createdAt: faker.date.recent()
          }
        }
      ];

      const queryChain = {
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves(fakeNotifications)
      };

      sinon.stub(UserNotification, "find").returns(queryChain);
      sinon.stub(UserNotification, "countDocuments").resolves(2);

      await notificationController.getNotifications(req, res, next);

      expect(UserNotification.find.calledOnce).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response).to.have.property("data");
      expect(response.data).to.be.an("array");
      expect(response.data).to.have.lengthOf(2);
      expect(response.pagination).to.have.property("total", 2);
    });

    it("should return empty array when user has no notifications", async () => {
      const queryChain = {
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([])
      };

      sinon.stub(UserNotification, "find").returns(queryChain);
      sinon.stub(UserNotification, "countDocuments").resolves(0);

      await notificationController.getNotifications(req, res, next);

      const response = res.json.firstCall.args[0];
      expect(response.data).to.have.lengthOf(0);
      expect(response.pagination.total).to.equal(0);
    });

    it("should support pagination", async () => {
      req.query = { page: 2, limit: 5 };

      const queryChain = {
        populate: sinon.stub().returnsThis(),
        sort: sinon.stub().returnsThis(),
        skip: sinon.stub().returnsThis(),
        limit: sinon.stub().resolves([])
      };

      const findStub = sinon.stub(UserNotification, "find").returns(queryChain);
      sinon.stub(UserNotification, "countDocuments").resolves(12);

      await notificationController.getNotifications(req, res, next);

      expect(queryChain.skip.calledWith(5)).to.be.true; // (2-1) * 5 = 5
      expect(queryChain.limit.calledWith(5)).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.pagination).to.have.property("currentPage", 2);
      expect(response.pagination).to.have.property("totalPages", 3); // ceil(12/5)
    });
  });

  // ==================== MARK AS READ ====================
  describe("markAsRead", () => {
    beforeEach(() => {
      req = {
        user: { _id: faker.database.mongodbObjectId() },
        params: { id: faker.database.mongodbObjectId() }
      };
    });

    it("should mark notification as read successfully", async () => {
      const updatedNotification = {
        _id: req.params.id,
        userId: req.user._id,
        isRead: true,
        readAt: new Date(),
        notificationId: faker.database.mongodbObjectId()
      };

      sinon.stub(UserNotification, "findOneAndUpdate").resolves(updatedNotification);

      await notificationController.markAsRead(req, res, next);

      expect(UserNotification.findOneAndUpdate.calledOnce).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response).to.have.property("success", true);
      expect(response).to.have.property("message");
    });

    it("should return error for invalid notification ID", async () => {
      req.params.id = faker.string.alphanumeric(10); // Invalid ID

      await notificationController.markAsRead(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.have.property("statusCode", 400);
      expect(error.message).to.include("Invalid");
    });

    it("should return 404 for non-existent notification", async () => {
      sinon.stub(UserNotification, "findOneAndUpdate").resolves(null);

      await notificationController.markAsRead(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.have.property("statusCode", 404);
      expect(error.message).to.include("not found");
    });
  });

  // ==================== NOTIFICATION SERVICE ====================
  describe("NotificationService", () => {
    describe("handlePublishProduct", () => {
      it("should create notification for new product", async () => {
        const productData = {
          productId: faker.database.mongodbObjectId(),
          sellerId: faker.database.mongodbObjectId(),
          title: faker.commerce.productName()
        };

        const fakeNotification = {
          _id: faker.database.mongodbObjectId(),
          type: "PUBLISH_PRODUCT",
          title: "New Product Available",
          message: `The product "${productData.title}" is now available in our marketplace.`,
          data: { productId: productData.productId },
          senderId: productData.sellerId,
          targetAudience: "buyers"
        };

        const fakeBuyers = [
          { _id: faker.database.mongodbObjectId(), role: "user" },
          { _id: faker.database.mongodbObjectId(), role: "user" }
        ];

        sinon.stub(Notification, "create").resolves(fakeNotification);
        sinon.stub(User, "find").resolves(fakeBuyers);
        sinon.stub(UserNotification, "insertMany").resolves([]);

        await notificationService.handlePublishProduct(productData);

        expect(Notification.create.calledOnce).to.be.true;
        expect(User.find.calledOnce).to.be.true;
        expect(UserNotification.insertMany.calledOnce).to.be.true;
        
        const insertManyCall = UserNotification.insertMany.firstCall.args[0];
        expect(insertManyCall).to.have.lengthOf(2);
      });

      it("should throw error when required data is missing", async () => {
        const incompleteData = {
          productId: faker.database.mongodbObjectId()
          // Missing sellerId and title
        };

        const mockNext = sinon.stub();

        await notificationService.handlePublishProduct(incompleteData, mockNext);

        expect(mockNext.calledOnce).to.be.true;
        const error = mockNext.firstCall.args[0];
        expect(error.message).to.include("Missing required product data");
      });
    });

    describe("handleOrderCreated", () => {
      it("should create notification for new order", async () => {
        const orderData = {
          orderId: faker.database.mongodbObjectId(),
          userId: faker.database.mongodbObjectId(),
          total: parseFloat(faker.commerce.price({ min: 50, max: 500 }))
        };

        const fakeNotification = {
          _id: faker.database.mongodbObjectId(),
          type: "ORDER_CREATED",
          title: "New Order Created",
          message: `Order #${orderData.orderId} created for a total of ${orderData.total}€`,
          data: { orderId: orderData.orderId }
        };

        const fakeSellers = [
          { _id: faker.database.mongodbObjectId(), role: "seller" }
        ];

        sinon.stub(Notification, "create").resolves(fakeNotification);
        sinon.stub(User, "find").resolves(fakeSellers);
        sinon.stub(UserNotification, "insertMany").resolves([]);

        await notificationService.handleOrderCreated(orderData);

        expect(Notification.create.calledOnce).to.be.true;
        expect(User.find.calledWith({ role: "seller", deletedAt: null })).to.be.true;
        expect(UserNotification.insertMany.calledOnce).to.be.true;
      });
    });

    describe("handleOrderUpdated", () => {
      it("should create notification for updated order", async () => {
        const orderData = {
          orderId: faker.database.mongodbObjectId(),
          orderUserId: faker.database.mongodbObjectId()
        };

        const fakeNotification = {
          _id: faker.database.mongodbObjectId(),
          type: "ORDER_UPDATED",
          title: "Order Updated"
        };

        const fakeSellers = [
          { _id: faker.database.mongodbObjectId(), role: "seller" }
        ];

        sinon.stub(Notification, "create").resolves(fakeNotification);
        sinon.stub(User, "find").resolves(fakeSellers);
        sinon.stub(UserNotification, "insertMany").resolves([]);

        await notificationService.handleOrderUpdated(orderData, "ORDER_UPDATED");

        expect(Notification.create.calledOnce).to.be.true;
        const createCall = Notification.create.firstCall.args[0];
        expect(createCall.type).to.equal("ORDER_UPDATED");
        expect(createCall.title).to.equal("Order Updated");
      });

      it("should create notification for cancelled order", async () => {
        const orderData = {
          orderId: faker.database.mongodbObjectId(),
          orderUserId: faker.database.mongodbObjectId()
        };

        const fakeNotification = {
          _id: faker.database.mongodbObjectId(),
          type: "ORDER_CANCELLED",
          title: "Order Cancelled"
        };

        sinon.stub(Notification, "create").resolves(fakeNotification);
        sinon.stub(User, "find").resolves([]);
        sinon.stub(UserNotification, "insertMany").resolves([]);

        await notificationService.handleOrderUpdated(orderData, "ORDER_CANCELLED");

        const createCall = Notification.create.firstCall.args[0];
        expect(createCall.type).to.equal("ORDER_CANCELLED");
        expect(createCall.title).to.equal("Order Cancelled");
      });
    });

    describe("Event Emitters", () => {
      it("should emit PUBLISH_PRODUCT event", (done) => {
        const productData = {
          productId: faker.database.mongodbObjectId(),
          sellerId: faker.database.mongodbObjectId(),
          title: faker.commerce.productName()
        };

        notificationService.once("PUBLISH_PRODUCT", (data) => {
          expect(data).to.deep.equal(productData);
          done();
        });

        notificationService.emitPublishProduct(productData);
      });

      it("should emit ORDER_CREATED event", (done) => {
        const orderData = {
          orderId: faker.database.mongodbObjectId(),
          userId: faker.database.mongodbObjectId(),
          total: 150.50
        };

        notificationService.once("ORDER_CREATED", (data) => {
          expect(data).to.deep.equal(orderData);
          done();
        });

        notificationService.emitOrderCreated(orderData);
      });

      it("should emit ORDER_UPDATED event", (done) => {
        const orderData = {
          orderId: faker.database.mongodbObjectId(),
          orderUserId: faker.database.mongodbObjectId()
        };

        notificationService.once("ORDER_UPDATED", (data) => {
          expect(data).to.deep.equal(orderData);
          done();
        });

        notificationService.emitOrderUpdated(orderData);
      });
    });
  });
});
