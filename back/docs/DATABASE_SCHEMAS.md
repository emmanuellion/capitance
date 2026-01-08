# Database Schemas - Capitance

This document describes the MongoDB database schema used by Capitance.

## Database Overview

Capitance uses MongoDB for data persistence with the following collections:
- `users` - User accounts and authentication
- `uploads` - CSV file uploads metadata
- `portfolioSnapshots` - Parsed portfolio snapshots with positions
- `symbol_mappings` - ISIN to ticker symbol mappings for real-time prices

---

## Collection: `users`

Stores user account information, authentication credentials, and session tokens.

### Schema

```typescript
{
  _id: ObjectId,
  email: string,                      // Unique, indexed
  password: string,                   // Bcrypt hashed (12 rounds)
  isVerified: boolean,                // Email verification status
  verificationToken?: string,         // Email verification token (sparse index)
  verificationTokenExpiry?: Date,     // Token expiration (24 hours)
  resetPasswordToken?: string,        // Password reset token (sparse index)
  resetPasswordTokenExpiry?: Date,    // Token expiration (1 hour)
  refreshTokens: string[],            // Array of hashed refresh tokens (SHA256)
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Unique index on email
{ email: 1 } (unique: true)

// Sparse index on verification token
{ verificationToken: 1 } (sparse: true)

// Sparse index on reset token
{ resetPasswordToken: 1 } (sparse: true)
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Unique identifier (auto-generated) |
| `email` | string | Yes | User's email address (lowercased, trimmed) |
| `password` | string | Yes | Bcrypt hashed password (SALT_ROUNDS=12) |
| `isVerified` | boolean | Yes | Whether email has been verified |
| `verificationToken` | string | No | Token sent via email for verification |
| `verificationTokenExpiry` | Date | No | When verification token expires (24h from creation) |
| `resetPasswordToken` | string | No | Token for password reset |
| `resetPasswordTokenExpiry` | Date | No | When reset token expires (1h from creation) |
| `refreshTokens` | string[] | Yes | Array of SHA256-hashed refresh tokens for session management |
| `createdAt` | Date | Yes | Account creation timestamp |
| `updatedAt` | Date | Yes | Last update timestamp |

### Security Notes

- Passwords are hashed using bcrypt with 12 salt rounds
- Refresh tokens are hashed with SHA256 before storage (prevents reuse if DB is compromised)
- All tokens are removed after successful verification/reset
- Email addresses are normalized (lowercased, trimmed) before storage

### Example Document

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "john.doe@example.com",
  "password": "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
  "isVerified": true,
  "refreshTokens": [
    "5f4dcc3b5aa765d61d8327deb882cf99a6d5e3c5e8f6b9c2d4e7a8b3c6f1e9d8"
  ],
  "createdAt": ISODate("2024-01-15T10:00:00.000Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

---

## Collection: `uploads`

Stores metadata about uploaded CSV files.

### Schema

```typescript
{
  _id: ObjectId,
  userId: string,                     // Reference to users._id
  originalName: string,               // Original filename from user
  filename: string,                   // Stored filename (unique)
  size: number,                       // File size in bytes
  mimetype: string,                   // MIME type (should be text/csv)
  uploadedAt: Date,                   // Upload timestamp
  filePath: string,                   // Path to file on disk
  formatType?: string,                // Detected broker format
  formatDetectionConfidence?: number, // Confidence score (0-1)
  snapshotDate?: Date,                // Extracted snapshot date
  processingStatus?: string           // 'pending' | 'processed' | 'failed'
}
```

### Indexes

No explicit indexes defined (consider adding userId index for performance).

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Unique identifier |
| `userId` | string | Yes | ID of user who uploaded the file |
| `originalName` | string | Yes | Original filename from upload |
| `filename` | string | Yes | Generated unique filename |
| `size` | number | Yes | File size in bytes (max 10MB) |
| `mimetype` | string | Yes | File MIME type |
| `uploadedAt` | Date | Yes | Upload timestamp |
| `filePath` | string | Yes | Full path to stored file |
| `formatType` | string | No | Detected broker format (e.g., "boursobank_snapshot") |
| `formatDetectionConfidence` | number | No | Format detection confidence (0.0 - 1.0) |
| `snapshotDate` | Date | No | Date extracted from CSV |
| `processingStatus` | string | No | Processing status: 'pending', 'processed', or 'failed' |

### Example Document

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": "507f1f77bcf86cd799439011",
  "originalName": "portfolio_janvier_2024.csv",
  "filename": "1705321800000-portfolio.csv",
  "size": 15234,
  "mimetype": "text/csv",
  "uploadedAt": ISODate("2024-01-15T10:30:00.000Z"),
  "filePath": "/uploads/507f1f77bcf86cd799439011/1705321800000-portfolio.csv",
  "formatType": "boursobank_snapshot",
  "formatDetectionConfidence": 0.95,
  "snapshotDate": ISODate("2024-01-15T00:00:00.000Z"),
  "processingStatus": "processed"
}
```

