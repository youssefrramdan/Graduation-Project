/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable arrow-body-style */
import fetch from "node-fetch";
import xlsx from "xlsx";
import ApiError from "./apiError.js";

// Read Excel File
export const readExcelFile = async (filePath) => {
  const response = await fetch(filePath);
  const buffer = await response.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

export const validateRowRange = ({ startRow, endRow }, dataLength) => {
  if (startRow < 0 || endRow > dataLength || startRow >= endRow) {
    throw new ApiError("Invalid startRow or endRow values.", 404);
  }
};

export const formatDrugData = (data, userId) => {
  const validDrugs = [];
  const invalidDrugs = [];

  data.forEach((item, index) => {
    try {
      // التحقق من الحقول المطلوبة
      if (
        !item.name ||
        !item.price ||
        !item.stock ||
        !item.originType ||
        !item.productionDate ||
        !item.expirationDate
      ) {
        throw new Error("Missing required fields");
      }

      // التحقق من صحة السعر
      if (isNaN(item.price) || item.price <= 0) {
        throw new Error("Invalid price");
      }

      // التحقق من صحة المخزون
      if (isNaN(item.stock) || item.stock < 0) {
        throw new Error("Invalid stock");
      }

      // التحقق من صحة الخصم
      if (
        item.discount &&
        (isNaN(item.discount) || item.discount < 0 || item.discount > 100)
      ) {
        throw new Error("Invalid discount");
      }

      // التحقق من صحة التواريخ
      const productionDate = new Date(item.productionDate);
      const expirationDate = new Date(item.expirationDate);

      if (isNaN(productionDate.getTime()) || isNaN(expirationDate.getTime())) {
        throw new Error("Invalid dates");
      }

      if (expirationDate <= productionDate) {
        throw new Error("Expiration date must be after production date");
      }

      // التحقق من نوع المنتج
      if (!["Imported", "Local"].includes(item.originType)) {
        throw new Error("Invalid origin type");
      }

      // إذا كل شيء تمام، نضيف الدواء للقائمة الصالحة
      validDrugs.push({
        name: item.name,
        manufacturer: item.manufacturer || "",
        description: item.description || "",
        originType: item.originType,
        productionDate,
        expirationDate,
        price: Number(item.price),
        discount: item.discount ? Number(item.discount) : 0,
        discountedPrice: item.discountedPrice
          ? Number(item.discountedPrice)
          : Number(item.price) -
            (Number(item.price) * (Number(item.discount) || 0)) / 100,
        stock: Number(item.stock),
        sold: item.sold ? Number(item.sold) : 0,
        isVisible: item.isVisible === "TRUE",
        imageCover: item.imageCover ? item.imageCover.split(",") : [],
        createdBy: userId,
      });
    } catch (error) {
      invalidDrugs.push({
        row: index + 1,
        data: item,
        error: error.message,
      });
    }
  });

  return {
    validDrugs,
    invalidDrugs,
  };
};

// Step 1: Fetch the file from the given filePath (it can be a local file or a URL).
//  const response = await fetch(filePath);

// Step 2: Convert the response into an ArrayBuffer (raw binary data).
// This format is required for the xlsx library to read the file.
//  const buffer = await response.arrayBuffer();

// Step 3: Read the ArrayBuffer using the xlsx library and parse it as an Excel workbook.
// `type: "buffer"` tells the xlsx library that the input is binary data.
//  const workbook = xlsx.read(buffer, { type: "buffer" });

// Step 4: Extract the name of the first sheet in the workbook.
// Excel files can have multiple sheets. We are focusing on the first one by default.
//  const sheetName = workbook.SheetNames[0];

// Step 5: Convert the contents of the first sheet to JSON format.
// `sheet_to_json` transforms the sheet into an array of objects:
// Each row in the Excel sheet becomes an object where:
// - The keys are the column headers (from the first row in the sheet).
// - The values are the corresponding cell values from that row.
//  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
