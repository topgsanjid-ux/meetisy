import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseServer } from './supabase/server';

const JWT_SECRET = process.env.JWT_SECRET || 'mvp_pro-default-jwt-secret-key-2026';
const COOKIE_NAME = 'standup_auth_token';

// In-memory demo/fallback users
export const DEMO_USERS = [
  {
    id: 'usr-1',
    email: 'sarah.chen@engineering.io',
    name: 'Sarah Chen',
    role: 'member',
    user_role: 'Staff Backend Engineer',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SarahChen',
    team_id: '11111111-1111-1111-1111-111111111111',
    password_hash: hashPassword('password123')
  },
  {
    id: 'usr-2',
    email: 'marcus.vance@engineering.io',
    name: 'Marcus Vance',
    role: 'manager',
    user_role: 'Tech Lead',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MarcusVance',
    team_id: '11111111-1111-1111-1111-111111111111',
    password_hash: hashPassword('password123')
  },
  {
    id: 'usr-3',
    email: 'alex.rivera@engineering.io',
    name: 'Alex Rivera',
    role: 'member',
    user_role: 'Frontend Engineer',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AlexRivera',
    team_id: '11111111-1111-1111-1111-111111111111',
    password_hash: hashPassword('password123')
  }
];

// Persistent mutable list of registered users in memory if DB unlinked
let registeredUsers = [...DEMO_USERS];

/**
 * Secure PBKDF2 Password Hashing (Zero external C++ dependencies, 100% Windows/Linux compatible)
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return checkHash === originalHash;
}

/**
 * Lightweight JWT Generator & Verifier (HMAC-SHA256)
 */
export function signToken(payload, expiresInHours = 72) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const data = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (_) {
    return null;
  }
}

/**
 * Register User
 */
export async function registerUser({ email, password, name, role = 'member', user_role = 'Software Engineer' }) {
  const existingUser = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  const hashedPassword = hashPassword(password);
  const newUser = {
    id: `usr-${Date.now()}`,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    role: role || 'member',
    user_role: user_role || 'Software Engineer',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || email)}`,
    team_id: '11111111-1111-1111-1111-111111111111',
    password_hash: hashedPassword,
    created_at: new Date().toISOString()
  };

  registeredUsers.push(newUser);

  // Attempt Supabase insert if configured
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      await supabaseServer.from('users').insert([{
        id: crypto.randomUUID(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        team_id: newUser.team_id,
        created_at: newUser.created_at
      }]);
    }
  } catch (dbErr) {
    console.warn('Supabase user sync skipped:', dbErr.message);
  }

  return sanitizeUser(newUser);
}

/**
 * Authenticate User
 */
export async function authenticateUser(email, password) {
  const user = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  return sanitizeUser(user);
}

/**
 * Get Current User from Cookie
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload || !payload.id) return null;

    const user = registeredUsers.find((u) => u.id === payload.id);
    return user ? sanitizeUser(user) : payload;
  } catch (err) {
    return null;
  }
}

export function sanitizeUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export { COOKIE_NAME };
