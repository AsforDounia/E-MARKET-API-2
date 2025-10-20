import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit"
import MongoStore from "rate-limit-mongo";

const securityMiddlewares = (app) => {
  //middlware pour sécuriser les headers HTTP
  app.use(helmet());

  // middleware pour autoriser les requetes cross-origin
  app.use(cors());

  const limiter = rateLimit({
    store : new MongoStore({
        uri: process.env.MONGO_URI,
        expireTimeMs : 15 * 60 * 1000,
        collectionNane: "requestLimits"
    }),
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Request limit exceeded. Please wait before trying again"
  });

  app.use(limiter);
}

export default securityMiddlewares;
