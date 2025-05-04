import asyncHandler from 'express-async-handler';
import UserNotification from '../models/UserNotification.model.js';
import ApiError from '../utils/apiError.js';

/**
 * @desc    Create a new notification
 * @route   POST /api/v1/notifications
 * @access  Private
 */
export const createNotification = asyncHandler(async (req, res, next) => {
  const { title, body, imageUrl, type, actionUrl, data, expiresAt } = req.body;

  const notification = await UserNotification.create({
    userId: req.user._id,
    title,
    body,
    imageUrl,
    type,
    actionUrl,
    data,
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.status(201).json({
    status: 'success',
    data: notification,
  });
});

export const getMyNotifications = asyncHandler(async (req, res, next) => {
  const { filterBy, sort } = req.query;

  // Base query always filters by current user
  const query = { userId: req.user._id };

  // Apply filters based on filterBy parameter
  switch (filterBy) {
    case 'read':
      query.isRead = true;
      break;

    case 'unRead':
      query.isRead = false;
      break;

    case 'active':
      query.expiresAt = { $gt: new Date() };
      break;

    case 'all':
    default:
      // No additional filters needed for 'all'
      break;
  }

  // Create and configure the mongoose query
  let mongooseQuery = UserNotification.find(query);

  // Handle sorting
  if (sort) {
    const sortBy = sort.split(',').join(' ');
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort('-createdAt');
  }

  const notifications = await mongooseQuery;

  res.status(200).json({
    status: 'success',
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
      expiresAt: { $gt: new Date() },
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new ApiError('Notification not found or has expired', 404));
  }

  res.status(200).json({
    status: 'success',
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
      expiresAt: { $gt: new Date() }, // Only mark active notifications as read
    },
    { isRead: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'All active notifications marked as read',
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
    return next(new ApiError('Notification not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted successfully',
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
    expiresAt: { $gt: new Date() },
  });

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount: count,
    },
  });
});

/**
 * @desc    Delete expired notifications
 * @route   DELETE /api/v1/notifications/expired
 * @access  Private
 */
export const deleteExpiredNotifications = asyncHandler(
  async (req, res, next) => {
    const result = await UserNotification.deleteMany({
      userId: req.user._id,
      expiresAt: { $lt: new Date() },
    });

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} expired notifications deleted`,
    });
  }
);
