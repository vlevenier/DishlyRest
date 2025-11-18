import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import rateLimit from 'express-rate-limit';
// @ts-ignore
import usersRoutes from "./routes/test.routes";
import { sanitizeInput } from './middlewares/sanitizeInput';
import categoriesRoutes from "./modules/categories/catergories.routes"
import itemsRoutes from "./modules/products/products.routes"
import productVariantsRoutes from "./modules/product_variants/product_variants.routes"
import productOptionsRoutes from "./modules/product_options/product_options.routes"
import combosRoutes from "./modules/combos/combos.routes"
import ordersRoutes from "./modules/orders/orders.routes"
dotenv.config();

const app: Application = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  message: 'Demasiadas solicitudes desde esta IP. Intenta nuevamente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares de seguridad
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Middlewares de parseo
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(sanitizeInput);

// Logger de requests
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Importar rutas aquí
// import exampleRoutes from './routes/example.routes';
// app.use('/api/v1/examples', exampleRoutes);

app.use("/api/v1/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", itemsRoutes);
app.use("/api/productsVariants", productVariantsRoutes);
app.use("/api/productOptions", productOptionsRoutes);
app.use("/api/combos", combosRoutes);
app.use("/api/orders", ordersRoutes);

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo global de errores
app.use(errorHandler);

export default app;