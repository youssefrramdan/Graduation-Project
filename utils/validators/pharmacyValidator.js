// eslint-disable-next-line import/no-extraneous-dependencies
import { check } from "express-validator";

// Validators
const createPharmacyValidator = [
  check("email").isEmail().withMessage("Invalid email format"),
  check("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("pharmacyName").notEmpty().withMessage("Pharmacy name is required"),
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
  check("imageOfPharmacy").custom((value, { req }) => {
    if (req.file) {
      req.body.imageOfPharmacy = req.file.path;
    }
    return true;
  }),
];

const getSpecificPharmacyValidator = [
  check("id").isMongoId().withMessage("Invalid pharmacy ID"),
];

const updatePharmacyValidator = [
  check("id").isMongoId().withMessage("Invalid pharmacy ID"),
  check("email").optional().isEmail().withMessage("Invalid email format"),
  check("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  check("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
];

const deletePharmacyValidator = [
  check("id").isMongoId().withMessage("Invalid pharmacy ID"),
];
export {
  createPharmacyValidator,
  deletePharmacyValidator,
  updatePharmacyValidator,
  getSpecificPharmacyValidator,
};
