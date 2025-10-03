/**
 * Authentication utilities
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '@/lib/config/config';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  isTemporary: boolean;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, config.bcrypt.saltRounds);
}

// Compare password with hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Extract token from request headers
export function getTokenFromHeaders(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies
  const cookieToken = req.cookies.get('token')?.value;
  return cookieToken || null;
}

// Verify request authentication
export async function verifyAuth(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const token = getTokenFromHeaders(req);
    
    if (!token) {
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

// Check if user has required role
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// Role hierarchy check
export function isRoleHigherOrEqual(userRole: string, targetRole: string): boolean {
  const roleHierarchy = {
    [config.roles.ADMIN]: 5,
    [config.roles.AUCTIONEER]: 4,
    [config.roles.CAPTAIN]: 3,
    [config.roles.MANAGER]: 3,
    [config.roles.BIDDER]: 2,
    [config.roles.VIEWER]: 1
  };
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[targetRole] || 0);
}
