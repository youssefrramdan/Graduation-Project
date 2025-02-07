/* eslint-disable import/no-extraneous-dependencies */
import { body, check } from "express-validator";
import asyncHandler from "express-async-handler";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import UserModel from "../../models/User.model.js";

/**
 * @description  Validate User Registration
 * @route        POST /api/v1/auth/signup
 * @access       Public
 */
const signUpValidator = [
  // Validate email field (must be a valid email format and unique)
  check("email")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ email: val });
        if (user) {
          throw new Error("Email already in use");
        }
      })
    ),
  // Password validation (minimum length & must match rePassword)
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .custom((password, { req }) => {
      if (password !== req.body.rePassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  // Ensure rePassword is provided
  check("rePassword").notEmpty().withMessage("Password confirmation is required"),

  // Validate required fields for user details
  check("name").notEmpty().withMessage("User name is required"),
  check("ownerName").notEmpty().withMessage("Owner name is required"),
  check("phone").isMobilePhone().withMessage("Invalid phone number"),

  // Ensure identification number is unique and required
  check("identificationNumber")
    .notEmpty()
    .withMessage("Identification number is required")
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ identificationNumber: val });
        if (user) {
          throw new Error("Identification number already in use");
        }
      })
    ),

  // Ensure registration number is unique and required
  check("registrationNumber")
    .notEmpty()
    .withMessage("Registration number is required")
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ registrationNumber: val });
        if (user) {
          throw new Error("Registration number already in use");
        }
      })
    ),

  // Validate address details
  check("city").notEmpty().withMessage("City is required"),
  check("governorate").notEmpty().withMessage("Governorate is required"),

  // Validate role and restrict accepted values
  check("role")
    .notEmpty()
    .withMessage("Role is required")
    .custom((val, { req }) => {
      if (!["pharmacy", "inventory"].includes(req.body.role)) {
        throw new Error("Role must be either 'pharmacy' or 'inventory'");
      }
      return true;
    }),

  // // License document validation (must be provided)
  // body("licenseDocument")
  //   .customSanitizer((value, { req }) => {
  //     if (req.file && req.file.path) {
  //       return req.file.path;
  //     }
  //     return value;
  //   }),

  // Apply validator middleware to handle validation results
  validatorMiddleware,
];

/**
 * @description  Validate User Login
 * @route        POST /api/v1/auth/login
 * @access       Public
 */
const loginValidator = [
  // Ensure email format is valid
  check("email").isEmail().withMessage("Invalid email format"),

  // Ensure password length is valid
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  // Apply validation middleware
  validatorMiddleware,
];

export { signUpValidator, loginValidator };
