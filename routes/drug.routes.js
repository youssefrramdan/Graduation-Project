import express from "express";
import {
  addDrug,
  addDrugsFromExcel,
  deleteDrug,
  getAllDrugs,
  getSpecificDrug,
  updateDrug,
} from "../controllers/drug.controller.js";
import { protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugsFromExcelValidator,
  addDrugValidator,
  deleteDrugValidator,
  getSpecificDrugValidator,
  updateDrugValidator,
} from "../utils/validators/drugsValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const drugRouter = express.Router();
const upload = createUploader("excel-files", ["xlsx"]);
const uploadimg = createUploader("drugs", ["jpeg", "jpg", "png"]);

/**
 * @swagger
 * tags:
 *   - name: Drugs
 *     description: Endpoints for managing drugs and related operations
 */

/**
 * @swagger
 * /api/v1/drugs/excel:
 *   post:
 *     tags: [Drugs]
 *     summary: Add multiple drugs from an Excel file
 *     description: Upload an Excel file or provide an existing file ID to add multiple drugs at once. Only one of `file` or `fileId` should be provided.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing drug data (optional if fileId is provided)
 *               fileId:
 *                 type: string
 *                 description: ID of an existing uploaded file (optional if file is provided)
 *               startRow:
 *                 type: string
 *                 description: Starting row in the Excel file
 *               endRow:
 *                 type: string
 *                 description: Ending row in the Excel file
 *     responses:
 *       201:
 *         description: Drugs added successfully
 *       400:
 *         description: Bad request
 */
drugRouter
  .route("/excel")
  .post(
    protectedRoutes,
    upload.single("file"),
    addDrugsFromExcelValidator,
    addDrugsFromExcel
  );

/**
 * @swagger
 * /api/v1/drugs:
 *   post:
 *     tags: [Drugs]
 *     summary: Add a new drug
 *     description: Add a new drug to the system with an optional image upload.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Drug name
 *               manufacturer:
 *                 type: string
 *                 description: Drug manufacturer
 *               description:
 *                 type: string
 *                 description: Drug description
 *               originType:
 *                 type: string
 *                 description: Origin of the drug (e.g., Imported)
 *               productionDate:
 *                 type: string
 *                 format: date
 *                 description: Production date of the drug
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Expiration date of the drug
 *               price:
 *                 type: number
 *                 description: Drug price
 *               discount:
 *                 type: number
 *                 description: Discount on the drug
 *               stock:
 *                 type: integer
 *                 description: Available stock
 *               sold:
 *                 type: integer
 *                 description: Number of sold items
 *               isVisible:
 *                 type: boolean
 *                 description: Visibility status of the drug
 *               imageCover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image for the drug
 *     responses:
 *       201:
 *         description: Drug added successfully
 *       400:
 *         description: Bad request
 *   get:
 *     tags: [Drugs]
 *     summary: Get all drugs
 *     description: Retrieve a list of all drugs in the system.
 *     responses:
 *       200:
 *         description: A list of drugs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 */
// uploadimg.single("imageCover"), 
drugRouter
  .route("/")
  .post(protectedRoutes,addDrugValidator, addDrug)
  .get(protectedRoutes,getAllDrugs);



/**
 * @swagger
 * /api/v1/drugs/{id}:
 *   get:
 *     tags: [Drugs]
 *     summary: Get a drug by ID
 *     description: Retrieve details of a specific drug by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Drug ID
 *     responses:
 *       200:
 *         description: Drug details
 *   put:
 *     tags: [Drugs]
 *     summary: Update a drug by ID
 *     description: Update details of a specific drug and optionally upload a new image.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Drug ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Drug name
 *               manufacturer:
 *                 type: string
 *                 description: Drug manufacturer
 *               description:
 *                 type: string
 *                 description: Drug description
 *               originType:
 *                 type: string
 *                 description: Origin of the drug (e.g., Imported)
 *               productionDate:
 *                 type: string
 *                 format: date
 *                 description: Production date of the drug
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Expiration date of the drug
 *               price:
 *                 type: number
 *                 description: Drug price
 *               discount:
 *                 type: number
 *                 description: Discount on the drug
 *               stock:
 *                 type: integer
 *                 description: Available stock
 *               sold:
 *                 type: integer
 *                 description: Number of sold items
 *               isVisible:
 *                 type: boolean
 *                 description: Visibility status of the drug
 *               imageCover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image for the drug
 *     responses:
 *       200:
 *         description: Drug updated successfully
 *       400:
 *         description: Bad request
 *   delete:
 *     tags: [Drugs]
 *     summary: Delete a drug by ID
 *     description: Remove a specific drug by its ID from the system.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Drug ID
 *     responses:
 *       200:
 *         description: Drug deleted successfully
 */
drugRouter
  .route("/:id")
  .get(getSpecificDrugValidator, getSpecificDrug)
  .put(
    protectedRoutes,
    uploadimg.single("imageCover"),
    updateDrugValidator,
    updateDrug
  )
  .delete(protectedRoutes, deleteDrugValidator, deleteDrug);

export default drugRouter;
