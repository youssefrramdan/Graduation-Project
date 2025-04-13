/* eslint-disable arrow-body-style */
/* eslint-disable import/no-extraneous-dependencies */

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: "dqicm2ir2",
  api_key: "722638671225421",
  api_secret: "vu7qUoXXgII4RkU3yHHY2q912sg",
});

const createUploader = (
  folder,
  allowedFormats = ["jpeg", "jpg", "png", "pdf", "xlsx","csv"]
) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folder,
      resource_type: "raw",
      public_id: (req, file) =>
        `${file.fieldname}-${Date.now()}-${file.originalname}`,
      format: async (req, file) => {
        const ext = file.originalname.split(".").pop();
        if (allowedFormats.includes(ext)) {
          return ext;
        }
        throw new Error("Invalid file format.");
      },
    },
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
        "text/csv",
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(`Only ${allowedFormats.join(", ")} files are allowed`),
          false
        );
      }
    },
  });
};

export default createUploader;
