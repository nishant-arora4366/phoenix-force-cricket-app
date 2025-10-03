import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import User from '@/lib/models/user/User';
import { generateToken, hashPassword } from '@/lib/utils/auth';
import { config } from '@/lib/config/config';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { username, email, password, role = config.roles.VIEWER } = await req.json();
    
    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email and password are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this username or email already exists' },
        { status: 400 }
      );
    }
    
    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      role,
      isActive: true
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      isTemporary: false
    });
    
    // Return user data and token
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      token
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
