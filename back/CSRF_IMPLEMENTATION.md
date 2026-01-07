# CSRF Protection Implementation Guide

## Overview

This application uses **Double Submit Cookie** pattern for CSRF protection. This provides security against Cross-Site Request Forgery attacks without requiring server-side session storage.

## How It Works

1. **Server** generates a random CSRF token and sends it as an HttpOnly cookie
2. **Client** must include this token in the `X-CSRF-Token` header for state-changing requests
3. **Server** verifies that the cookie value matches the header value

## Backend Implementation

### Middleware Applied

- `setCsrfToken`: Applied globally to set CSRF cookie on all requests
- `verifyCsrfToken`: Applied to routes that modify data (POST, PUT, PATCH, DELETE)

### Protected Routes

All state-changing endpoints require CSRF token:

- **Auth routes**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`, etc.
- **File routes**: `/api/v1/file/addFile`, `/api/v1/file/removeFile`
- **Snapshot routes**: `/api/v1/snapshots/reprocess-all`, `/api/v1/snapshots/:id` (DELETE)

### Get CSRF Token

Endpoint: `GET /api/csrf-token`

Returns:
```json
{
  "success": true,
  "token": "abc123..."
}
```

## Frontend Implementation

### 1. Get CSRF Token

The CSRF token is automatically set as a cookie on the first request. To explicitly retrieve it:

```typescript
// Fetch CSRF token
const response = await fetch('/api/csrf-token', {
  credentials: 'include' // Important: Include cookies
});

const { token } = await response.json();
```

### 2. Include Token in Requests

For all state-changing requests (POST, PUT, PATCH, DELETE), include the token in the `X-CSRF-Token` header:

```typescript
// Example: Login request
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token, // Include CSRF token
  },
  credentials: 'include', // Important: Include cookies
  body: JSON.stringify({ email, password }),
});
```

### 3. Read Token from Cookie (Alternative)

If you prefer to read the token directly from cookies:

```typescript
function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

// Use it
const token = getCsrfTokenFromCookie();
```

### 4. Create an API Client Wrapper

Recommended approach: Create a wrapper that automatically includes CSRF token:

```typescript
class APIClient {
  private csrfToken: string | null = null;

  async init() {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    const data = await response.json();
    this.csrfToken = data.token;
  }

  async request(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    // Add CSRF token for state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      if (this.csrfToken) {
        headers.set('X-CSRF-Token', this.csrfToken);
      }
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    });
  }
}

// Usage
const api = new APIClient();
await api.init();

// Make requests
await api.request('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});
```

### 5. Using with Axios

```typescript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Include cookies
});

// Get CSRF token
const { data } = await api.get('/csrf-token');
const csrfToken = data.token;

// Add interceptor to include CSRF token
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Make requests
await api.post('/v1/auth/login', { email, password });
```

### 6. Using with React Query / TanStack Query

```typescript
import { QueryClient } from '@tanstack/react-query';

// Create API client
const apiClient = {
  csrfToken: null as string | null,

  async init() {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include',
    });
    const data = await response.json();
    this.csrfToken = data.token;
  },

  async fetch(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '')) {
      if (this.csrfToken) {
        headers.set('X-CSRF-Token', this.csrfToken);
      }
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  },
};

// Initialize on app start
await apiClient.init();

// Use in mutations
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiClient.fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
});
```

## Error Handling

### CSRF Token Missing (403)

```json
{
  "success": false,
  "message": "CSRF token missing. Please refresh the page.",
  "code": "CSRF_TOKEN_MISSING"
}
```

**Solution**: Ensure you're including both the cookie and the header.

### CSRF Token Invalid (403)

```json
{
  "success": false,
  "message": "Invalid CSRF token. Please refresh the page.",
  "code": "CSRF_TOKEN_INVALID"
}
```

**Solution**: Refresh the page to get a new token.

### Handling in Frontend

```typescript
try {
  const response = await apiClient.fetch(url, options);

  if (response.status === 403) {
    const error = await response.json();

    if (error.code === 'CSRF_TOKEN_MISSING' || error.code === 'CSRF_TOKEN_INVALID') {
      // Refresh CSRF token and retry
      await apiClient.init();
      return apiClient.fetch(url, options);
    }
  }

  return response;
} catch (error) {
  console.error('Request failed:', error);
  throw error;
}
```

## Testing

### Manual Testing with cURL

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:3000/api/csrf-token

# 2. Extract token from response
# TOKEN="<token-from-response>"

# 3. Make authenticated request
curl -b cookies.txt \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"email":"test@example.com","password":"password123"}' \
  http://localhost:3000/api/v1/auth/login
```

### Testing with Postman

1. First request: GET `/api/csrf-token`
   - Postman will automatically save the cookie
2. Copy the token from the response
3. For subsequent requests:
   - Add header: `X-CSRF-Token: <token>`
   - Ensure cookies are enabled in Postman

## Security Considerations

1. **Always use `credentials: 'include'`** in fetch requests to send cookies
2. **Never disable CSRF protection** in production
3. **Token expires after 24 hours** - handle token refresh
4. **HTTPS only in production** - CSRF cookies have `secure` flag enabled
5. **SameSite=Strict** - Provides additional CSRF protection

## Common Issues

### Issue: CSRF token not being set
**Solution**: Ensure `credentials: 'include'` is set in fetch options

### Issue: Token missing in header
**Solution**: Check that you're adding `X-CSRF-Token` header for POST/PUT/PATCH/DELETE

### Issue: Token mismatch
**Solution**: Don't manually modify the csrf-token cookie. Always get fresh token from `/api/csrf-token`

### Issue: CORS errors
**Solution**: Ensure backend CORS configuration allows credentials and the frontend origin
