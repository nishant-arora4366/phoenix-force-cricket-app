import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole, isRoleHigherOrEqual } from '@/lib/utils/auth';
import { config } from '@/lib/config/config';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
    isTemporary: boolean;
  };
}

// Authentication middleware
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>,
  options?: { requiredRoles?: string[] }
) {
  return async (req: NextRequest, context?: any) => {
    try {
      const authData = await verifyAuth(req);
      
      if (!authData) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Check required roles if specified
      if (options?.requiredRoles && options.requiredRoles.length > 0) {
        if (!hasRole(authData.role, options.requiredRoles)) {
          return NextResponse.json(
            { error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }
      }
      
      // Add user to request
      (req as AuthenticatedRequest).user = authData;
      
      return handler(req as AuthenticatedRequest, context);
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      );
    }
  };
}

// Admin only middleware
export function requireAdmin(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return withAuth(handler, { requiredRoles: [config.roles.ADMIN] });
}

// Auctioneer or higher middleware
export function requireAuctioneer(handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>) {
  return withAuth(handler, { 
    requiredRoles: [config.roles.ADMIN, config.roles.AUCTIONEER] 
  });
}

// Captain or higher middleware
export function requireCaptain(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(handler, { 
    requiredRoles: [config.roles.ADMIN, config.roles.AUCTIONEER, config.roles.CAPTAIN, config.roles.MANAGER] 
  });
}

// Viewer access (anonymous allowed for certain routes)
export function withViewerAccess(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const authData = await verifyAuth(req);
    
    // Add user to request if authenticated, otherwise allow anonymous
    if (authData) {
      (req as AuthenticatedRequest).user = authData;
    }
    
    return handler(req as AuthenticatedRequest, context);
  };
}
