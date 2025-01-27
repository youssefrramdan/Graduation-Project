import mongoose from "mongoose" ;

// 1- create schema
const categorySchema = new mongoose.Schema({
  name: String,
});
// 2- create model
const categoryModel = new mongoose.model("Category", categorySchema);

export default categoryModel;