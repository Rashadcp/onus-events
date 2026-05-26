import { Router } from 'express';
import { authGuard, roleGuard, loginRateLimiter } from './middlewares/authMiddleware';

// 1. Auth Controllers
import { register, login, refresh, logout, changePassword } from './modules/auth/auth.controller';

// 2. Inventory Controllers
import { 
  createItem, 
  getItems, 
  getItemByCode, 
  updateItem, 
  deleteItem, 
  groupSubItems,
  getStockLogs,
  checkItemAvailability
} from './modules/inventory/inventory.controller';

// 3. Events Controllers
import { 
  createEvent, 
  getEvents, 
  getEventById, 
  deleteEvent, 
  recoverEvent, 
  confirmDepartment,
  updateEventStatus,
  updateEvent
} from './modules/events/events.controller';

// 4. Logistics Controllers
import { getLogisticsLog, updateLogisticsLog } from './modules/logistics/logistics.controller';

// 5. Reports Controllers
import { getRepresentativeBilling, getCaptainSchedule } from './modules/reports/reports.controller';

// 6. User Management Controllers
import { createUser, getUsers, updateUser, deleteUser } from './modules/users/users.controller';

// 7. Billing Controllers
import {
  createBillingDocument,
  getBillingDocuments,
  getBillingDocumentById,
  priceBillingDocument,
  convertQuotationToInvoice,
  downloadBillingPdf
} from './modules/billing/billing.controller';

const router = Router();

/**
 * ==============================================================
 *                       1. AUTHENTICATION
 * ==============================================================
 */
// Register (If DB is empty, anyone can register. If DB has users, requires ADMIN credentials)
router.post('/auth/register', (req, res, next) => {
  next();
}, register);

// Secure Login (Protected by rate limiter)
router.post('/auth/login', loginRateLimiter, login);

// Silent Token Refresh
router.post('/auth/refresh', refresh);

// Secure Logout
router.post('/auth/logout', logout);

// Change Password (Requires valid token session)
router.post('/auth/change-password', authGuard, changePassword);


/**
 * ==============================================================
 *                       2. INVENTORY SYSTEM
 * ==============================================================
 */
// Retrieve all items (Available to all logged-in users)
router.get('/inventory', authGuard, getItems);

// Retrieve item by code (Available to all logged-in users)
router.get('/inventory/:itemCode', authGuard, getItemByCode);

// Query real-time availability of an item over dates (Available to all logged-in users)
router.get('/inventory/:itemId/availability', authGuard, checkItemAvailability);

// Add new item (Restricted to Admin)
router.post('/inventory', authGuard, roleGuard(['ADMIN']), createItem);

// Update existing item (Restricted to Admin)
router.put('/inventory/:itemCode', authGuard, roleGuard(['ADMIN']), updateItem);

// Disable item (Restricted to Admin)
router.delete('/inventory/:itemCode', authGuard, roleGuard(['ADMIN']), deleteItem);

// Group Sub-items (Restricted to Admin)
router.post('/inventory/:itemCode/sub-items', authGuard, roleGuard(['ADMIN']), groupSubItems);

// Retrieve stock transaction logs (Restricted to Admin)
router.get('/inventory/logs', authGuard, roleGuard(['ADMIN']), getStockLogs);


/**
 * ==============================================================
 *                       3. EVENTS & BOOKINGS
 * ==============================================================
 */
// Retrieve all active events (All authenticated roles)
router.get('/events', authGuard, getEvents);

// Retrieve single event details by ID (All authenticated roles)
router.get('/events/:id', authGuard, getEventById);

// Create new event draft (Admin & Sales Representative)
router.post('/events', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), createEvent);

// Update event details (Admin & Sales Representative)
router.put('/events/:id', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), updateEvent);

// Soft delete event booking with identity validation (Admin & Sales Representative)
router.delete('/events/:id', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), deleteEvent);

// Recover / Restore a soft-deleted event booking (Admin Only)
router.post('/events/:id/recover', authGuard, roleGuard(['ADMIN']), recoverEvent);

// Confirm a specific department and deduct active stock levels (Admin & Sales Representative)
router.post('/events/:id/confirm-department', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), confirmDepartment);

// Update event status lifecycle (Admin & Sales Representative)
router.put('/events/:id/status', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), updateEventStatus);


/**
 * ==============================================================
 *                       4. LOGISTICS TRACKING
 * ==============================================================
 */
// Retrieve logistics logs for an event (Available to all logged-in roles)
router.get('/logistics/:eventId', authGuard, getLogisticsLog);

// Create or update a logistics log (Restricted to Admin and Loading Staff)
router.post('/logistics/:eventId', authGuard, roleGuard(['ADMIN', 'LOADING_STAFF']), updateLogisticsLog);


/**
 * ==============================================================
 *                       5. SYSTEM REPORTS & TIMELINES
 * ==============================================================
 */
// Retrieve billing summaries for a Representative (Admin and Representative themselves)
router.get('/reports/representative/:repId', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), getRepresentativeBilling);

// Retrieve active schedules for a Captain/Site Incharge (Admin, Site Incharge and Captain themselves)
router.get('/reports/captain/:captainId', authGuard, roleGuard(['ADMIN', 'SITE_INCHARGE', 'CAPTAIN']), getCaptainSchedule);


/**
 * ==============================================================
 *                       6. USER MANAGEMENT
 * ==============================================================
 */
// Retrieve users (optionally filtered by role) (Admin Only)
router.get('/users', authGuard, roleGuard(['ADMIN']), getUsers);

// Create a new system user (Admin Only)
router.post('/users', authGuard, roleGuard(['ADMIN']), createUser);

// Update a user's details (Admin Only)
router.put('/users/:id', authGuard, roleGuard(['ADMIN']), updateUser);

// Disable or delete a user (Admin Only)
router.delete('/users/:id', authGuard, roleGuard(['ADMIN']), deleteUser);


/**
 * ==============================================================
 *                       7. BILLING DOCUMENTS
 * ==============================================================
 */
router.post('/billing/price', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), priceBillingDocument);

router.get('/billing', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), getBillingDocuments);

router.get('/billing/:id', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), getBillingDocumentById);

router.post('/billing', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), createBillingDocument);

router.post('/billing/:id/convert-to-invoice', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), convertQuotationToInvoice);

router.get('/billing/:id/pdf', authGuard, roleGuard(['ADMIN', 'SALES_REPRESENTATIVE']), downloadBillingPdf);


export default router;
