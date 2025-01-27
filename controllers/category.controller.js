import categoryModel from "../models/Category.model.js";

const getCategories = (req, res) => {
  res.send("our Api");
};

const addCategory = async (req, res) => {
  try {
    const name = req.body.name;
    const newCategory = new categoryModel({ name });
    const doc = await newCategory.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export { getCategories, addCategory };
