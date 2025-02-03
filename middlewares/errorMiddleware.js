import ApiError from "../utils/apiError.js";

const handleJwtInvalidSignature=() =>
  new ApiError("Invalid token, please login again..",401)

const handleJwtInvalidExpired=() =>
  new ApiError("Expired token, please login again..",401)

const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(err, res);
  } else {
    if(err.name === 'JsonWebTokenError') err = handleJwtInvalidSignature();
    if(err.name === 'TokenExpiredError') err = handleJwtInvalidExpired();
    sendErrorForProd(err, res);
  }
};
const sendErrorForDev = (err, res) => res.status(400).json({
    status: err.status,
    Error: err,
    message: err.message,
    stack: err.stack,
  });

const sendErrorForProd = (err, res) => res.status(400).json({
    status: err.status,
    message: err.message,
  });
export default globalError;
