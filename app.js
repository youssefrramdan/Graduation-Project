import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import globalError from "./middlewares/errorMiddleware.js";
import ApiError from "./utils/apiError.js";
import userRouter from "./routes/user.routes.js";

dotenv.config({ path: "./config/config.env" });

const app = express();

// middlewares
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode : ${process.env.NODE_ENV}`);
}

// mount Routes
app.use("/api/v1/users", userRouter);
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
