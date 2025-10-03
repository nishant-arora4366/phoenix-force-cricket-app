import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import ChatMessage from '@/lib/models/chat/ChatMessage';
import { withViewerAccess, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/chat - Get chat messages
export async function GET(req: NextRequest) {
  const authHandler = withViewerAccess(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
      
      const searchParams = req.nextUrl.searchParams;
      const auctionId = searchParams.get('auctionId');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      if (!auctionId) {
        return NextResponse.json(
          { error: 'Auction ID is required' },
          { status: 400 }
        );
      }
      
      const messages = await ChatMessage.findByAuction(auctionId, limit);
      
      return NextResponse.json({
        success: true,
        messages: messages.reverse(), // Return in chronological order
        count: messages.length
      });
      
    } catch (error) {
      console.error('Get chat messages error:', error);
      
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}

// POST /api/chat - Send chat message
export async function POST(req: NextRequest) {
  const authHandler = withViewerAccess(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
      
      const { auctionId, message } = await req.json();
      
      // Validate required fields
      if (!auctionId || !message) {
        return NextResponse.json(
          { error: 'Auction ID and message are required' },
          { status: 400 }
        );
      }
      
      // Create message data
      const messageData: any = {
        auctionId,
        message: message.trim(),
        type: 'message',
        timestamp: new Date()
      };
      
      // Add user info if authenticated
      if (req.user) {
        messageData.userId = req.user.userId;
        messageData.username = req.user.username;
      } else {
        // For anonymous viewers
        messageData.username = 'Anonymous Viewer';
      }
      
      // Create message
      const chatMessage = await ChatMessage.createMessage(messageData);
      
      // Populate user info
      await chatMessage.populate('userId', 'username role');
      
      return NextResponse.json({
        success: true,
        message: chatMessage.getDisplayMessage()
      }, { status: 201 });
      
    } catch (error: any) {
      console.error('Send message error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return NextResponse.json(
          { error: messages.join(', ') },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}
