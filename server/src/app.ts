import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import apiRoutes from './routes';
import User from './models/User';
import Item from './models/Item';
import { hashPassword } from './utils/authHelper';
import { initWebSocket } from './services/websocket';

// Load environmental variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

// CORS Whitelisting
const allowedOrigins = [
  'http://localhost:3000', // Standard Next.js Dev Client
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true // Allow secure cookies
  })
);

// Payload Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing API Layers
app.use('/api', apiRoutes);

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Automated Database Seeding Logic
async function seedAdminUser() {
  try {
    const defaultPassword = '123';
    const passwordHash = await hashPassword(defaultPassword);

    // Look for any existing admin user by email or legacy username
    const adminUser = await User.findOne({ 
      $or: [
        { email: 'admin@onusevent.com' },
        { username: 'admin' } as any
      ]
    });

    if (!adminUser) {
      console.log('🌱 Seeding default Admin user...');
      await User.create({
        name: 'System Administrator',
        email: 'admin@onus-event.com',
        phone: '0000000000',
        password: passwordHash,
        role: 'ADMIN',
        isActive: true
      });
      console.log('✅ Default Admin seeded successfully!');
    } else {
      console.log('🌱 Migrating and seeding default Admin user...');
      const rawUser = adminUser as any;
      
      // Safe schema migration
      adminUser.name = rawUser.name || rawUser.fullName || 'System Administrator';
      adminUser.phone = rawUser.phone || '0000000000';
      adminUser.password = passwordHash;
      adminUser.role = 'ADMIN';
      adminUser.isActive = true;

      // Clean up legacy keys
      adminUser.set('username', undefined);
      adminUser.set('fullName', undefined);
      adminUser.set('passwordHash', undefined);

      await adminUser.save();
      console.log('✅ Existing Admin migrated and password updated successfully to: 123');
    }

    console.log('---------------------------------------------');
    console.log('Email: admin@onus-event.com');
    console.log(`Password: ${defaultPassword}`);
    console.log('---------------------------------------------');
  } catch (error: any) {
    console.error('⚠️ Seeding admin user failed:', error.message);
  }
}

