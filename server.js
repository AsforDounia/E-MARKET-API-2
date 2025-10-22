import express from 'express';
import connectDB from './config/database.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import couponRoutes from "./routes/couponRoutes.js"
import logger from './middlewares/logger.js';
import notFound from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { swaggerUi, specs } from './swagger/swagger.js';
import {authenticate, authorize} from "./middlewares/auth.js";
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from "./routes/reviewRoutes.js";
import securityMiddlewares from "./middlewares/security.js"
import notificationRoutes from './routes/notificationRoutes.js';


const app = express();

// Connexion à MongoDB
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

//aplication de tous les middlwares de securité (helemt,rate-limit,cors)
securityMiddlewares(app);

// Middleware pour parser JSON
app.use(express.json());
app.use(logger);

// Test route
app.get("/", (req, res) => {
  res.send("E-Market API is running!");
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


// Utiliser les routes de produits
app.use("/products", productRoutes);

// Utiliser les routes d'utilisateurs
app.use("/users", userRoutes);


// Utiliser les routes des categories
app.use("/categories", categoryRoutes);

// Utiliser les routes d'authentification
app.use("/auth", authRoutes);

// Utiliser les routes du panier
app.use("/cart", cartRoutes);

//  Utiliser les routes du commandes
app.use("/orders", orderRoutes);
//Utiliser les routes du coupon
app.use("/coupons", couponRoutes);
// Utiliser les routes du feedback
app.use("/reviews", reviewRoutes);
// Utiliser les routes des notifications
app.use("/notifications", notificationRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