---

## Collection: `portfolioSnapshots`

Stores parsed portfolio snapshots with normalized position data.

### Schema

```typescript
{
  _id: ObjectId,
  uploadId: ObjectId,                 // Reference to uploads._id (unique)
  userId: string,                     // Reference to users._id
  snapshotDate: Date,                 // Date of the snapshot
  positions: NormalizedPosition[],    // Array of portfolio positions
  metadata: SnapshotMetadata,         // Format info and warnings
  totalValue: number,                 // Total portfolio value
  totalInvested: number,              // Total amount invested
  totalGainLoss: number,              // Total gain/loss in currency
  totalGainLossPercentage: number,    // Total gain/loss percentage
  createdAt: Date,                    // When snapshot was created
  updatedAt?: Date                    // Last update timestamp
}
```

### Nested Schema: `NormalizedPosition`

```typescript
{
  isin: string,                       // International Securities ID
  assetName: string,                  // Name of the asset
  quantity: number,                   // Number of shares/units
  currentPrice: number,               // Current price per unit
  currentValue: number,               // Total current value (price * quantity)
  averageBuyingPrice: number,         // Average purchase price (PRU)
  totalInvested: number,              // Total invested (avgPrice * quantity)
  gainLoss: number,                   // Gain/loss in currency
  gainLossPercentage: number,         // Gain/loss percentage
  intradayVariation?: number,         // Intraday change (optional)
  intradayVariationPercentage?: number, // Intraday % change (optional)
  currency?: string,                  // Currency code (e.g., "EUR", "USD")
  exchange?: string,                  // Stock exchange
  symbol?: string,                    // Ticker symbol (e.g., "AAPL")
  symbolSource?: string               // How symbol was obtained
}
```

### Nested Schema: `SnapshotMetadata`

```typescript
{
  formatType: string,                 // Broker format type
  bankName: string,                   // Name of the broker/bank
  detectionConfidence?: number,       // Auto-detection confidence
  parseWarnings?: string[],           // Array of warning messages
  customFields?: Record<string, any>  // Format-specific extra data
}
```

### Indexes

```javascript
// Unique index on uploadId (one snapshot per upload)
{ uploadId: 1 } (unique: true)

// Compound index for user timeline queries
{ userId: 1, snapshotDate: -1 }

// Index for format type filtering
{ userId: 1, 'metadata.formatType': 1 }

// Index for position lookups by ISIN
{ 'positions.isin': 1 }
```

### Supported Format Types

```typescript
enum SnapshotFormatType {
  BOURSOBANK_SNAPSHOT = 'boursobank_snapshot',
  FORTUNEO_SNAPSHOT = 'fortuneo_snapshot',
  BOURSE_DIRECT_SNAPSHOT = 'bourse_direct_snapshot',
  DEGIRO_POSITIONS = 'degiro_positions',
  TRADE_REPUBLIC_SNAPSHOT = 'trade_republic_snapshot',
  INTERACTIVE_BROKERS_SNAPSHOT = 'interactive_brokers_snapshot',
  GENERIC_CSV = 'generic_csv',
  UNKNOWN = 'unknown'
}
```

