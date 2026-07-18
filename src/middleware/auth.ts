/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: any; // To store the postgres user record
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Sync user to database
    const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '');
    req.dbUser = dbUser;
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
