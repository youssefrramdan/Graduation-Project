import dotenv from "dotenv";
import fs from "fs";
// eslint-disable-next-line import/no-extraneous-dependencies
import "colors";
import DrugModel from "../../models/Drug.model.js";
import databaseConnection from "../../config/database.config.js";

dotenv.config({ path: "../../config/config.env" });

// connect to DB
databaseConnection();

// Read data
const products = JSON.parse(fs.readFileSync("./drugs.json"));

// Insert data into DB
const insertData = async () => {
  try {
    await DrugModel.create(products);
    console.log("Data Inserted".green.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// Delete data from DB
const destroyData = async () => {
  try {
    await DrugModel.deleteMany();
    console.log("Data Destroyed".red.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};


if (process.argv[2] === "-i") {  // node seeder.js -i
  insertData();
} else if (process.argv[2] === "-d") {  // node seeder.js -d
  destroyData();
}
