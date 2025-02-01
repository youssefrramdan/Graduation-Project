import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import categoryRouter from "./routes/category.routes.js";

dotenv.config({ path: "./config/config.env" });

const app = express();


// middlewares
app.use(express.json());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode : ${process.env.NODE_ENV}`);
}
app.all("*", (req, res, next) => {
  next(new ApiError(`Cant find this route ${req.originalUrl}`, 400));
});

// mount Routes
app.use("/categories", categoryRouter);

app.use(globalError);

export default app;
