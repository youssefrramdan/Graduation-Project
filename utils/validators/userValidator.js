/* eslint-disable import/no-extraneous-dependencies */
import { check } from "express-validator";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import UserModel from "../../models/User.model.js";

// Validators
const createUserValidator = [
  check("email")
    .isEmail()
    .withMessage("Invalid email format")
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({
          email: val,
        });
        if (user) {
          throw new Error("Email already in use");
        }
      })
    ),

  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .custom((password, { req }) => {
      // eslint-disable-next-line eqeqeq
      if (password != req.body.rePassword) {
        throw new Error("rePassword in correct");
      }
      return true;
    }),
  check("rePassword")
    .notEmpty()
    .withMessage("rePassword confirmation required"),

  check("name").notEmpty().withMessage("User name is required"),
  check("ownerName").notEmpty().withMessage("Owner name is required"),
  check("phone").isMobilePhone().withMessage("Invalid phone number"),

  check("identificationNumber")
    .notEmpty()
    .withMessage("Identification number is required")
    .custom(
      asyncHandler(async (val) => {
        const user = await UserModel.findOne({ Identification: val });
        if (user) {
          throw new Error("Identification number already in use");
        }
      })
    ),

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

  check("city").notEmpty().withMessage("City is required"),
  check("governorate").notEmpty().withMessage("Governorate is required"),
  check("role").notEmpty().withMessage("Role is required"),

  check("licenseDocument").custom((_, { req }) => {
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

const changePasswordValidator = [
  check("id").isMongoId().withMessage("Invalid user ID"),
  check("currentPassword")
    .notEmpty()
    .withMessage("you must enter your current Password"),
  check("rePassword")
    .notEmpty()
    .withMessage("you must enter the password confirm"),
  check("password")
    .notEmpty()
    .withMessage("you must enter the new password ")
    .custom(async (val, { req }) => {
      // 1) verify current password
      const user = await UserModel.findById(req.params.id);

      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error("incorrect current password");
      }
      if (!user) throw new Error("There is no user for this id");
      // 2) verify password confirmation
      // eslint-disable-next-line eqeqeq
      if (val != req.body.rePassword) {
        throw new Error("rePassword in correct");
      }
      return true;
    }),
  validatorMiddleware,
];

export {
  createUserValidator,
  deleteUserValidator,
  updateUserValidator,
  getSpecificUserValidator,
  changePasswordValidator,
};
