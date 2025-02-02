// eslint-disable-next-line import/no-extraneous-dependencies
import { check } from "express-validator";

const createInventoryValidator = [
  check("email").isEmail().withMessage("Invalid email format"),
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("storageName").notEmpty().withMessage("Storage name is required"),
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
    if (req.file) {
      req.body.licenseDocument = req.file.path;
    }
    return true;
  }),
];

const getSpecificInventoryValidator = [
  check("id").isMongoId().withMessage("Invalid inventory ID"),
];

const updateInventoryValidator = [
  check("id").isMongoId().withMessage("Invalid inventory ID"),
  check("email").optional().isEmail().withMessage("Invalid email format"),
  check("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
];

const deleteInventoryValidator = [
  check("id").isMongoId().withMessage("Invalid inventory ID"),
];

export {
  createInventoryValidator,
  deleteInventoryValidator,
  updateInventoryValidator,
  getSpecificInventoryValidator,
};