### Example Document

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "uploadId": ObjectId("507f1f77bcf86cd799439012"),
  "userId": "507f1f77bcf86cd799439011",
  "snapshotDate": ISODate("2024-01-15T00:00:00.000Z"),
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
      "gainLossPercentage": 25.00,
      "currency": "USD",
      "exchange": "NASDAQ",
      "symbol": "AAPL",
      "symbolSource": "asset_name_extraction"
    },
    {
      "isin": "FR0000120073",
      "assetName": "Air Liquide",
      "quantity": 5,
      "currentPrice": 160.50,
      "currentValue": 802.50,
      "averageBuyingPrice": 145.00,
      "totalInvested": 725.00,
      "gainLoss": 77.50,
      "gainLossPercentage": 10.69,
      "currency": "EUR",
      "exchange": "EURONEXT",
      "symbol": "AI.PA"
    }
  ],
  "metadata": {
    "formatType": "boursobank_snapshot",
    "bankName": "Boursobank",
    "detectionConfidence": 0.95,
    "parseWarnings": [],
    "customFields": {}
  },
  "totalValue": 12540.50,
  "totalInvested": 10000.00,
  "totalGainLoss": 2540.50,
  "totalGainLossPercentage": 25.41,
  "createdAt": ISODate("2024-01-15T10:30:00.000Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

---

## Collection: `symbol_mappings`

Stores ISIN to ticker symbol mappings for real-time price lookups.

### Schema

```typescript
{
  _id: ObjectId,
  isin: string,                       // ISIN code (unique, indexed)
  ticker: string,                     // Stock ticker symbol (indexed)
  name: string,                       // Company/asset name
  exchange?: string,                  // Stock exchange
  currency?: string,                  // Trading currency
  type?: string,                      // 'stock' | 'etf' | 'fund'
  source?: string,                    // 'manual' | 'api' | 'predefined'
  verified?: boolean,                 // Whether mapping is verified
  lastVerified?: Date,                // Last verification date
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```javascript
// Unique index on ISIN
{ isin: 1 } (unique: true)

// Index on ticker for reverse lookups
{ ticker: 1 }

// Index on type for filtering
{ type: 1 }
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Unique identifier |
| `isin` | string | Yes | International Securities Identification Number |
| `ticker` | string | Yes | Stock ticker symbol (e.g., "AAPL", "MSFT") |
| `name` | string | Yes | Full name of the security |
| `exchange` | string | No | Stock exchange (e.g., "NASDAQ", "NYSE", "EURONEXT") |
| `currency` | string | No | Trading currency (e.g., "USD", "EUR") |
| `type` | string | No | Asset type: 'stock', 'etf', or 'fund' |
| `source` | string | No | How mapping was created: 'manual', 'api', or 'predefined' |
| `verified` | boolean | No | Whether the mapping has been verified |
| `lastVerified` | Date | No | When the mapping was last verified |
| `createdAt` | Date | Yes | Creation timestamp |
| `updatedAt` | Date | Yes | Last update timestamp |

### Example Document

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "isin": "US0378331005",
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "exchange": "NASDAQ",
  "currency": "USD",
  "type": "stock",
  "source": "predefined",
  "verified": true,
  "lastVerified": ISODate("2024-01-15T00:00:00.000Z"),
  "createdAt": ISODate("2024-01-01T00:00:00.000Z"),
  "updatedAt": ISODate("2024-01-15T00:00:00.000Z")
}
```

---

## Relationships

### users ↔ uploads
- **Type:** One-to-Many
- **Relationship:** One user can have many uploads
- **Foreign Key:** `uploads.userId` → `users._id` (as string)

### users ↔ portfolioSnapshots
- **Type:** One-to-Many
- **Relationship:** One user can have many snapshots
- **Foreign Key:** `portfolioSnapshots.userId` → `users._id` (as string)

### uploads ↔ portfolioSnapshots
- **Type:** One-to-One
- **Relationship:** One upload produces exactly one snapshot
- **Foreign Key:** `portfolioSnapshots.uploadId` → `uploads._id` (ObjectId, unique)

### portfolioSnapshots ↔ symbol_mappings
- **Type:** Many-to-Many (implicit)
- **Relationship:** Positions reference symbol mappings via ISIN
- **Join Field:** `portfolioSnapshots.positions[].isin` ↔ `symbol_mappings.isin`

## Entity Relationship Diagram

```
┌─────────────┐
│   users     │
│             │
│ _id (PK)    │──┐
│ email       │  │
│ password    │  │
└─────────────┘  │
                 │ 1:N
                 │
       ┌─────────┴──────────────┐
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────────┐
│   uploads   │         │ portfolioSnapshots│
│             │         │                  │
│ _id (PK)    │────────▶│ uploadId (FK)    │
│ userId (FK) │   1:1   │ userId (FK)      │
│ filename    │         │ positions[]      │
└─────────────┘         │   └─ isin  ──────┼───┐
                        │   └─ symbol      │   │
                        └──────────────────┘   │ M:N
                                               │
                                               ▼
                                        ┌────────────────┐
                                        │symbol_mappings │
                                        │                │
                                        │ isin (PK)      │
                                        │ ticker         │
                                        │ name           │
                                        └────────────────┘
```

---

## Data Retention

- **Users:** Retained indefinitely until user deletion
- **Uploads:** Retained until manually deleted by user
- **Snapshots:** Automatically deleted when associated upload is deleted
- **Symbol Mappings:** Retained indefinitely (shared resource)

## Backup Strategy

Recommended backup strategy:
1. **Daily full backups** of entire database
2. **Hourly incremental backups** for production
3. **Point-in-time recovery** enabled for critical collections (users, portfolioSnapshots)
4. **Retention:** Keep daily backups for 30 days, monthly backups for 1 year

## Performance Considerations

### Indexing
- All recommended indexes are defined in model files
- Run index creation scripts on deployment: `initializeUserIndexes()`, `initializePortfolioSnapshotIndexes()`, `initializeSymbolMappingIndexes()`

### Query Optimization
- Use projection to limit returned fields
- Leverage compound indexes for sorted queries
- Consider adding `userId` index on `uploads` collection for large datasets

### Scaling
- **Sharding key recommendation:** `userId` for user-centric data (uploads, snapshots)
- **Replica sets:** Recommended for high availability
- **Connection pooling:** Configure appropriate pool size in connection string

---

## Migration Scripts

When schema changes are needed:

1. Create migration script in `/back/src/migrations/`
2. Use MongoDB change streams for zero-downtime migrations
3. Test migrations on staging environment first
4. Backup database before running migrations

Example migration structure:
```javascript
export async function up() {
  // Apply schema changes
}

export async function down() {
  // Rollback changes
}
```
