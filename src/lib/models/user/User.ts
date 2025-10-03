/**
 * User Model - Mongoose Schema
 * Represents users in the system with role-based access
 */

import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '@/lib/config/config';

// User interface
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: string;
  isTemporary: boolean;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    bio?: string;
    phone?: string;
  };
  isActive: boolean;
  lastLogin: Date | null;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  fullName?: string;
  
  // Instance methods
  verifyPassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<IUser>;
}

// User model interface with static methods
export interface IUserModel extends Model<IUser> {
  findByEmailOrUsername(identifier: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: Object.values(config.roles),
    default: config.roles.VIEWER
  },
  isTemporary: {
    type: Boolean,
    default: false
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    phone: {
      type: String,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  },
  toObject: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, config.bcrypt.saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to verify password
userSchema.methods.verifyPassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function(): Promise<IUser> {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function(identifier: string) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  }).select('+password');
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username;
});

// Check if model exists before creating it (for Next.js hot reload)
const User = (mongoose.models.User || mongoose.model<IUser, IUserModel>('User', userSchema)) as IUserModel;

export default User;
