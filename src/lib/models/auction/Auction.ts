/**
 * Auction Model - Mongoose Schema
 * Represents individual auction sessions for tournaments
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Auction interface
export interface IAuction extends Document {
  tournamentId: Types.ObjectId;
  name: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  currentPlayer: Types.ObjectId | null;
  players: Types.ObjectId[];
  soldPlayers: {
    playerId: Types.ObjectId;
    teamId: Types.ObjectId;
    amount: number;
    soldAt: Date;
  }[];
  skippedPlayers: Types.ObjectId[];
  unsoldPlayers: Types.ObjectId[];
  currentBid: Types.ObjectId | null;
  bidHistory: Types.ObjectId[];
  timer: {
    duration: number;
    remaining: number;
    isActive: boolean;
    startTime: Date | null;
  };
  settings: {
    minBid: number;
    minBidIncrement: number;
    timerDuration: number;
    autoPauseOnSold: boolean;
    allowUnsoldReauction: boolean;
    maxBidAmount: number;
    playerOrder: {
      type: string;
      customOrder?: Types.ObjectId[];
      groupWiseOrder?: string[];
    };
    playerGroups: string[];
  };
  statistics: {
    totalSold: number;
    totalUnsold: number;
    totalRevenue: number;
    avgSalePrice: number;
    highestBid: {
      playerId?: Types.ObjectId;
      amount: number;
    };
    lowestBid: {
      playerId?: Types.ObjectId;
      amount: number;
    };
  };
  logs: {
    action: string;
    userId?: Types.ObjectId;
    timestamp: Date;
    details: any;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addPlayer(playerId: string): Promise<IAuction>;
  updateStatus(newStatus: string): Promise<IAuction>;
  setCurrentPlayer(playerId: string): Promise<IAuction>;
  start(): Promise<IAuction>;
  pause(): Promise<IAuction>;
  resume(): Promise<IAuction>;
  end(): Promise<IAuction>;
  nextPlayer(): Promise<IAuction>;
  updatePlayerOrder(orderSettings: any): Promise<void>;
  sortPlayers(): Promise<IAuction>;
  initializeWithCaptains(): Promise<void>;
  endAuction(): Promise<IAuction>;
  sellPlayer(teamId: string, amount: number): Promise<IAuction>;
  updateTimer(): Promise<IAuction>;
  getStatus(): any;
}

// Auction model interface with static methods
export interface IAuctionModel extends Model<IAuction> {
  findByTournament(tournamentId: string): Promise<IAuction[]>;
  findActive(): Promise<IAuction[]>;
  createAuction(auctionData: Partial<IAuction>): Promise<IAuction>;
}

const auctionSchema = new Schema<IAuction>({
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required']
  },
  name: {
    type: String,
    required: [true, 'Auction name is required'],
    trim: true,
    minlength: [3, 'Auction name must be at least 3 characters long'],
    maxlength: [100, 'Auction name cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'completed', 'cancelled'],
    default: 'pending'
  },
  currentPlayer: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  players: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  soldPlayers: [{
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    soldAt: {
      type: Date,
      default: Date.now
    }
  }],
  skippedPlayers: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  unsoldPlayers: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  currentBid: {
    type: Schema.Types.ObjectId,
    ref: 'Bid',
    default: null
  },
  bidHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Bid'
  }],
  timer: {
    duration: {
      type: Number,
      default: 30,
      min: [10, 'Timer duration must be at least 10 seconds']
    },
    remaining: {
      type: Number,
      default: 30
    },
    isActive: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: Date,
      default: null
    }
  },
  settings: {
    minBid: {
      type: Number,
      default: 40,
      min: [20, 'Minimum bid must be at least 20']
    },
    minBidIncrement: {
      type: Number,
      default: 20,
      min: [1, 'Minimum bid increment must be at least 1']
    },
    timerDuration: {
      type: Number,
      default: 30,
      min: [10, 'Timer duration must be at least 10 seconds']
    },
    autoPauseOnSold: {
      type: Boolean,
      default: true
    },
    allowUnsoldReauction: {
      type: Boolean,
      default: true
    },
    maxBidAmount: {
      type: Number,
      default: 1000000,
      min: [1000, 'Maximum bid amount must be at least 1000']
    },
    playerOrder: {
      type: {
        type: String,
        enum: ['default', 'random', 'custom', 'groupWise'],
        default: 'default'
      },
      customOrder: [{
        type: Schema.Types.ObjectId,
        ref: 'Player'
      }],
      groupWiseOrder: [{
        type: String
      }]
    },
    playerGroups: [{
      type: String
    }]
  },
  statistics: {
    totalSold: { type: Number, default: 0 },
    totalUnsold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    avgSalePrice: { type: Number, default: 0 },
    highestBid: {
      playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
      amount: { type: Number, default: 0 }
    },
    lowestBid: {
      playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
      amount: { type: Number, default: Number.MAX_SAFE_INTEGER }
    }
  },
  logs: [{
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: { type: Schema.Types.Mixed }
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform(doc, ret: any) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
auctionSchema.index({ tournamentId: 1 });
auctionSchema.index({ status: 1 });
auctionSchema.index({ 'soldPlayers.playerId': 1 });
auctionSchema.index({ 'soldPlayers.teamId': 1 });

// Virtual for remaining players
auctionSchema.virtual('remainingPlayers').get(function() {
  const sold = new Set(this.soldPlayers.map(sp => sp.playerId.toString()));
  const unsold = new Set(this.unsoldPlayers.map(id => id.toString()));
  const skipped = new Set(this.skippedPlayers.map(id => id.toString()));
  
  return this.players.filter(playerId => {
    const id = playerId.toString();
    return !sold.has(id) && !unsold.has(id) && !skipped.has(id);
  });
});

// Instance methods
auctionSchema.methods.addPlayer = async function(playerId: string): Promise<IAuction> {
  if (!this.players.includes(playerId as any)) {
    this.players.push(playerId as any);
  }
  return this.save();
};

auctionSchema.methods.updateStatus = function(newStatus: string): Promise<IAuction> {
  this.status = newStatus as any;
  return this.save();
};

auctionSchema.methods.setCurrentPlayer = function(playerId: string): Promise<IAuction> {
  this.currentPlayer = playerId as any;
  return this.save();
};

// Start auction
auctionSchema.methods.start = async function(): Promise<IAuction> {
  if (this.status !== 'pending') {
    throw new Error('Auction can only be started from pending status');
  }
  
  if (this.players.length === 0) {
    throw new Error('Cannot start auction with no players');
  }
  
  // Sort players based on settings
  await this.sortPlayers();
  
  // Set first player as current
  const remainingPlayers = this.remainingPlayers;
  if (remainingPlayers.length > 0) {
    this.currentPlayer = remainingPlayers[0];
    this.timer.isActive = true;
    this.timer.startTime = new Date();
    this.timer.remaining = this.timer.duration;
  }
  
  this.status = 'active';
  
  this.logs.push({
    action: 'auction_started',
    timestamp: new Date()
  });
  
  return this.save();
};

// Other method implementations would follow...
// For brevity, I'm including the key static methods

// Static methods
auctionSchema.statics.findByTournament = function(tournamentId: string): Promise<IAuction[]> {
  return this.find({ tournamentId });
};

auctionSchema.statics.findActive = function(): Promise<IAuction[]> {
  return this.find({ status: 'active' });
};

auctionSchema.statics.createAuction = async function(auctionData: Partial<IAuction>): Promise<IAuction> {
  try {
    const auction = new this(auctionData);
    await auction.validate();
    return await auction.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const Auction = (mongoose.models.Auction || mongoose.model<IAuction, IAuctionModel>('Auction', auctionSchema)) as IAuctionModel;

export default Auction;
