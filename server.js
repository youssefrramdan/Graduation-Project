import app from "./app.js";
import databaseConnection from "./config/database.config.js";

databaseConnection();

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`server is running on port ${PORT} ...`);
});

process.on("unhandledRejection", (err) => {
  console.error(`unhandledRejection Error : ${err.name} | ${err.message}`);
  server.close(() => {
    console.error(`Shutting down ...`);
    process.exit(1);
  });
});

// What about errors that happen synchronously outside Express?
// For example, if an error occurs before Express starts,
//  it won't be caught by Express error handling middleware.

process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.name} | ${err.message}`);
  // Gracefully shutting down
  process.exit(1); // Exit immediately with failure code
});
