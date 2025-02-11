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

/**
 * @swagger
 * /api/v1/drugs/excel:
 *   post:
 *     summary: Add multiple drugs from an Excel file
 *     description: Upload an Excel file to add multiple drugs at once.
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
 *                 description: Excel file containing drug data
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
 *     summary: Add a new drug
 *     description: Add a new drug to the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Drug name
 *               description:
 *                 type: string
 *                 description: Drug description
 *               price:
 *                 type: number
 *                 description: Drug price
 *     responses:
 *       201:
 *         description: Drug added successfully
 *   get:
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
drugRouter
  .route("/")
  .post(protectedRoutes, addDrugValidator, addDrug)
  .get(getAllDrugs);

/**
 * @swagger
 * /api/v1/drugs/{id}:
 *   get:
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
 *     summary: Update a drug by ID
 *     description: Update details of a specific drug by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Drug ID
 *     responses:
 *       200:
 *         description: Drug updated successfully
 *   delete:
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
  .put(protectedRoutes, updateDrugValidator, updateDrug)
  .delete(protectedRoutes, deleteDrugValidator, deleteDrug);

export default drugRouter;
