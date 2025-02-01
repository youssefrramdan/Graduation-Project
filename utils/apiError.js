// @desc   this class is responsive about operation errors (errors that i can predict)
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? "fail" : "Error";
    this.isOperational = true;
  }
}
// eslint-disable-next-line import/prefer-default-export
export default ApiError ;
 