async function seedInventoryItems() {
  try {
    const count = await Item.countDocuments();
    if (count > 0) {
      console.log(`🌱 Inventory already has ${count} items. Skipping seeding.`);
      return;
    }

    console.log('🌱 Seeding default inventory items across 6 departments...');
    const defaultItems = [
      // COUNTER_DECOR
      {
        itemCode: 'CD-BA-01',
        name: 'Premium Floral Stage Backdrop',
        department: 'COUNTER_DECOR',
        currentStock: 10,
        minimumStock: 2,
        rentalRate: 12000,
        saleRate: 15000,
        warehouse: 'Main Warehouse',
        category: 'Decorations',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'CD-TA-02',
        name: 'VIP Table Flower Centerpiece',
        department: 'COUNTER_DECOR',
        currentStock: 40,
        minimumStock: 5,
        rentalRate: 800,
        saleRate: 1200,
        warehouse: 'Main Warehouse',
        category: 'Decorations',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'CD-WE-03',
        name: 'Wooden Welcome Arch with Ivy',
        department: 'COUNTER_DECOR',
        currentStock: 5,
        minimumStock: 1,
        rentalRate: 3500,
        saleRate: 5000,
        warehouse: 'Main Warehouse',
        category: 'Decorations',
        status: 'AVAILABLE',
        isActive: true
      },
      // CLOTH_DECOR
      {
        itemCode: 'CL-ST-01',
        name: 'Crimson Satin Drapes (Stage)',
        department: 'CLOTH_DECOR',
        currentStock: 15,
        minimumStock: 3,
        rentalRate: 5000,
        saleRate: 6500,
        warehouse: 'Main Warehouse',
        category: 'Drapes',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'CL-CE-02',
        name: 'White Georgette Ceiling Draping',
        department: 'CLOTH_DECOR',
        currentStock: 8,
        minimumStock: 2,
        rentalRate: 8000,
        saleRate: 10000,
        warehouse: 'Main Warehouse',
        category: 'Drapes',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'CL-BA-03',
        name: 'Gold Sequined Photo-booth Curtain',
        department: 'CLOTH_DECOR',
        currentStock: 12,
        minimumStock: 2,
        rentalRate: 2500,
        saleRate: 3500,
        warehouse: 'Main Warehouse',
        category: 'Drapes',
        status: 'AVAILABLE',
        isActive: true
      },
      // RENTAL_ITEMS
      {
        itemCode: 'RI-CH-01',
        name: 'Crossback Wooden Banquet Chair',
        department: 'RENTAL_ITEMS',
        currentStock: 500,
        minimumStock: 50,
        rentalRate: 150,
        saleRate: 350,
        warehouse: 'Furniture Yard',
        category: 'Chairs',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'RI-TA-02',
        name: 'Round Banquet Table (10-Seater)',
        department: 'RENTAL_ITEMS',
        currentStock: 80,
        minimumStock: 10,
        rentalRate: 600,
        saleRate: 1500,
        warehouse: 'Furniture Yard',
        category: 'Tables',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'RI-LI-03',
        name: 'Ambient Bistro String Lights (50m)',
        department: 'RENTAL_ITEMS',
        currentStock: 30,
        minimumStock: 5,
        rentalRate: 1000,
        saleRate: 1800,
        warehouse: 'Main Warehouse',
        category: 'Lighting',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'RI-SO-04',
        name: 'Line Array Professional Sound System',
        department: 'RENTAL_ITEMS',
        currentStock: 4,
        minimumStock: 1,
        rentalRate: 15000,
        saleRate: 250000,
        warehouse: 'Electronics Room',
        category: 'Sound Systems',
        status: 'AVAILABLE',
        isActive: true
      },
      // EXPENSE_CHARGES
      {
        itemCode: 'EX-TR-01',
        name: 'Heavy Transport & Logistics (Within City)',
        department: 'EXPENSE_CHARGES',
        currentStock: 99,
        minimumStock: 5,
        rentalRate: 4500,
        saleRate: 4500,
        warehouse: 'External',
        category: 'Logistics',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'EX-LA-02',
        name: 'Overtime Labor & Setup Charges',
        department: 'EXPENSE_CHARGES',
        currentStock: 99,
        minimumStock: 5,
        rentalRate: 3000,
        saleRate: 3000,
        warehouse: 'External',
        category: 'Logistics',
        status: 'AVAILABLE',
        isActive: true
      },
      // STAFF
      {
        itemCode: 'ST-CP-01',
        name: 'Event Operations Captain (Per Shift)',
        department: 'STAFF',
        currentStock: 15,
        minimumStock: 2,
        rentalRate: 2500,
        saleRate: 2500,
        warehouse: 'External',
        category: 'Personnel',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'ST-SU-02',
        name: 'Site Security Supervisor',
        department: 'STAFF',
        currentStock: 10,
        minimumStock: 2,
        rentalRate: 1800,
        saleRate: 1800,
        warehouse: 'External',
        category: 'Personnel',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'ST-LO-03',
        name: 'Loading & Unloading Crew Member',
        department: 'STAFF',
        currentStock: 30,
        minimumStock: 5,
        rentalRate: 1200,
        saleRate: 1200,
        warehouse: 'External',
        category: 'Personnel',
        status: 'AVAILABLE',
        isActive: true
      },
      // OUTSIDE_RENTAL
      {
        itemCode: 'OR-GE-01',
        name: '125 kVA Silent Generator Set',
        department: 'OUTSIDE_RENTAL',
        currentStock: 3,
        minimumStock: 1,
        rentalRate: 18000,
        saleRate: 18000,
        warehouse: 'External',
        category: 'Generators',
        status: 'AVAILABLE',
        isActive: true
      },
      {
        itemCode: 'OR-LE-02',
        name: 'P3 Outdoor LED Screen (12x8 ft)',
        department: 'OUTSIDE_RENTAL',
        currentStock: 2,
        minimumStock: 1,
        rentalRate: 35000,
        saleRate: 35000,
        warehouse: 'External',
        category: 'Screens',
        status: 'AVAILABLE',
        isActive: true
      }
    ];

    await Item.insertMany(defaultItems);
    console.log('✅ Default inventory items seeded successfully!');
  } catch (error: any) {
    console.error('⚠️ Seeding inventory items failed:', error.message);
  }
}

// Connect to MongoDB & Start Server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/onus-event';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('🌐 Connected successfully to MongoDB Database.');
    
    // Seed default administrator if required
    await seedAdminUser();
    
    // Seed default inventory items if catalog is empty
    await seedInventoryItems();

    // Initialize WebSocket Server
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 API Backend Server (with WebSockets) is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failure:', err.message);
    process.exit(1);
  });

export default app;
