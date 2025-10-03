import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Tournament from '@/lib/models/tournament/Tournament';
import { withAuth, requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/tournaments/[id] - Get tournament by ID
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const tournament = await Tournament.findById(params.id)
      .populate('teams', 'name captainId tokens totalSpent')
      .populate('captains', 'username email profile')
      .populate('createdBy', 'username');
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tournament
    });
    
  } catch (error) {
    console.error('Get tournament error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    );
  }
});

// PUT /api/tournaments/[id] - Update tournament (Admin only)
export const PUT = requireAdmin(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const updates = await req.json();
    
    // Remove sensitive fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.createdBy;
    delete updates.teams;
    delete updates.captains;
    
    const tournament = await Tournament.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      tournament,
      message: 'Tournament updated successfully'
    });
    
  } catch (error: any) {
    console.error('Update tournament error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
});

// DELETE /api/tournaments/[id] - Cancel tournament (Admin only)
export const DELETE = requireAdmin(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const tournament = await Tournament.findById(params.id);
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    if (tournament.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed tournament' },
        { status: 400 }
      );
    }
    
    tournament.status = 'cancelled';
    tournament.isActive = false;
    await tournament.save();
    
    return NextResponse.json({
      success: true,
      message: 'Tournament cancelled successfully'
    });
    
  } catch (error) {
    console.error('Cancel tournament error:', error);
    
    return NextResponse.json(
      { error: 'Failed to cancel tournament' },
      { status: 500 }
    );
  }
});
