// eslint-disable-next-line import/no-extraneous-dependencies
import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";

// Validators
const createUserValidator = [
  check("email").isEmail().withMessage("Invalid email format"),
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("name").notEmpty().withMessage("User name is required"),
  check("ownerName").notEmpty().withMessage("Owner name is required"),
  check("phone").isMobilePhone().withMessage("Invalid phone number"),
  check("identificationNumber")
    .notEmpty()
    .withMessage("Identification number is required"),
  check("registrationNumber")
    .notEmpty()
    .withMessage("Registration number is required"),
  check("city").notEmpty().withMessage("City is required"),
  check("governorate").notEmpty().withMessage("Governorate is required"),
  check("licenseDocument").custom((value, { req }) => {
    if (!req.file || !req.file.path) {
      throw new Error("License document is required");
    }
    req.body.licenseDocument = req.file.path;
    return true;
  }),

  validatorMiddleware,
];

const getSpecificUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  validatorMiddleware,
];

const updateUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  check("email").optional().isEmail().withMessage("Invalid email format"),
  check("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
  validatorMiddleware,
];

const deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  validatorMiddleware,
];

export {
  createUserValidator,
  deleteUserValidator,
  updateUserValidator,
  getSpecificUserValidator,
};
