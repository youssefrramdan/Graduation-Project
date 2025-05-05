import mongoose from "mongoose";
import app from "./app.js";
import { testExpirationCheck } from "./jobs/drugExpirationJob.js";

const URI =
  "mongodb+srv://graduation:I8T0hkYwmZOZra90@cluster0.thjdh.mongodb.net/Graduation-Project?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(URI)
  .then(() => {
    console.log("Connected to MongoDB");
    return testExpirationCheck();
  })
  .then(() => {
    console.log("Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
