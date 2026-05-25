import { Router } from 'express';
import { authGuard, roleGuard, loginRateLimiter } from './middlewares/authMiddleware';

// 1. Auth Controllers
import { register, login, refresh, logout } from './modules/auth/auth.controller';

// 2. Inventory Controllers
import { 
  createItem, 
  getItems, 
  getItemByCode, 
  updateItem, 
  deleteItem, 
  groupSubItems 
} from './modules/inventory/inventory.controller';

// 3. Events Controllers
import { 
  createEvent, 
  getEvents, 
  getEventById, 
  deleteEvent, 
  recoverEvent, 
  confirmDepartment 
} from './modules/events/events.controller';

// 4. Logistics Controllers
import { getLogisticsLog, updateLogisticsLog } from './modules/logistics/logistics.controller';

// 5. Reports Controllers
import { getRepresentativeBilling, getCaptainSchedule } from './modules/reports/reports.controller';

// 6. User Management Controllers
import { getUsers, updateUser, deleteUser } from './modules/users/users.controller';

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


/**
 * ==============================================================
 *                       2. INVENTORY SYSTEM
 * ==============================================================
 */
// Retrieve all items (Available to all logged-in users)
router.get('/inventory', authGuard, getItems);

// Retrieve item by code (Available to all logged-in users)
router.get('/inventory/:itemCode', authGuard, getItemByCode);

// Add new item (Restricted to Admin)
router.post('/inventory', authGuard, roleGuard(['ADMIN']), createItem);

// Update existing item (Restricted to Admin)
router.put('/inventory/:itemCode', authGuard, roleGuard(['ADMIN']), updateItem);

// Disable item (Restricted to Admin)
router.delete('/inventory/:itemCode', authGuard, roleGuard(['ADMIN']), deleteItem);

// Group Sub-items (Restricted to Admin)
router.post('/inventory/:itemCode/sub-items', authGuard, roleGuard(['ADMIN']), groupSubItems);


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
router.post('/events', authGuard, roleGuard(['ADMIN', 'REPRESENTATIVE']), createEvent);

// Soft delete event booking with identity validation (Admin & Sales Representative)
router.delete('/events/:id', authGuard, roleGuard(['ADMIN', 'REPRESENTATIVE']), deleteEvent);

// Recover / Restore a soft-deleted event booking (Admin Only)
router.post('/events/:id/recover', authGuard, roleGuard(['ADMIN']), recoverEvent);

// Confirm a specific department and deduct active stock levels (Admin & Sales Representative)
router.post('/events/:id/confirm-department', authGuard, roleGuard(['ADMIN', 'REPRESENTATIVE']), confirmDepartment);


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
router.get('/reports/representative/:repId', authGuard, roleGuard(['ADMIN', 'REPRESENTATIVE']), getRepresentativeBilling);

// Retrieve active schedules for a Captain/Site Incharge (Admin and the Site Incharge themselves)
router.get('/reports/captain/:captainId', authGuard, roleGuard(['ADMIN', 'SITE_INCHARGE']), getCaptainSchedule);


/**
 * ==============================================================
 *                       6. USER MANAGEMENT
 * ==============================================================
 */
// Retrieve users (optionally filtered by role) (Admin Only)
router.get('/users', authGuard, roleGuard(['ADMIN']), getUsers);

// Update a user's details (Admin Only)
router.put('/users/:id', authGuard, roleGuard(['ADMIN']), updateUser);

// Disable or delete a user (Admin Only)
router.delete('/users/:id', authGuard, roleGuard(['ADMIN']), deleteUser);


export default router;
