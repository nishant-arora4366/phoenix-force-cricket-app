/**
 * Bid Model - Mongoose Schema
 * Represents individual bids placed in auctions
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// Bid interface
export interface IBid extends Document {
  auctionId: Types.ObjectId;
  playerId: Types.ObjectId;
  teamId: Types.ObjectId;
  bidderId: Types.ObjectId;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
  isSold: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  timeSinceBid?: string;
  
  // Instance methods
  markAsWinning(): Promise<IBid>;
  markAsNotWinning(): Promise<IBid>;
  markAsSold(): Promise<IBid>;
  updateAmount(newAmount: number): Promise<IBid>;
  addNotes(notes: string): Promise<IBid>;
  getSummary(): any;
  isValidForAuction(auctionSettings: any): boolean;
}

// Bid model interface with static methods
export interface IBidModel extends Model<IBid> {
  findByAuction(auctionId: string): Promise<IBid[]>;
  findWinningBids(auctionId: string): Promise<IBid[]>;
  findHighestBidForPlayer(auctionId: string, playerId: string): Promise<IBid | null>;
  createBid(bidData: Partial<IBid>): Promise<IBid>;
}

const bidSchema = new Schema<IBid>({
  auctionId: {
    type: Schema.Types.ObjectId,
    ref: 'Auction',
    required: [true, 'Auction ID is required']
  },
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player ID is required']
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team ID is required']
  },
  bidderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bidder ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Bid amount is required'],
    min: [20, 'Bid amount must be at least 20']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isWinning: {
    type: Boolean,
    default: false
  },
  isSold: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bidSchema.index({ auctionId: 1 });
bidSchema.index({ playerId: 1 });
bidSchema.index({ teamId: 1 });
bidSchema.index({ bidderId: 1 });
bidSchema.index({ timestamp: -1 });
bidSchema.index({ isWinning: 1 });
bidSchema.index({ isSold: 1 });
bidSchema.index({ auctionId: 1, playerId: 1 });

// Virtual for time since bid
bidSchema.virtual('timeSinceBid').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - this.timestamp.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
});

// Instance methods
bidSchema.methods.markAsWinning = function(): Promise<IBid> {
  this.isWinning = true;
  return this.save();
};

bidSchema.methods.markAsNotWinning = function(): Promise<IBid> {
  this.isWinning = false;
  return this.save();
};

bidSchema.methods.markAsSold = function(): Promise<IBid> {
  this.isSold = true;
  return this.save();
};

bidSchema.methods.updateAmount = async function(newAmount: number): Promise<IBid> {
  if (newAmount < this.amount) {
    throw new Error('New bid amount must be higher than current amount');
  }
  this.amount = newAmount;
  return this.save();
};

bidSchema.methods.addNotes = function(notes: string): Promise<IBid> {
  this.notes = notes;
  return this.save();
};

bidSchema.methods.getSummary = function() {
  return {
    bidId: this._id,
    auctionId: this.auctionId,
    playerId: this.playerId,
    teamId: this.teamId,
    bidderId: this.bidderId,
    amount: this.amount,
    timestamp: this.timestamp,
    isWinning: this.isWinning,
    isSold: this.isSold,
    timeSinceBid: this.timeSinceBid
  };
};

bidSchema.methods.isValidForAuction = function(auctionSettings: any): boolean {
  return this.amount >= auctionSettings.minBid;
};

// Static methods
bidSchema.statics.findByAuction = function(auctionId: string): Promise<IBid[]> {
  return this.find({ auctionId }).sort({ timestamp: -1 });
};

bidSchema.statics.findWinningBids = function(auctionId: string): Promise<IBid[]> {
  return this.find({ auctionId, isWinning: true });
};

bidSchema.statics.findHighestBidForPlayer = function(auctionId: string, playerId: string): Promise<IBid | null> {
  return this.findOne({ auctionId, playerId })
    .sort({ amount: -1 })
    .exec();
};

bidSchema.statics.createBid = async function(bidData: Partial<IBid>): Promise<IBid> {
  try {
    const bid = new this(bidData);
    await bid.validate();
    return await bid.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const Bid = (mongoose.models.Bid || mongoose.model<IBid, IBidModel>('Bid', bidSchema)) as IBidModel;

export default Bid;
