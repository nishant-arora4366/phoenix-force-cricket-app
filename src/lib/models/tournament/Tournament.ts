/**
 * Tournament Model - Mongoose Schema
 * Represents cricket tournaments with auction details
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Tournament interface
export interface ITournament extends Document {
  name: string;
  description: string;
  date: Date;
  format: 'Bilateral' | 'Tri-Series' | 'Quad Series' | 'Mega Auction - Six Teams' | 'Mega Auction - Eight Teams';
  teams: Types.ObjectId[];
  captains: Types.ObjectId[];
  settings: {
    totalTokens: number;
    minBid: number;
    minBidAmount: number;
    incrementMode: 'fixed' | 'custom';
    bidIncrement: number;
    customIncrements: {
      upTo: number;
      increment: number;
    }[];
    timerDuration: number;
    maxPlayersPerTeam: number;
    minPlayersPerTeam: number;
  };
  playerOrder: {
    mode: 'random' | 'basePrice' | 'roles' | 'alphabetical';
    roles?: string[];
    basePriceOrder?: 'asc' | 'desc';
  };
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addTeam(teamId: string): Promise<ITournament>;
  addCaptain(captainId: string): Promise<ITournament>;
  updateStatus(newStatus: string): Promise<ITournament>;
}

// Tournament model interface with static methods
export interface ITournamentModel extends Model<ITournament> {
  findActive(): Promise<ITournament[]>;
  findByCreator(createdBy: string): Promise<ITournament[]>;
  createTournament(tournamentData: Partial<ITournament>): Promise<ITournament>;
}

const tournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    minlength: [3, 'Tournament name must be at least 3 characters long'],
    maxlength: [100, 'Tournament name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Tournament date is required']
  },
  format: {
    type: String,
    required: [true, 'Tournament format is required'],
    enum: {
      values: ['Bilateral', 'Tri-Series', 'Quad Series', 'Mega Auction - Six Teams', 'Mega Auction - Eight Teams'],
      message: 'Format must be one of: Bilateral, Tri-Series, Quad Series, Mega Auction - Six Teams, Mega Auction - Eight Teams'
    }
  },
  teams: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Team'
    }],
    default: []
  },
  captains: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    default: []
  },
  settings: {
    totalTokens: {
      type: Number,
      default: 2000,
      min: [2000, 'Total tokens must be at least 2,000']
    },
    minBid: {
      type: Number,
      default: 40,
      min: [20, 'Minimum bid must be at least 20']
    },
    minBidAmount: {
      type: Number,
      default: 20,
      min: [20, 'Minimum bid amount must be at least 20']
    },
    incrementMode: {
      type: String,
      enum: ['fixed', 'custom'],
      default: 'fixed'
    },
    bidIncrement: {
      type: Number,
      default: 20,
      min: [20, 'Bid increment must be at least 20']
    },
    customIncrements: {
      type: [{
        upTo: {
          type: Number,
          required: true,
          min: [1, 'Up to value must be positive']
        },
        increment: {
          type: Number,
          required: true,
          min: [20, 'Increment must be at least 20']
        }
      }],
      default: []
    },
    timerDuration: {
      type: Number,
      default: 30,
      min: [10, 'Timer duration must be at least 10 seconds']
    },
    maxPlayersPerTeam: {
      type: Number,
      default: 15,
      min: [1, 'Max players per team must be at least 1']
    },
    minPlayersPerTeam: {
      type: Number,
      default: 11,
      min: [1, 'Min players per team must be at least 1']
    }
  },
  playerOrder: {
    mode: {
      type: String,
      enum: ['random', 'basePrice', 'roles', 'alphabetical'],
      default: 'alphabetical'
    },
    roles: {
      type: [{
        type: String,
        enum: ['batsman', 'bowler', 'wicket-keeper']
      }],
      default: []
    },
    basePriceOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ isActive: 1 });
tournamentSchema.index({ createdBy: 1 });
tournamentSchema.index({ date: 1 });

// Virtual for team count
tournamentSchema.virtual('teamCount').get(function() {
  return this.teams?.length || 0;
});

// Virtual for is upcoming
tournamentSchema.virtual('isUpcoming').get(function() {
  return this.date > new Date() && this.status === 'active';
});

// Instance methods
tournamentSchema.methods.addTeam = async function(teamId: string): Promise<ITournament> {
  if (!this.teams) {
    this.teams = [];
  }
  if (!this.teams.includes(teamId as any)) {
    this.teams.push(teamId as any);
  }
  return this.save();
};

tournamentSchema.methods.addCaptain = async function(captainId: string): Promise<ITournament> {
  if (!this.captains) {
    this.captains = [];
  }
  if (!this.captains.includes(captainId as any)) {
    this.captains.push(captainId as any);
  }
  return this.save();
};

tournamentSchema.methods.updateStatus = function(newStatus: string): Promise<ITournament> {
  this.status = newStatus as any;
  return this.save();
};

// Static methods
tournamentSchema.statics.findActive = function(): Promise<ITournament[]> {
  return this.find({ status: 'active', isActive: true });
};

tournamentSchema.statics.findByCreator = function(createdBy: string): Promise<ITournament[]> {
  return this.find({ createdBy, isActive: true });
};

tournamentSchema.statics.createTournament = async function(tournamentData: Partial<ITournament>): Promise<ITournament> {
  try {
    const tournament = new this(tournamentData);
    await tournament.validate();
    return await tournament.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const Tournament = (mongoose.models.Tournament || mongoose.model<ITournament, ITournamentModel>('Tournament', tournamentSchema)) as ITournamentModel;

export default Tournament;
