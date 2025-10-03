import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import User from '@/lib/models/user/User';
import { generateToken } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { identifier, password } = await req.json();
    
    // Validation
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);
    
    if (!user || !('_id' in user)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }
    
    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = generateToken({
      userId: (user as any)._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isTemporary: user.isTemporary
    });
    
    // Return user data and token
    return NextResponse.json({
      success: true,
      user: {
        id: (user as any)._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isTemporary: user.isTemporary
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
