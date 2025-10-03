import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Auction from '@/lib/models/auction/Auction';
import { withAuth, requireAuctioneer, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/auctions - Get all auctions
export async function GET(req: NextRequest) {
  const authHandler = withAuth(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
    
    const searchParams = req.nextUrl.searchParams;
    const tournamentId = searchParams.get('tournamentId');
    const status = searchParams.get('status');
    const active = searchParams.get('active');
    
    let query: any = {};
    
    if (tournamentId) {
      query.tournamentId = tournamentId;
    }
    
    if (status) {
      query.status = status;
    }
    
    let auctions;
    
    if (active === 'true') {
      auctions = await Auction.findActive();
    } else {
      auctions = await Auction.find(query)
        .populate('tournamentId', 'name format')
        .populate('currentPlayer', 'name role basePrice')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
    }
    
    return NextResponse.json({
      success: true,
      auctions,
      count: auctions.length
    });
    
  } catch (error) {
    console.error('Get auctions error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
    }
  });
  
  return authHandler(req);
}

// POST /api/auctions - Create new auction (Auctioneer or Admin)
export const POST = requireAuctioneer(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const auctionData = await req.json();
    
    // Add creator
    auctionData.createdBy = req.user!.userId;
    
    // Validate required fields
    if (!auctionData.name || !auctionData.tournamentId) {
      return NextResponse.json(
        { error: 'Auction name and tournament ID are required' },
        { status: 400 }
      );
    }
    
    // Create auction
    const auction = await Auction.createAuction(auctionData);
    
    // Populate references
    await auction.populate([
      { path: 'tournamentId', select: 'name format' },
      { path: 'createdBy', select: 'username' }
    ]);
    
    return NextResponse.json({
      success: true,
      auction,
      message: 'Auction created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create auction error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create auction' },
      { status: 500 }
    );
  }
});
