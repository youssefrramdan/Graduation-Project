/* eslint-disable import/no-extraneous-dependencies */
import { matchedData, validationResult } from "express-validator";

// 2- middle ware => catch errors from rules if exist
const validatorMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  // @desc finds the validation errors in this request and wraps them in an object with handy functions
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  req.validData = matchedData(req);
  next();
};
export default  validatorMiddleware ;

// matchedData(req) is a function in express-validator
// that extracts only the validated and sanitized data from the request (req).
//  It ensures that only valid and expected data is processed,
//  preventing unwanted or malicious data from being used in your application.
// 🚀 How matchedData(req) Works Step by Step
// User sends an HTTP request containing data (req.body, req.params, or req.query).
// express-validator validates the data based on defined rules (check(), param()).
// validationResult(req) collects errors (if any).
// matchedData(req) extracts only the validated fields, filtering out any extra, in valid, or unexpected data.
