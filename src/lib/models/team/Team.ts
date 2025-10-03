// @ts-nocheck
/**
 * Team Model - Mongoose Schema
 * Represents teams participating in tournaments
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Team interface
export interface ITeam extends Document {
  name: string;
  tournamentId: Types.ObjectId;
  captainId: Types.ObjectId;
  managerId: Types.ObjectId | null;
  players: {
    playerId: Types.ObjectId;
    amount: number;
    purchasedAt: Date;
    role: 'player' | 'captain' | 'vice-captain';
  }[];
  tokens: number;
  totalSpent: number;
  settings: {
    maxPlayers: number;
    minPlayers: number;
    preferredRoles: string[];
    budgetAllocation: Map<string, number>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  playerCount?: number;
  availableBudget?: number;
  
  // Instance methods
  addPlayer(playerData: { playerId: string; amount: number; role?: string }): Promise<ITeam>;
  removePlayer(playerId: string): Promise<ITeam>;
  updateTokens(newAmount: number): Promise<ITeam>;
  canBid(amount: number): boolean;
  getComposition(): any;
  getStatistics(): any;
  isComplete(): boolean;
  updateSettings(newSettings: Partial<ITeam['settings']>): Promise<ITeam>;
}

// Team model interface with static methods
export interface ITeamModel extends Model<ITeam> {
  findByTournament(tournamentId: string): Promise<ITeam[]>;
  createTeam(teamData: Partial<ITeam>): Promise<ITeam>;
}

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters long'],
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament ID is required']
  },
  captainId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Captain ID is required']
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  players: [{
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      default: 'player',
      enum: ['player', 'captain', 'vice-captain']
    }
  }],
  tokens: {
    type: Number,
    default: 1000000,
    min: [0, 'Tokens cannot be negative']
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total spent cannot be negative']
  },
  settings: {
    maxPlayers: {
      type: Number,
      default: 15,
      min: [1, 'Max players must be at least 1']
    },
    minPlayers: {
      type: Number,
      default: 11,
      min: [1, 'Min players must be at least 1']
    },
    preferredRoles: [{
      type: String,
      enum: ['batsman', 'bowler', 'wicket-keeper']
    }],
    budgetAllocation: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
teamSchema.index({ tournamentId: 1 });
teamSchema.index({ captainId: 1 });
teamSchema.index({ name: 1 });
teamSchema.index({ isActive: 1 });

// Virtual for player count
teamSchema.virtual('playerCount').get(function() {
  return this.players.length;
});

// Virtual for available budget
teamSchema.virtual('availableBudget').get(function() {
  return this.tokens - this.totalSpent;
});

// Instance methods
teamSchema.methods.addPlayer = async function(playerData: { playerId: string; amount: number; role?: string }): Promise<ITeam> {
  if (this.players.some(p => p.playerId.toString() === playerData.playerId)) {
    throw new Error('Player already in team');
  }
  
  if (this.players.length >= this.settings.maxPlayers) {
    throw new Error(`Cannot add more than ${this.settings.maxPlayers} players`);
  }
  
  if (playerData.amount > this.availableBudget) {
    throw new Error('Insufficient budget');
  }
  
  this.players.push({
    playerId: playerData.playerId as any,
    amount: playerData.amount,
    purchasedAt: new Date(),
    role: (playerData.role || 'player') as any
  });
  
  this.totalSpent += playerData.amount;
  this.tokens = this.tokens - playerData.amount;
  
  return this.save();
};

teamSchema.methods.removePlayer = async function(playerId: string): Promise<ITeam> {
  const playerIndex = this.players.findIndex(p => p.playerId.toString() === playerId);
  
  if (playerIndex === -1) {
    throw new Error('Player not found in team');
  }
  
  const player = this.players[playerIndex];
  this.totalSpent -= player.amount;
  this.tokens += player.amount;
  this.players.splice(playerIndex, 1);
  
  return this.save();
};

teamSchema.methods.updateTokens = async function(newAmount: number): Promise<ITeam> {
  if (newAmount < 0) {
    throw new Error('Tokens cannot be negative');
  }
  
  this.tokens = newAmount;
  return this.save();
};

teamSchema.methods.canBid = function(amount: number): boolean {
  return amount <= this.availableBudget;
};

teamSchema.methods.getComposition = function() {
  const composition = {
    batsman: 0,
    bowler: 0,
    'wicket-keeper': 0,
    total: this.players.length
  };
  
  // This would need to be populated with player data
  // to determine roles, but keeping it simple for now
  return {
    ...composition,
    maxPlayers: this.settings.maxPlayers,
    minPlayers: this.settings.minPlayers,
    isComplete: this.players.length >= this.settings.minPlayers &&
                this.players.length <= this.settings.maxPlayers
  };
};

teamSchema.methods.getStatistics = function() {
  const avgPrice = this.players.length > 0 ? 
    this.totalSpent / this.players.length : 0;
  
  const maxPurchase = this.players.length > 0 ?
    Math.max(...this.players.map(p => p.amount)) : 0;
    
  const minPurchase = this.players.length > 0 ?
    Math.min(...this.players.map(p => p.amount)) : 0;
  
  return {
    playerCount: this.players.length,
    totalSpent: this.totalSpent,
    availableBudget: this.availableBudget,
    avgPrice,
    maxPurchase,
    minPurchase
  };
};

teamSchema.methods.isComplete = function(): boolean {
  return this.players.length >= this.settings.minPlayers;
};

teamSchema.methods.updateSettings = function(newSettings: Partial<ITeam['settings']>): Promise<ITeam> {
  Object.assign(this.settings, newSettings);
  return this.save();
};

// Static methods
teamSchema.statics.findByTournament = function(tournamentId: string): Promise<ITeam[]> {
  return this.find({ tournamentId, isActive: true });
};

teamSchema.statics.createTeam = async function(teamData: Partial<ITeam>): Promise<ITeam> {
  try {
    const team = new this(teamData);
    await team.validate();
    return await team.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const Team = (mongoose.models.Team || mongoose.model<ITeam, ITeamModel>('Team', teamSchema)) as ITeamModel;

export default Team;
