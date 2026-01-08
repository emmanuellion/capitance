# API Reference - Capitance Backend

## Base URL

- **Development:** `http://localhost:3000/api/v1`
- **Production:** `https://your-domain.com/api/v1`

## Authentication

Most endpoints require authentication via JWT tokens stored in HTTP-only cookies. The authentication flow uses:

- **Access Token:** Short-lived (15 minutes), stored in `access_token` cookie
- **Refresh Token:** Long-lived (7 days or 30 days with "remember me"), stored in `refresh_token` cookie
- **CSRF Token:** Required for all state-changing operations (POST, PUT, DELETE), sent in `x-csrf-token` header

### Getting CSRF Token

CSRF tokens are automatically set in cookies after successful login. Extract the value from the `csrf_token` cookie and include it in the `x-csrf-token` header for protected mutations.

---

## Authentication Endpoints

### Register User

Creates a new user account.

**Endpoint:** `POST /auth/register`

**Rate Limit:** Strict (5 requests per 15 minutes)

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Success Response (201):**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "isEmailVerified": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error (email already exists, passwords don't match, etc.)
- `500 Internal Server Error` - Server error

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: your-csrf-token" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

---

### Login

Authenticates a user and returns JWT tokens in HTTP-only cookies.

**Endpoint:** `POST /auth/login`

**Rate Limit:** Strict (5 requests per 15 minutes)

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "isEmailVerified": true
  }
}
```

Sets cookies:
- `access_token` (HttpOnly, 15min expiry)
- `refresh_token` (HttpOnly, 7d or 30d expiry)
- `csrf_token` (Not HttpOnly, for client access)

**Error Responses:**
- `400 Bad Request` - Invalid credentials or email not verified
- `429 Too Many Requests` - Rate limit exceeded

---

### Logout

Logs out the current user by invalidating tokens.

**Endpoint:** `POST /auth/logout`

**Authentication:** Required

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

Clears all auth cookies.

---

### Logout All Devices

Logs out the user from all devices by revoking all refresh tokens.

**Endpoint:** `POST /auth/logout-all`

**Authentication:** Required

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Success Response (200):**
```json
{
  "message": "Logged out from all devices"
}
```

---

### Get Current User

Returns information about the authenticated user.

**Endpoint:** `GET /auth/me`

**Authentication:** Required

**Success Response (200):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "isEmailVerified": true
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated or token expired

---

### Refresh Access Token

Generates a new access token using the refresh token.

**Endpoint:** `POST /auth/refresh-token`

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Note:** Refresh token is automatically read from `refresh_token` cookie.

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully"
}
```

Sets new `access_token` cookie.

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### Verify Email

Verifies a user's email address using the token sent via email.

**Endpoint:** `GET /auth/verify-email/:token`

**Success Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token

---

### Forgot Password

Initiates password reset by sending a reset link to the user's email.

**Endpoint:** `POST /auth/forgot-password`

**Rate Limit:** Strict (5 requests per 15 minutes)

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### Reset Password

Resets the user's password using the reset token.

**Endpoint:** `POST /auth/reset-password`

**Rate Limit:** Strict (5 requests per 15 minutes)

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token or passwords don't match

---

## File Upload Endpoints

### Upload File

Uploads a CSV file for portfolio analysis.

**Endpoint:** `POST /file/addFile`

**Authentication:** Required

**Headers:**
```
Content-Type: multipart/form-data
x-csrf-token: <csrf-token>
```

**Request Body (multipart/form-data):**
- `file`: CSV file (max 10MB)

