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
  allowedFormats = ["jpeg", "jpg", "png", "pdf"]
) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folder,
      resource_type: "auto",
      format: async (req, file) => {
        const ext = file.mimetype.split("/")[1];
        return allowedFormats.includes(ext) ? ext : "jpeg";
      },
      public_id: (req, file) => {
        return `${file.fieldname}-${Date.now()}-${file.originalname}`;
      },
    },
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (!file) {
        return cb(new Error("No file uploaded"), false);
      }
      const ext = file.mimetype.split("/")[1];
      if (allowedFormats.includes(ext)) {
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
