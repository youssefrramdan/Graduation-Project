import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import categoryRouter from "./routes/category.routes.js";

dotenv.config({ path: "./config/config.env" });

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// mount Routes 
app.use("/categories", categoryRouter);

app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

export default app;
