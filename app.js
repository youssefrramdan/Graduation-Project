import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import globalError from "./middlewares/errorMiddleware.js";
import ApiError from "./utils/apiError.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import drugRouter from "./routes/drug.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";

dotenv.config({ path: "./config/config.env" });

const app = express();
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Pflow API",
      version: "1.0.0",
      description: "API Documentation for the Storage and Pharmacy system",
    },
    servers: [
      {
        url: "https://pflow-api-v3-1655e5b56c39.herokuapp.com",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user management endpoints",
      },
      {
        name: "Users",
        description: "Endpoints for managing users",
      },
      {
        name: "Drugs",
        description: "Endpoints for managing drugs",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/apidocs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(compression());
// middlewares

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode : ${process.env.NODE_ENV}`);
}

// mount Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/drugs", drugRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", orderRouter);
app.all("*", (req, res, next) => {
  next(new ApiError(`Cant find this route ${req.originalUrl}`, 400));
});

app.use(globalError);

process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Error : ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down ...`);
    process.exit(1);
  });
});
// What about errors that happen synchronously outside Express?
// For example, if an error occurs before Express starts,
//  it won't be caught by Express error handling middleware.

process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.name} | ${err.message}`);
  // Gracefully shutting down
  process.exit(1); // Exit immediately with failure code
});

export default app;
