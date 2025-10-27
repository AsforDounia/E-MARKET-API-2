import { expect } from "chai";
import { faker } from "@faker-js/faker";
import logger from "../../middlewares/logger.js";
import fs from "fs";

describe("Logger Unit Tests", () => {
  // ==================== LOGGER CONFIGURATION ====================
  describe("Logger Configuration", () => {
    it("should have correct log level", () => {
      expect(logger.level).to.equal("info");
    });

    it("should have three transports (Console, Daily Rotate, Error Rotate)", () => {
      expect(logger.transports).to.have.lengthOf(3);
    });

    it("should create logs directory", () => {
      expect(fs.existsSync("logs")).to.be.true;
    });
  });

  // ==================== BASIC LOGGING ====================
  describe("Basic Logging", () => {
    it("should log info messages without errors", () => {
      expect(() => logger.info(faker.lorem.sentence())).to.not.throw();
    });

    it("should log error messages without errors", () => {
      expect(() => logger.error(faker.lorem.sentence())).to.not.throw();
    });

    it("should log warn messages without errors", () => {
      expect(() => logger.warn(faker.lorem.sentence())).to.not.throw();
    });

    it("should log debug messages without errors", () => {
      expect(() => logger.debug(faker.lorem.sentence())).to.not.throw();
    });
  });

  // ==================== LOGGING WITH METADATA ====================
  describe("Logging with Metadata", () => {
    it("should log messages with metadata", () => {
      expect(() =>
        logger.info(faker.lorem.sentence(), {
          userId: faker.database.mongodbObjectId(),
          action: faker.lorem.word(),
          ip: faker.internet.ip(),
        })
      ).to.not.throw();
    });

    it("should log errors with stack traces", () => {
      const error = new Error(faker.lorem.sentence());
      expect(() =>
        logger.error("Error occurred", {
          error: error.message,
          stack: error.stack,
          statusCode: 500,
        })
      ).to.not.throw();
    });

    it("should log HTTP request data", () => {
      expect(() =>
        logger.info("HTTP Request", {
          method: "GET",
          url: "/api/users",
          statusCode: 200,
          ip: faker.internet.ip(),
        })
      ).to.not.throw();
    });
  });

  // ==================== REAL-WORLD USE CASES ====================
  describe("Real-world Use Cases", () => {
    it("should log authentication events", () => {
      expect(() =>
        logger.info("User login", {
          userId: faker.database.mongodbObjectId(),
          email: faker.internet.email(),
          success: true,
        })
      ).to.not.throw();
    });

    it("should log validation errors", () => {
      expect(() =>
        logger.warn("Validation failed", {
          field: "email",
          value: "invalid-email",
        })
      ).to.not.throw();
    });

    it("should log business events", () => {
      expect(() =>
        logger.info("Order created", {
          orderId: faker.database.mongodbObjectId(),
          total: parseFloat(faker.commerce.price()),
        })
      ).to.not.throw();
    });
  });
});

