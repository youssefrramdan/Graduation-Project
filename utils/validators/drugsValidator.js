import { check, body } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import CategoryModel from "../../models/Category.model.js";

const addDrugValidator = [
  check("name")
    .notEmpty()
    .withMessage("Drug name is required.")
    .trim()
    .toLowerCase(),

  check("manufacturer")
    .notEmpty()
    .withMessage("Manufacturer is required.")
    .trim(),

  check("originType").notEmpty().withMessage("Origin Type required'."),
  check("category")
    .notEmpty()
    .withMessage("category required'.")
    .custom(async (val, { req }) => {
      const category = await CategoryModel.find({ val });
      if (!category) {
        throw new Error("Category not Found Please Enter Valid Category !!");
      }
      return true;
    }),

  check("productionDate")
    .isISO8601()
    .toDate()
    .withMessage("Invalid production date.")
    .custom((val, { req }) => {
      if (val > new Date(req.body.expirationDate)) {
        throw new Error("Production date must be before expiration date.");
      }
      return true;
    }),

  check("expirationDate")
    .isISO8601()
    .toDate()
    .withMessage("Invalid expiration date.")
    .custom((val) => {
      if (val < new Date()) {
        throw new Error("Expiration date must be in the future.");
      }
      return true;
    }),

  check("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number."),

  check("discount")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100."),

  check("stock").isInt({ min: 0 }).withMessage("Stock must be 0 or more."),

  check("sold").isInt({ min: 0 }).withMessage("Sold must be 0 or more."),

  check("isVisible")
    .isBoolean()
    .withMessage("isVisible must be true or false."),

  check("discountedPrice")
    .optional()
    .isFloat({ min: 0 })
    .custom((val, { req }) => {
      const expectedPrice = parseFloat(
        (req.body.price - (req.body.price * req.body.discount) / 100).toFixed(2)
      );
      if (parseFloat(val.toFixed(2)) !== expectedPrice) {
        throw new Error(
          `Discounted price calculation is incorrect. Expected ${expectedPrice}`
        );
      }
      return true;
    }),
  validatorMiddleware,
];

const getSpecificDrugValidator = [
  check("id").isMongoId().withMessage("Invalid drug ID"),
  validatorMiddleware,
];

const updateDrugValidator = [
  check("id").isMongoId().withMessage("Invalid drug ID"),
  validatorMiddleware,
];

const deleteDrugValidator = [
  check("id").isMongoId().withMessage("Invalid drug ID"),
  validatorMiddleware,
];

const addDrugsFromExcelValidator = [
  check("startRow")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Start row must be a positive integer."),

  check("endRow")
    .optional()
    .isInt({ min: 1 })
    .withMessage("End row must be a positive integer greater than 0."),
  check("category")
    .notEmpty()
    .withMessage("category required.")
    .custom(async (val, { req }) => {
      const category = await CategoryModel.find({ val });
      if (!category) {
        throw new Error("Category not Found Please Enter Valid Category !!");
      }
      return true;
    }),

  validatorMiddleware,
];

const analyzeMedicineImageValidator = [
  body("image")
    .optional()
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error("Medicine image is required");
      }
      return true;
    }),
  validatorMiddleware,
];

export {
  addDrugValidator,
  getSpecificDrugValidator,
  updateDrugValidator,
  deleteDrugValidator,
  addDrugsFromExcelValidator,
  analyzeMedicineImageValidator,
};