**Success Response (201):**
```json
{
  "message": "File uploaded and processed successfully",
  "upload": {
    "_id": "507f1f77bcf86cd799439012",
    "filename": "portfolio_2024-01-15.csv",
    "originalName": "my_portfolio.csv",
    "size": 15000,
    "broker": "Boursobank",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  },
  "snapshot": {
    "_id": "507f1f77bcf86cd799439013",
    "snapshotDate": "2024-01-15T00:00:00.000Z",
    "totalValue": 12540.50,
    "totalInvested": 10000,
    "totalGainLoss": 2540.50,
    "totalGainLossPercentage": 25.41,
    "positions": [
      {
        "isin": "US0378331005",
        "assetName": "Apple Inc. (AAPL)",
        "quantity": 10,
        "currentPrice": 150.00,
        "currentValue": 1500.00,
        "averageBuyingPrice": 120.00,
        "totalInvested": 1200.00,
        "gainLoss": 300.00,
        "gainLossPercentage": 25.00
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid file format, malicious CSV, or parsing error
- `413 Payload Too Large` - File exceeds 10MB limit

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/file/addFile \
  -H "x-csrf-token: your-csrf-token" \
  -F "file=@/path/to/portfolio.csv" \
  --cookie "access_token=your-access-token"
```

---

### Get File

Retrieves metadata about an uploaded file.

**Endpoint:** `GET /file/getFile/:id`

**Authentication:** Required

