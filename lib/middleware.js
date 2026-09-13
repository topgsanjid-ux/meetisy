import { verifyToken, COOKIE_NAME } from './auth';

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT from Authorization header or cookie.
 * Returns the decoded user payload or throws a structured error.
 *
 * Usage:
 *   const user = await requireAuth(request);
 *   // user is guaranteed to be a valid JWT payload
 */
export async function requireAuth(request) {
  let token = null;

  // 1. Try Authorization: Bearer <token> header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
      })
    );
    token = cookies[COOKIE_NAME] || null;
  }

  if (!token) {
    throw new AuthError('Authentication required. Provide a valid JWT via Authorization header or cookie.', 401);
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new AuthError('Invalid or expired authentication token.', 401);
  }

  return payload;
}

/**
 * Custom error class for auth failures, carrying an HTTP status code.
 */
export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Helper to generate a consistent 401/403 JSON response.
 */
export function authErrorResponse(error) {
  const statusCode = error instanceof AuthError ? error.statusCode : 401;
  return new Response(
    JSON.stringify({ success: false, error: error.message || 'Authentication failed.' }),
    { status: statusCode, headers: { 'Content-Type': 'application/json' } }
  );
}
