/**
 * MongoDB Database Configuration
 * Using Mongoose ODM for MongoDB Atlas integration
 */

import mongoose, { Connection } from 'mongoose';

class Database {
  private isConnected: boolean = false;
  private connection: Connection | null = null;

  async connect(): Promise<Connection | null> {
    try {
      if (this.isConnected && this.connection) {
        console.log('MongoDB already connected');
        return this.connection;
      }

      const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-app';
      const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'auction-app';

      console.log('Connecting to MongoDB...');
      
      // Ensure database name is in the URI
      let connectionUri = MONGODB_URI;
      if (!connectionUri.includes('/') || connectionUri.endsWith('/')) {
        connectionUri = connectionUri.replace(/\/$/, '') + '/' + MONGODB_DB_NAME;
      }
      
      // Connect to MongoDB
      await mongoose.connect(connectionUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });
      
      this.connection = mongoose.connection;
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.connection = null;
      console.log('✅ MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection(): Connection | null {
    return this.connection;
  }

  isDbConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
const database = new Database();

// Next.js specific: Prevent multiple connections in development
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = database.connect();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default database;
