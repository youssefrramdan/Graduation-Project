import app from "./app.js";
import databaseConnection from "./config/database.config.js";

databaseConnection();

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`server is running ${PORT} ....`);
});

/**
 * Gracefully shutdown the server
 * @param {string} signal - The signal that triggered the shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log("Process terminated");
      process.exit(0);
    });
  }
};

/**
 * Handle unexpected errors
 * @param {Error} error - The error that occurred
 */
const unexpectedErrorHandler = (error) => {
  console.log(error);
  if (server) {
    console.log("Server is shutting down due to unexpected error...");
    process.exit(1);
  } else {
    process.exit(1);
  }
};

// Handle errors that occur within promises but weren't caught
process.on("unhandledRejection", unexpectedErrorHandler);

// Handle errors that happen synchronously outside Express
process.on("uncaughtException", unexpectedErrorHandler);

// Handle SIGTERM signal (used by container systems)
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle SIGINT signal (Ctrl+C)
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
