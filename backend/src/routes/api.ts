import { Router } from 'express';
import { authenticateJWT, authorizeAdmin } from '../middlewares/auth';
import * as authController from '../controllers/authController';
import * as notificationController from '../controllers/notificationController';
import * as templateController from '../controllers/templateController';
import * as userController from '../controllers/userController';
import * as preferencesController from '../controllers/preferencesController';
import * as analyticsController from '../controllers/analyticsController';
import * as adminController from '../controllers/adminController';

const router = Router();

// Authentication Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google-login', authController.googleLogin);

// Protected routes middleware
router.use(authenticateJWT as any);

// User & Profiles
router.get('/users/profile', userController.getProfile as any);
router.get('/users', userController.getUsers as any);

// User Preferences
router.get('/preferences', preferencesController.getPreferences as any);
router.put('/preferences', preferencesController.updatePreferences as any);

// Notifications
router.post('/notifications', notificationController.createNotification as any);
router.get('/notifications', notificationController.getNotifications as any);
router.get('/notifications/:id', notificationController.getNotificationDetails as any);
router.post('/notifications/:id/cancel', notificationController.cancelNotification as any);

// Templates
router.post('/templates', templateController.createTemplate);
router.get('/templates', templateController.getTemplates);
router.get('/templates/:id', templateController.getTemplateDetails);
router.put('/templates/:id', templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// Analytics
router.get('/analytics', analyticsController.getAnalyticsSummary);

// Admin Routes (Authorize Admin check)
router.get('/admin/queue', authorizeAdmin as any, adminController.getQueueItems);
router.post('/admin/retry', authorizeAdmin as any, adminController.retryQueueItem);
router.get('/admin/logs', authorizeAdmin as any, adminController.getSystemLogs);
router.post('/admin/trigger-event', authorizeAdmin as any, adminController.triggerBulkEvent as any);

export default router;
