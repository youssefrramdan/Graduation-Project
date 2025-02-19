import mongoose from "mongoose";
import UserModel from "../models/User.model.js";

const databaseConnection = async () => {
  mongoose
    .connect(process.env.DB_URI)
    .then((conn) => {
      console.log(`Database connected :${conn.connection.host}`);
      return UserModel.syncIndexes();
    })
    .then(() => {
      console.log("✅ Indexes synchronized successfully!");
    })
    .catch((err) => {
      console.error(`Database error ${err}`);
      process.exit(1);
    });
};

export default databaseConnection;