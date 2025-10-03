/**
 * Application Configuration
 */

export const config = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  bcrypt: {
    saltRounds: 12
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
  },
  roles: {
    ADMIN: 'admin' as const,
    AUCTIONEER: 'auctioneer' as const,
    CAPTAIN: 'captain' as const,
    MANAGER: 'manager' as const,
    BIDDER: 'bidder' as const,
    VIEWER: 'viewer' as const
  },
  auction: {
    defaultTimer: 30, // seconds
    minBidIncrement: 1000,
    maxConcurrentAuctions: 5
  },
  websocket: {
    pingTimeout: 60000,
    pingInterval: 25000
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-app',
    dbName: process.env.MONGODB_DB_NAME || 'auction-app',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    }
  }
} as const;

export type UserRole = typeof config.roles[keyof typeof config.roles];
