import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Bid from '@/lib/models/bid/Bid';
import Team from '@/lib/models/team/Team';
import Auction from '@/lib/models/auction/Auction';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { config } from '@/lib/config/config';

// GET /api/bids - Get bids
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const searchParams = req.nextUrl.searchParams;
    const auctionId = searchParams.get('auctionId');
    const playerId = searchParams.get('playerId');
    const teamId = searchParams.get('teamId');
    const winning = searchParams.get('winning');
    
    let query: any = {};
    
    if (auctionId) {
      query.auctionId = auctionId;
    }
    
    if (playerId) {
      query.playerId = playerId;
    }
    
    if (teamId) {
      query.teamId = teamId;
    }
    
    if (winning === 'true') {
      query.isWinning = true;
    }
    
    const bids = await Bid.find(query)
      .populate('playerId', 'name role')
      .populate('teamId', 'name')
      .populate('bidderId', 'username')
      .sort({ timestamp: -1 })
      .limit(100);
    
    return NextResponse.json({
      success: true,
      bids,
      count: bids.length
    });
    
  } catch (error) {
    console.error('Get bids error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
});

// POST /api/bids - Place a bid
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const bidData = await req.json();
    
    // Validate required fields
    if (!bidData.auctionId || !bidData.playerId || !bidData.teamId || !bidData.amount) {
      return NextResponse.json(
        { error: 'Auction ID, player ID, team ID and amount are required' },
        { status: 400 }
      );
    }
    
    // Check if user can bid for the team
    const team = await Team.findById(bidData.teamId);
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const isCaptain = team.captainId.toString() === req.user!.userId;
    const isManager = team.managerId?.toString() === req.user!.userId;
    const isAdmin = req.user!.role === config.roles.ADMIN;
    const isAuctioneer = req.user!.role === config.roles.AUCTIONEER;
    
    if (!isCaptain && !isManager && !isAdmin && !isAuctioneer) {
      return NextResponse.json(
        { error: 'You do not have permission to bid for this team' },
        { status: 403 }
      );
    }
    
    // Check auction status
    const auction = await Auction.findById(bidData.auctionId);
    if (!auction || auction.status !== 'active') {
      return NextResponse.json(
        { error: 'Auction is not active' },
        { status: 400 }
      );
    }
    
    // Check if current player matches
    if (auction.currentPlayer?.toString() !== bidData.playerId) {
      return NextResponse.json(
        { error: 'This player is not currently up for auction' },
        { status: 400 }
      );
    }
    
    // Check if team can afford the bid
    if (!team.canBid(bidData.amount)) {
      return NextResponse.json(
        { error: 'Team does not have sufficient budget' },
        { status: 400 }
      );
    }
    
    // Get current highest bid
    const currentHighestBid = await Bid.findHighestBidForPlayer(
      bidData.auctionId,
      bidData.playerId
    );
    
    // Validate bid amount
    const minBid = auction.settings.minBid;
    const minIncrement = auction.settings.minBidIncrement;
    const requiredAmount = currentHighestBid 
      ? currentHighestBid.amount + minIncrement 
      : minBid;
    
    if (bidData.amount < requiredAmount) {
      return NextResponse.json(
        { error: `Minimum bid amount is ${requiredAmount}` },
        { status: 400 }
      );
    }
    
    // Mark previous bids as not winning
    if (currentHighestBid) {
      await Bid.updateMany(
        { 
          auctionId: bidData.auctionId,
          playerId: bidData.playerId,
          isWinning: true 
        },
        { isWinning: false }
      );
    }
    
    // Create bid
    bidData.bidderId = req.user!.userId;
    bidData.isWinning = true;
    
    const bid = await Bid.createBid(bidData);
    
    // Update auction's current bid
    auction.currentBid = (bid as any)._id;
    auction.bidHistory.push((bid as any)._id);
    await auction.save();
    
    // Populate references
    await bid.populate([
      { path: 'playerId', select: 'name role' },
      { path: 'teamId', select: 'name' },
      { path: 'bidderId', select: 'username' }
    ]);
    
    return NextResponse.json({
      success: true,
      bid,
      message: 'Bid placed successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Place bid error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
});
