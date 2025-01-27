import app from "./app.js";
import databaseConnection from "./config/database.config.js";
databaseConnection();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT} ...`);
});
