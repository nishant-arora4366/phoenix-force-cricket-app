/**
 * Player Model - Mongoose Schema
 * Represents cricket players available for auction
 */

import mongoose, { Document, Model, Schema } from 'mongoose';

// Player interface
export interface IPlayer extends Document {
  name: string;
  role: string[];
  battingStyle?: string;
  battingRating?: number;
  bowlingStyle?: string;
  bowlingRating?: number;
  playerGroup?: string[];
  basePrice?: number;
  bio?: string;
  profilePic?: {
    data: Buffer;
    contentType: string;
  };
  profilePicUrl?: string;
  age?: number;
  nationality?: string;
  totalRuns?: number;
  battingAverage?: number;
  strikeRate?: number;
  centuries?: number;
  halfCenturies?: number;
  wickets?: number;
  bowlingAverage?: number;
  economy?: number;
  bowlingStrikeRate?: number;
  catches?: number;
  achievements?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateStats(newStats: Partial<IPlayer>): Promise<IPlayer>;
  addAchievement(achievement: string): Promise<IPlayer>;
}

// Player model interface with static methods
export interface IPlayerModel extends Model<IPlayer> {
  findByRole(role: string): Promise<IPlayer[]>;
  findByRoles(roles: string[]): Promise<IPlayer[]>;
  findByPlayerGroup(group: string): Promise<IPlayer[]>;
  findEligibleForAuction(): Promise<IPlayer[]>;
  createPlayer(playerData: Partial<IPlayer>): Promise<IPlayer>;
}

const playerSchema = new Schema<IPlayer>({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    minlength: [2, 'Player name must be at least 2 characters long'],
    maxlength: [100, 'Player name cannot exceed 100 characters']
  },
  role: {
    type: [String],
    required: [true, 'Player role is required'],
    enum: {
      values: ['batsman', 'bowler', 'wicket-keeper'],
      message: 'Role must be one or more of: batsman, bowler, wicket-keeper'
    },
    validate: {
      validator: function(roles: string[]) {
        if (!roles || roles.length === 0) {
          return false;
        }
        const validRoles = ['batsman', 'bowler', 'wicket-keeper'];
        return roles.every(role => validRoles.includes(role));
      },
      message: 'At least one role must be selected and all roles must be valid'
    },
    set: function(roles: string[]) {
      const roleMap: { [key: string]: string } = {
        'Batsman': 'batsman',
        'Bowler': 'bowler', 
        'Wicket Keeper': 'wicket-keeper',
        'wicket keeper': 'wicket-keeper',
        'wicketkeeper': 'wicket-keeper'
      };
      return roles.map(role => roleMap[role] || role.toLowerCase());
    }
  },
  battingStyle: {
    type: String,
    required: false,
    trim: true
  },
  battingRating: {
    type: Number,
    required: false,
    min: [1, 'Batting rating must be at least 1'],
    max: [10, 'Batting rating cannot exceed 10']
  },
  bowlingStyle: {
    type: String,
    required: false,
    trim: true
  },
  bowlingRating: {
    type: Number,
    required: false,
    min: [1, 'Batting rating must be at least 1'],
    max: [10, 'Bowling rating cannot exceed 10']
  },
  playerGroup: {
    type: [String],
    required: false,
    validate: {
      validator: function(groups: string[]) {
        return !groups || groups.length === 0 || groups.every(group => group && group.trim().length > 0);
      },
      message: 'Player groups must be non-empty strings if provided'
    }
  },
  basePrice: {
    type: Number,
    required: false,
    min: [0, 'Base price cannot be negative']
  },
  bio: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  profilePic: {
    data: Buffer,
    contentType: String
  },
  profilePicUrl: {
    type: String,
    required: false,
    trim: true
  },
  // Stats and additional information
  age: { type: Number, min: 15, max: 50 },
  nationality: { type: String, trim: true },
  
  // Batting statistics
  totalRuns: { type: Number, default: 0, min: 0 },
  battingAverage: { type: Number, default: 0, min: 0 },
  strikeRate: { type: Number, default: 0, min: 0 },
  centuries: { type: Number, default: 0, min: 0 },
  halfCenturies: { type: Number, default: 0, min: 0 },
  
  // Bowling statistics
  wickets: { type: Number, default: 0, min: 0 },
  bowlingAverage: { type: Number, default: 0, min: 0 },
  economy: { type: Number, default: 0, min: 0 },
  bowlingStrikeRate: { type: Number, default: 0, min: 0 },
  
  // Fielding statistics
  catches: { type: Number, default: 0, min: 0 },
  
  // Achievements
  achievements: [{ type: String, trim: true }],
  
  // Active status
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      // Remove sensitive data
      delete ret.__v;
      if (ret.profilePic) {
        delete ret.profilePic;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
playerSchema.index({ name: 1 });
playerSchema.index({ role: 1 });
playerSchema.index({ playerGroup: 1 });
playerSchema.index({ isActive: 1 });
playerSchema.index({ basePrice: 1 });

// Instance methods
playerSchema.methods.updateStats = function(newStats: Partial<IPlayer>): Promise<IPlayer> {
  Object.assign(this, newStats);
  return this.save();
};

playerSchema.methods.addAchievement = function(achievement: string): Promise<IPlayer> {
  this.achievements.push(achievement);
  return this.save();
};

// Static methods
playerSchema.statics.findByRole = function(role: string): Promise<IPlayer[]> {
  return this.find({ role: role, isActive: true });
};

playerSchema.statics.findByRoles = function(roles: string[]): Promise<IPlayer[]> {
  return this.find({ role: { $in: roles }, isActive: true });
};

playerSchema.statics.findByPlayerGroup = function(group: string): Promise<IPlayer[]> {
  return this.find({ playerGroup: group, isActive: true });
};

playerSchema.statics.findEligibleForAuction = function(): Promise<IPlayer[]> {
  return this.find({ 
    isActive: true,
    basePrice: { $gt: 0 }
  }).sort({ basePrice: -1 });
};

playerSchema.statics.createPlayer = async function(playerData: Partial<IPlayer>): Promise<IPlayer> {
  try {
    const player = new this(playerData);
    await player.validate();
    return await player.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const Player = (mongoose.models.Player || mongoose.model<IPlayer, IPlayerModel>('Player', playerSchema)) as IPlayerModel;

export default Player;
