/* eslint-disable import/no-extraneous-dependencies */
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import globalError from "./middlewares/errorMiddleware.js";
import ApiError from "./utils/apiError.js";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import drugRouter from "./routes/drug.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";
import categoryRouter from "./routes/category.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import "./jobs/drugExpirationJob.js";

dotenv.config({ path: "./config/config.env" });

const app = express();

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
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/orders", orderRouter);

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.all("*", (req, res, next) => {
  next(new ApiError(`Cant find this route ${req.originalUrl}`, 400));
});

app.use(globalError);

export default app;
