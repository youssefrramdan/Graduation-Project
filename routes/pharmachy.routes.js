import express from "express";
import {
  createPharmacy,
  deletePharmacy,
  getAllPharmacies,
  getSpecificPharmacy,
  updatePharmacy,
} from "../controllers/pharmacy.controller.js";
import {
  createPharmacyValidator,
  deletePharmacyValidator,
  getSpecificPharmacyValidator,
  updatePharmacyValidator,
} from "../utils/validators/pharmacyValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const pharmacyRouter = express.Router();
const upload = createUploader("pharmacies", ["jpeg", "jpg", "png", "pdf"]);

pharmacyRouter
  .route("/")
  .get(getAllPharmacies)
  .post(
    createPharmacyValidator,
    upload.fields([
      { name: "imageOfPharmacy", maxCount: 1 },
      { name: "licenseDocument", maxCount: 1 },
    ]),
      createPharmacy
  );

pharmacyRouter
  .route("/:id")
  .get(getSpecificPharmacyValidator, getSpecificPharmacy)
  .put(updatePharmacyValidator, updatePharmacy)
  .delete(deletePharmacyValidator, deletePharmacy);

export default pharmacyRouter;

// upload.single("imageOfPharmacy"), async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const imageUrl = await uploadToCloudinary(req.file.buffer);
//     req.body.imageOfPharmacy = imageUrl;

//     next();
//   } catch (error) {
//     res.status(500).json({ message: "Image upload failed", error });
//   }
// },
