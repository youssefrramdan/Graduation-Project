import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  activateMe,
  activateSpecificUser,
  addToFavourite,
  changeUserPassword,
  createUser,
  deactivateMe,
  deleteUser,
  getAdminStatistics,
  getAllUsers,
  getInventoryStatistics,
  getMe,
  getMyFavourite,
  getNearestInventories,
  getSpecificUser,
  removeFromFavourite,
  updateMe,
  updateMyPassword,
  updateUser,
  updateUserImage,
} from "../controllers/User.controller.js";
import {
  activeValidator,
  createUserValidator,
  deleteUserValidator,
  getSpecificUserValidator,
  updateUserValidator,
} from "../utils/validators/userValidator.js";
import { protectedRoutes } from "../controllers/auth.controller.js";

const userRouter = express.Router();
const upload = createUploader("users", ["jpeg", "jpg", "png", "pdf"]);

// user routes

userRouter.route("/getMe").get(protectedRoutes, getMe);
userRouter.route("/updateMe").patch(protectedRoutes, updateMe);
userRouter.route("/updateMyPassword").patch(protectedRoutes, updateMyPassword);
userRouter
  .route("/profileimage")
  .patch(protectedRoutes, upload.single("profileImage"), updateUserImage);
userRouter.route("/deactivate").patch(protectedRoutes, deactivateMe);
userRouter.route("/activate").patch(protectedRoutes, activateMe);

//favourite routes
userRouter.route("/favourite/:inventoryId").post(protectedRoutes, addToFavourite);
userRouter.route("/favourite/:inventoryId").delete(protectedRoutes, removeFromFavourite);
userRouter.route("/favourite").get(protectedRoutes, getMyFavourite);

//statistics routes
userRouter.route("/statisticsAdmin").get(protectedRoutes, getAdminStatistics);
userRouter.route("/statisticsInventory").get(protectedRoutes, getInventoryStatistics);

// admin routes
userRouter.route("/").get(getAllUsers);
userRouter.route("/").post(protectedRoutes, createUserValidator, createUser);
userRouter.route("/inventories").get(protectedRoutes, getNearestInventories);

userRouter.route("/:id").get(getSpecificUserValidator, getSpecificUser);
userRouter.route("/:id").put(protectedRoutes, updateUserValidator, updateUser);
userRouter
  .route("/:id")
  .delete(protectedRoutes, deleteUserValidator, deleteUser);
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword);

userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser);






export default userRouter;
