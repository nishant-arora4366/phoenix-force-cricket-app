import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Auction from '@/lib/models/auction/Auction';
import { withAuth, requireAuctioneer, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/auctions/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  const authHandler = withAuth(async (
    req: AuthenticatedRequest
  ) => {
    try {
      await connectToDatabase();
    
      const auction = await Auction.findById(params.id)
        .populate('tournamentId', 'name format settings')
        .populate('currentPlayer', 'name role basePrice battingStyle bowlingStyle')
        .populate('players', 'name role basePrice')
        .populate('soldPlayers.playerId', 'name role')
        .populate('soldPlayers.teamId', 'name')
        .populate('createdBy', 'username');
      
      if (!auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        auction
      });
      
    } catch (error) {
      console.error('Get auction error:', error);
      
      return NextResponse.json(
        { error: 'Failed to fetch auction' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}

// PUT /api/auctions/[id] - Update auction (Auctioneer or Admin)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  const authHandler = requireAuctioneer(async (
    req: AuthenticatedRequest
  ) => {
    try {
      await connectToDatabase();
      
      const updates = await req.json();
      
      // Remove sensitive fields
      delete updates._id;
      delete updates.createdAt;
      delete updates.updatedAt;
      delete updates.createdBy;
      
      const auction = await Auction.findByIdAndUpdate(
        params.id,
        updates,
        { new: true, runValidators: true }
      );
      
      if (!auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        auction,
        message: 'Auction updated successfully'
      });
      
    } catch (error: any) {
      console.error('Update auction error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return NextResponse.json(
          { error: messages.join(', ') },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update auction' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}

// DELETE /api/auctions/[id] - Cancel auction (Auctioneer or Admin)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  const authHandler = requireAuctioneer(async (
    req: AuthenticatedRequest
  ) => {
    try {
      await connectToDatabase();
      
      const auction = await Auction.findById(params.id);
      
      if (!auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        );
      }
      
      if (auction.status === 'completed') {
        return NextResponse.json(
          { error: 'Cannot cancel a completed auction' },
          { status: 400 }
        );
      }
      
      auction.status = 'cancelled';
      await auction.save();
      
      return NextResponse.json({
        success: true,
        message: 'Auction cancelled successfully'
      });
      
    } catch (error) {
      console.error('Cancel auction error:', error);
      
      return NextResponse.json(
        { error: 'Failed to cancel auction' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}
