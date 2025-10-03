/**
 * Chat Message Model - Mongoose Schema
 * Represents chat messages in auction rooms
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

// ChatMessage interface
export interface IChatMessage extends Document {
  auctionId: Types.ObjectId;
  userId?: Types.ObjectId;
  username?: string;
  message?: string;
  type: 'message' | 'system' | 'bid_alert' | 'player_sold' | 'auction_status';
  metadata: Map<string, any>;
  isVisible: boolean;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  timeAgo?: string;
  
  // Instance methods
  setVisibility(isVisible: boolean): Promise<IChatMessage>;
  addMetadata(key: string, value: any): Promise<IChatMessage>;
  getDisplayMessage(): any;
  getSummary(): any;
  isSystemMessage(): boolean;
  isBidAlert(): boolean;
  isRecent(): boolean;
  sanitize(): string;
}

// ChatMessage model interface with static methods
export interface IChatMessageModel extends Model<IChatMessage> {
  findByAuction(auctionId: string, limit?: number): Promise<IChatMessage[]>;
  createSystemMessage(auctionId: string, message: string, metadata?: any): Promise<IChatMessage>;
  createBidAlert(auctionId: string, userId: string, username: string, playerName: string, amount: number): Promise<IChatMessage>;
  createPlayerSoldMessage(auctionId: string, playerName: string, teamName: string, amount: number): Promise<IChatMessage>;
  createAuctionStatusMessage(auctionId: string, status: string, details?: any): Promise<IChatMessage>;
  createMessage(messageData: Partial<IChatMessage>): Promise<IChatMessage>;
}

const chatMessageSchema = new Schema<IChatMessage>({
  auctionId: {
    type: Schema.Types.ObjectId,
    ref: 'Auction',
    required: [true, 'Auction ID is required']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  username: {
    type: String,
    required: false,
    trim: true,
    minlength: [1, 'Username is required'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  message: {
    type: String,
    required: false,
    trim: true,
    minlength: [1, 'Message content is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['message', 'system', 'bid_alert', 'player_sold', 'auction_status'],
    default: 'message'
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
chatMessageSchema.index({ auctionId: 1 });
chatMessageSchema.index({ userId: 1 });
chatMessageSchema.index({ timestamp: -1 });
chatMessageSchema.index({ type: 1 });
chatMessageSchema.index({ isVisible: 1 });
chatMessageSchema.index({ auctionId: 1, timestamp: -1 });

// Virtual for time ago
chatMessageSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - this.timestamp.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
});

// Instance methods
chatMessageSchema.methods.setVisibility = function(isVisible: boolean): Promise<IChatMessage> {
  this.isVisible = isVisible;
  return this.save();
};

chatMessageSchema.methods.addMetadata = function(key: string, value: any): Promise<IChatMessage> {
  this.metadata.set(key, value);
  return this.save();
};

chatMessageSchema.methods.getDisplayMessage = function() {
  return {
    id: this._id,
    auctionId: this.auctionId,
    userId: this.userId,
    username: this.username,
    message: this.message,
    type: this.type,
    metadata: Object.fromEntries(this.metadata),
    timestamp: this.timestamp,
    timeAgo: this.timeAgo
  };
};

chatMessageSchema.methods.getSummary = function() {
  return {
    messageId: this._id,
    auctionId: this.auctionId,
    type: this.type,
    timestamp: this.timestamp,
    isVisible: this.isVisible
  };
};

chatMessageSchema.methods.isSystemMessage = function(): boolean {
  return this.type === 'system' || this.type === 'bid_alert' || 
         this.type === 'player_sold' || this.type === 'auction_status';
};

chatMessageSchema.methods.isBidAlert = function(): boolean {
  return this.type === 'bid_alert';
};

chatMessageSchema.methods.isRecent = function(): boolean {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - this.timestamp.getTime()) / 60000);
  return diffInMinutes < 5;
};

chatMessageSchema.methods.sanitize = function(): string {
  if (!this.message) return '';
  
  // Basic sanitization - remove script tags and potential XSS
  return this.message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

// Static methods
chatMessageSchema.statics.findByAuction = function(auctionId: string, limit: number = 50): Promise<IChatMessage[]> {
  return this.find({ auctionId, isVisible: true })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username role');
};

chatMessageSchema.statics.createSystemMessage = function(auctionId: string, message: string, metadata: any = {}): Promise<IChatMessage> {
  return this.create({
    auctionId,
    message,
    type: 'system',
    metadata,
    timestamp: new Date()
  });
};

chatMessageSchema.statics.createBidAlert = function(
  auctionId: string, 
  userId: string, 
  username: string, 
  playerName: string, 
  amount: number
): Promise<IChatMessage> {
  const message = `${username} placed a bid of ${amount} on ${playerName}`;
  const metadata = new Map([
    ['playerId', null],
    ['amount', amount],
    ['playerName', playerName]
  ]);
  
  return this.create({
    auctionId,
    userId,
    username,
    message,
    type: 'bid_alert',
    metadata,
    timestamp: new Date()
  });
};

chatMessageSchema.statics.createPlayerSoldMessage = function(
  auctionId: string, 
  playerName: string, 
  teamName: string, 
  amount: number
): Promise<IChatMessage> {
  const message = `${playerName} sold to ${teamName} for ${amount}`;
  const metadata = new Map([
    ['playerName', playerName],
    ['teamName', teamName],
    ['amount', amount]
  ]);
  
  return this.create({
    auctionId,
    message,
    type: 'player_sold',
    metadata,
    timestamp: new Date()
  });
};

chatMessageSchema.statics.createAuctionStatusMessage = function(
  auctionId: string, 
  status: string, 
  details: any = {}
): Promise<IChatMessage> {
  const statusMessages: { [key: string]: string } = {
    'started': 'Auction has started',
    'paused': 'Auction has been paused',
    'resumed': 'Auction has resumed',
    'completed': 'Auction has been completed',
    'cancelled': 'Auction has been cancelled'
  };
  
  const message = statusMessages[status] || `Auction status: ${status}`;
  const metadata = new Map(Object.entries({ status, ...details }));
  
  return this.create({
    auctionId,
    message,
    type: 'auction_status',
    metadata,
    timestamp: new Date()
  });
};

chatMessageSchema.statics.createMessage = async function(messageData: Partial<IChatMessage>): Promise<IChatMessage> {
  try {
    const message = new this(messageData);
    await message.validate();
    return await message.save();
  } catch (error) {
    throw error;
  }
};

// Check if model exists before creating it (for Next.js hot reload)
const ChatMessage = (mongoose.models.ChatMessage || mongoose.model<IChatMessage, IChatMessageModel>('ChatMessage', chatMessageSchema)) as IChatMessageModel;

export default ChatMessage;
