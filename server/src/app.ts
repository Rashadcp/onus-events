import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import User from './models/User';
import { hashPassword } from './utils/authHelper';

// Load environmental variables
dotenv.config();

const app = express();
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

    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('🌱 Seeding default Admin user...');
      const admin = await User.create({
        username: 'admin',
        email: 'admin@onus-event.com',
        passwordHash,
        role: 'ADMIN',
        fullName: 'System Administrator',
        isActive: true
      });
      console.log('✅ Default Admin seeded successfully!');
    } else {
      // Overwrite/Force password to 123
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
      console.log('✅ Existing Admin password updated successfully to: 123');
    }

    console.log('---------------------------------------------');
    console.log('Username: admin');
    console.log(`Password: ${defaultPassword}`);
    console.log('---------------------------------------------');
  } catch (error: any) {
    console.error('⚠️ Seeding admin user failed:', error.message);
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

    app.listen(PORT, () => {
      console.log(`🚀 API Backend Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failure:', err.message);
    process.exit(1);
  });

export default app;
