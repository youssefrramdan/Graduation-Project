import asyncHandler from "express-async-handler";
import UserNotification from "../models/UserNotification.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

/**
 * @desc    Create a new notification
 * @route   POST /api/v1/notifications
 * @access  Private
 */
export const createNotification = asyncHandler(async (req, res, next) => {
  const { title, body, imageUrl, type, actionUrl, data } = req.body;

  const notification = await UserNotification.create({
    userId: req.user._id,
    title,
    body,
    imageUrl,
    type,
    actionUrl,
    data,
  });

  res.status(201).json({
    status: "success",
    data: notification,
  });
});

/**
 * @desc    Get all notifications (Admin only)
 * @route   GET /api/v1/notifications
 * @access  Private/Admin
 */
export const getAllNotifications = asyncHandler(async (req, res, next) => {
  // Create base mongoose query
  const mongooseQuery = UserNotification.find()
    .populate("userId", "name email role")
    .select("-expiresAt -createdAt -updatedAt -__v");

  // Build query using ApiFeatures
  const apiFeatures = new ApiFeatures(mongooseQuery, req.query)
    .filter()
    .search(["title", "body"])
    .sort()
    .limitFields();

  // Apply pagination
  await apiFeatures.paginate();

  // Execute query
  const notifications = await apiFeatures.mongooseQuery;

  // Get pagination result
  const paginationResult = apiFeatures.getPaginationResult();

  res.status(200).json({
    status: "success",
    pagination: paginationResult,
    results: notifications.length,
    data: notifications,
  });
});

/**
 * @desc    Get specific notification by ID
 * @route   GET /api/v1/notifications/:id
 * @access  Private
 */
export const getNotification = asyncHandler(async (req, res, next) => {
  const notification = await UserNotification.findById(req.params.id).select(
    "-expiresAt -createdAt -updatedAt -__v"
  );

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: notification,
  });
});

export const getMyNotifications = asyncHandler(async (req, res, next) => {
  // Create base mongoose query
  const mongooseQuery = UserNotification.find({ userId: req.user._id })
    .populate("userId", "name email role")
    .select("-expiresAt -createdAt -updatedAt -__v");

  // Build query using ApiFeatures
  const apiFeatures = new ApiFeatures(mongooseQuery, req.query)
    .filter()
    .search(["title", "body"])
    .sort()
    .limitFields();

  // Apply pagination
  await apiFeatures.paginate();

  // Execute query
  const notifications = await apiFeatures.mongooseQuery;

  // Get pagination result
  const paginationResult = apiFeatures.getPaginationResult();

  res.status(200).json({
    status: "success",
    pagination: paginationResult,
    results: notifications.length,
    data: notifications,
  });
});

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/v1/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.params;

  const notification = await UserNotification.findOneAndUpdate(
    {
      _id: notificationId,
      userId: req.user._id,
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: notification,
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res, next) => {
  await UserNotification.updateMany(
    {
      userId: req.user._id,
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/v1/notifications/:notificationId
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.params;

  const notification = await UserNotification.findOneAndDelete({
    _id: notificationId,
    userId: req.user._id,
  });

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Notification deleted successfully",
  });
});

/**
 * @desc    Get unread notifications count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res, next) => {
  const count = await UserNotification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    status: "success",
    data: {
      unreadCount: count,
    },
  });
});