**Success Response (200):**
```json
{
  "file": {
    "_id": "507f1f77bcf86cd799439012",
    "filename": "portfolio_2024-01-15.csv",
    "originalName": "my_portfolio.csv",
    "size": 15000,
    "broker": "Boursobank",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "userId": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses:**
- `404 Not Found` - File not found or access denied

---

### Remove File

Deletes an uploaded file and its associated snapshots.

**Endpoint:** `DELETE /file/removeFile`

**Authentication:** Required

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body:**
```json
{
  "fileId": "507f1f77bcf86cd799439012"
}
```

**Success Response (200):**
```json
{
  "message": "File and associated snapshots deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - File not found or access denied

---

## Snapshot Endpoints

### Get All Snapshots

Retrieves all portfolio snapshots for the authenticated user.

**Endpoint:** `GET /snapshots`

**Authentication:** Required

**Success Response (200):**
```json
{
  "snapshots": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "uploadId": "507f1f77bcf86cd799439012",
      "snapshotDate": "2024-01-15T00:00:00.000Z",
      "totalValue": 12540.50,
      "totalInvested": 10000,
      "totalGainLoss": 2540.50,
      "totalGainLossPercentage": 25.41,
      "metadata": {
        "broker": "Boursobank",
        "positionCount": 9
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Get Single Snapshot

Retrieves a specific portfolio snapshot.

**Endpoint:** `GET /snapshots/:snapshotId`

**Authentication:** Required

**Success Response (200):**
```json
{
  "snapshot": {
    "_id": "507f1f77bcf86cd799439013",
    "uploadId": "507f1f77bcf86cd799439012",
    "snapshotDate": "2024-01-15T00:00:00.000Z",
    "totalValue": 12540.50,
    "totalInvested": 10000,
    "totalGainLoss": 2540.50,
    "totalGainLossPercentage": 25.41,
    "positions": [
      {
        "isin": "US0378331005",
        "assetName": "Apple Inc. (AAPL)",
        "quantity": 10,
        "currentPrice": 150.00,
        "currentValue": 1500.00,
        "averageBuyingPrice": 120.00,
        "totalInvested": 1200.00,
        "gainLoss": 300.00,
        "gainLossPercentage": 25.00
      }
    ],
    "metadata": {
      "broker": "Boursobank",
      "positionCount": 9
    }
  }
}
```

**Error Responses:**
- `404 Not Found` - Snapshot not found or access denied

---

### Get Timeline

Retrieves historical snapshots ordered by date for chart visualization.

**Endpoint:** `GET /snapshots/timeline`

**Authentication:** Required

**Success Response (200):**
```json
{
  "timeline": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "totalValue": 10000,
      "totalGainLoss": 0,
      "totalGainLossPercentage": 0
    },
    {
      "date": "2024-01-15T00:00:00.000Z",
      "totalValue": 12540.50,
      "totalGainLoss": 2540.50,
      "totalGainLossPercentage": 25.41
    }
  ]
}
```

---

### Get Position History

Retrieves historical data for a specific position (ISIN).

**Endpoint:** `GET /snapshots/position/:isin`

**Authentication:** Required

**Success Response (200):**
```json
{
  "position": {
    "isin": "US0378331005",
    "assetName": "Apple Inc. (AAPL)",
    "history": [
      {
        "date": "2024-01-01T00:00:00.000Z",
        "quantity": 10,
        "currentPrice": 120.00,
        "currentValue": 1200.00,
        "gainLoss": 0,
        "gainLossPercentage": 0
      },
      {
        "date": "2024-01-15T00:00:00.000Z",
        "quantity": 10,
        "currentPrice": 150.00,
        "currentValue": 1500.00,
        "gainLoss": 300.00,
        "gainLossPercentage": 25.00
      }
    ]
  }
}
```

---

### Delete Snapshot

Deletes a specific portfolio snapshot.

**Endpoint:** `DELETE /snapshots/:snapshotId`

**Authentication:** Required

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Success Response (200):**
```json
{
  "message": "Snapshot deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Snapshot not found or access denied

---

### Reprocess All Uploads

Reprocesses all uploaded files to regenerate snapshots (e.g., after parser updates).

**Endpoint:** `POST /snapshots/reprocess-all`

**Authentication:** Required

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Success Response (200):**
```json
{
  "message": "Reprocessed X files successfully",
  "count": 5
}
```

---

## Real-time Price Endpoints

### Get Latest Enriched Snapshot

Retrieves the latest snapshot with real-time stock prices.

**Endpoint:** `GET /realtime/snapshots/latest`

**Authentication:** Required

**Success Response (200):**
```json
{
  "snapshot": {
    "_id": "507f1f77bcf86cd799439013",
    "snapshotDate": "2024-01-15T00:00:00.000Z",
    "totalValue": 12540.50,
    "totalInvested": 10000,
    "totalGainLoss": 2540.50,
    "totalGainLossPercentage": 25.41,
    "realtimeTotalValue": 13000.00,
    "realtimeTotalGainLoss": 3000.00,
    "realtimeTotalGainLossPercentage": 30.00,
    "enrichedAt": "2024-01-15T12:00:00.000Z",
    "pricesAvailable": 9,
    "totalPositions": 9,
    "positions": [
      {
        "isin": "US0378331005",
        "assetName": "Apple Inc. (AAPL)",
        "symbol": "AAPL",
        "quantity": 10,
        "currentPrice": 150.00,
        "currentValue": 1500.00,
        "averageBuyingPrice": 120.00,
        "totalInvested": 1200.00,
        "gainLoss": 300.00,
        "gainLossPercentage": 25.00,
        "realtimePrice": 155.00,
        "realtimeValue": 1550.00,
        "realtimeGainLoss": 350.00,
        "realtimeGainLossPercentage": 29.17,
        "priceChange": 5.00,
        "priceChangePercentage": 3.33,
        "priceUpdatedAt": "2024-01-15T12:00:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found` - No snapshots found

---

### Get Enriched Snapshot by ID

Retrieves a specific snapshot with real-time stock prices.

**Endpoint:** `GET /realtime/snapshots/:snapshotId`

**Authentication:** Required

**Success Response (200):** Same structure as latest enriched snapshot.

**Error Responses:**
- `404 Not Found` - Snapshot not found or access denied

---

### Get Performance Summary

Retrieves portfolio performance comparison (snapshot vs real-time).

**Endpoint:** `GET /realtime/snapshots/:snapshotId/performance`

**Authentication:** Required

**Success Response (200):**
```json
{
  "performance": {
    "snapshotDate": "2024-01-15T00:00:00.000Z",
    "snapshot": {
      "totalValue": 12540.50,
      "totalInvested": 10000,
      "totalGainLoss": 2540.50,
      "totalGainLossPercentage": 25.41
    },
    "realtime": {
      "totalValue": 13000.00,
      "totalInvested": 10000,
      "totalGainLoss": 3000.00,
      "totalGainLossPercentage": 30.00
    },
    "delta": {
      "value": 459.50,
      "percentage": 3.66
    },
    "enrichedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

### Get Significant Changes

Retrieves positions with significant price changes.

**Endpoint:** `GET /realtime/snapshots/:snapshotId/changes`

**Authentication:** Required

**Query Parameters:**
- `threshold` (optional, default: 2.0) - Minimum percentage change to include

**Success Response (200):**
```json
{
  "changes": [
    {
      "isin": "US0378331005",
      "assetName": "Apple Inc. (AAPL)",
      "symbol": "AAPL",
      "snapshotPrice": 150.00,
      "realtimePrice": 155.00,
      "priceChange": 5.00,
      "priceChangePercentage": 3.33,
      "currentValue": 1550.00,
      "direction": "up"
    }
  ],
  "threshold": 2.0,
  "totalPositions": 9,
  "significantChanges": 3
}
```

---

### Get Worker Stats

Retrieves statistics about the price update worker.

**Endpoint:** `GET /realtime/worker/stats`

**Authentication:** Required

**Success Response (200):**
```json
{
  "worker": {
    "isRunning": false,
    "lastRun": "2024-01-15T12:00:00.000Z",
    "nextRun": "2024-01-15T12:05:00.000Z",
    "lastRunDuration": 3500,
    "uniqueSymbols": 25,
    "pricesUpdated": 25,
    "errors": 0,
    "lastError": null
  }
}
```

---

### Get Cache Stats

Retrieves price cache and API usage statistics.

**Endpoint:** `GET /realtime/cache/stats`

**Authentication:** Required

**Success Response (200):**
```json
{
  "cache": {
    "totalKeys": 150,
    "ttl": 120,
    "memoryUsage": "2.4 MB"
  },
  "apiUsage": {
    "twelveData": {
      "dailyLimit": 800,
      "usedToday": 245,
      "remainingToday": 555
    },
    "alphaVantage": {
      "dailyLimit": 500,
      "usedToday": 120,
      "remainingToday": 380
    }
  }
}
```

---

### Force Refresh Prices

Manually triggers a price refresh for all active symbols.

**Endpoint:** `POST /realtime/refresh`

**Authentication:** Required

**Headers:**
```
x-csrf-token: <csrf-token>
```

**Success Response (200):**
```json
{
  "message": "Price refresh initiated",
  "symbolsQueued": 25
}
```

---

### Clear Price Cache

Clears the price cache (admin/debug endpoint).

**Endpoint:** `POST /realtime/cache/clear`

**Authentication:** Required

**Headers:**
```
Content-Type: application/json
x-csrf-token: <csrf-token>
```

**Request Body (optional):**
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

**Success Response (200):**
```json
{
  "message": "Cache cleared successfully",
  "clearedKeys": 3
}
```

---

## Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid request body, validation error |
| 401 | Unauthorized | Missing/invalid/expired authentication token |
| 403 | Forbidden | CSRF token missing or invalid |
| 404 | Not Found | Resource not found or access denied |
| 413 | Payload Too Large | File upload exceeds size limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, check logs |

## Rate Limiting

- **Strict Limiter** (Auth endpoints): 5 requests per 15 minutes per IP
- **General Limiter**: 100 requests per 15 minutes per IP

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

## CORS

CORS is configured to accept requests from origins listed in the `ALLOWED_ORIGINS` environment variable.

## Cache Strategy

- Real-time prices are cached in Redis with a TTL of 2 minutes
- Worker updates prices every 2-5 minutes during market hours (9 AM - 6 PM, Mon-Fri)
- ISIN to symbol mappings are cached with a 24-hour TTL
