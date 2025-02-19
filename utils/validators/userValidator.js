/* eslint-disable import/no-extraneous-dependencies */
import { body, check } from "express-validator";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import UserModel from "../../models/User.model.js";

/**
 * @description  Validate user creation request
 * @route        POST /api/v1/users
 * @access       Private (Admin only)
 */
const createUserValidator = [
  // Validate email (required, correct format, and must be unique)
  check("email")
    .notEmpty()
    .withMessage("Email is required")
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

  // Validate password (required, minimum length, and matches rePassword)
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .custom((password, { req }) => {
      if (password !== req.body.rePassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  // Ensure rePassword is provided
  check("rePassword")
    .notEmpty()
    .withMessage("Password confirmation is required"),

  // Ensure identification number is unique if provided
  check("identificationNumber")
    .optional()
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ identificationNumber: val });
        if (user) {
          throw new Error("Identification number already in use");
        }
      })
    ),

  // Ensure registration number is unique if provided
  check("registrationNumber")
    .optional()
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ registrationNumber: val });
        if (user) {
          throw new Error("Registration number already in use");
        }
      })
    ),

  // Ensure role is provided
  check("role").notEmpty().withMessage("Role is required"),

  // // Sanitize and validate license document
  // body("licenseDocument").customSanitizer((value, { req }) => {
  //   if (req.file && req.file.path) {
  //     return req.file.path;
  //   }
  //   return value;
  // }),

  // Apply validation middleware
  validatorMiddleware,
];

/**
 * @description  Validate request for retrieving a specific user
 * @route        GET /api/v1/users/:id
 * @access       Private (Admin only)
 */
const getSpecificUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  validatorMiddleware,
];

/**
 * @description  Validate request for updating user activation status
 * @route        PATCH /api/v1/users/:id/active
 * @access       Private (Admin only)
 */
const activeValidator = [
  check("active")
    .isBoolean()
    .withMessage("The 'active' field must be a boolean value"),
  validatorMiddleware,
];

/**
 * @description  Validate request for updating user details
 * @route        PATCH /api/v1/users/:id
 * @access       Private (Admin & User)
 */
const updateUserValidator = [
  // Validate user ID
  check("id").isMongoId().withMessage("Invalid user ID"),

  // Validate email (if provided) and ensure uniqueness
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .custom(
      asyncHandler(async (val, { req }) => {
        const user = await UserModel.findOne({ email: val });
        if (user && user._id.toString() !== req.params.id) {
          throw new Error("Email already in use");
        }
      })
    ),

  // Apply validation middleware
  validatorMiddleware,
];

/**
 * @description  Validate request for deleting a user
 * @route        DELETE /api/v1/users/:id
 * @access       Private (Admin only)
 */
const deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  validatorMiddleware,
];

/**
 * @description  Validate request for changing user password
 * @route        PATCH /api/v1/users/:id/password
 * @access       Private (User only)
 */
const changePasswordValidator = [
  // Validate user ID
  check("id").isMongoId().withMessage("Invalid user ID"),

  // Ensure current password is provided
  check("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),

  // Ensure rePassword is provided
  check("rePassword")
    .notEmpty()
    .withMessage("You must enter the password confirmation"),

  // Validate new password and ensure it is different from the current password
  check("password")
    .notEmpty()
    .withMessage("You must enter a new password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .custom(async (val, { req }) => {
      // Fetch user from database
      const user = await UserModel.findById(req.params.id);
      if (!user) throw new Error("User not found");

      // Verify current password
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error("Incorrect current password");
      }

      // Ensure new password matches rePassword
      if (val !== req.body.rePassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),
  
  // Apply validation middleware
  validatorMiddleware,
];

export {
  createUserValidator,
  deleteUserValidator,
  updateUserValidator,
  getSpecificUserValidator,
  activeValidator,
  changePasswordValidator,
};
