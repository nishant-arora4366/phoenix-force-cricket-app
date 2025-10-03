import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import User from '@/lib/models/user/User';
import { verifyAuth } from '@/lib/utils/auth';

export async function GET(req: NextRequest) {
  try {
    const authData = await verifyAuth(req);
    
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    const user = await User.findById(authData.userId)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isTemporary: user.isTemporary,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authData = await verifyAuth(req);
    
    if (!authData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    const updates = await req.json();
    
    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.email;
    delete updates.username;
    delete updates.role;
    delete updates.isTemporary;
    
    const user = await User.findByIdAndUpdate(
      authData.userId,
      { 
        $set: { 
          'profile.firstName': updates.profile?.firstName,
          'profile.lastName': updates.profile?.lastName,
          'profile.bio': updates.profile?.bio,
          'profile.phone': updates.profile?.phone,
          'profile.avatar': updates.profile?.avatar
        } 
      },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isTemporary: user.isTemporary
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
