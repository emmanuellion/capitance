# Component Library - Capitance Frontend

Documentation for React components in the Capitance frontend application.

## Real-time Price Components

### RealtimePortfolioSummary

**Location:** `src/components/realtime/RealtimePortfolioSummary.tsx`

**Purpose:** Displays portfolio summary with real-time price updates

**Props:**
```typescript
{
  snapshotId: string;  // ID of the snapshot to display
}
```

**Features:**
- Auto-refresh every 2 minutes using React Query
- Shows comparison between snapshot and real-time values
- Displays total value, gain/loss, and percentage changes
- Loading and error states
- Skeleton UI during loading

**Usage:**
```tsx
<RealtimePortfolioSummary snapshotId="507f1f77bcf86cd799439013" />
```

---

### RealtimePositionsTable

**Location:** `src/components/realtime/RealtimePositionsTable.tsx`

**Purpose:** Displays all positions with real-time price data in a table

**Props:**
```typescript
{
  snapshotId: string;  // Snapshot ID
}
```

**Features:**
- Virtualized table using react-window for performance
- Shows ISIN, asset name, quantity, prices, gain/loss
- Real-time price updates with change indicators
- Sortable columns
- Color-coded gains (green) and losses (red)
- Responsive design

**Dependencies:** `useEnrichedSnapshot`, `react-window`

---

### RealtimePriceIndicator

**Location:** `src/components/realtime/RealtimePriceIndicator.tsx`

**Purpose:** Small indicator showing price with up/down/neutral state

**Props:**
```typescript
{
  position: EnrichedPosition;  // Position data with realtime prices
  size?: 'sm' | 'md' | 'lg';   // Size variant (default: 'md')
}
```

**Features:**
- Price display with currency
- Change indicator (▲ up, ▼ down, — neutral)
- Color coding (green positive, red negative, gray neutral)
- Percentage change display
- Compact design for embedding

**Usage:**
```tsx
<RealtimePriceIndicator
  position={position}
  size="sm"
/>
```

---

### SignificantChangesAlert

**Location:** `src/components/realtime/SignificantChangesAlert.tsx`

**Purpose:** Alert component showing positions with significant price changes

**Props:**
```typescript
{
  snapshotId: string;
  threshold?: number;  // Percentage threshold (default: 2.0)
}
```

**Features:**
- Fetches positions exceeding threshold
- Alert-style UI with icons
- List of affected positions with change percentages
- Dismissible
- Auto-refresh

**Usage:**
```tsx
<SignificantChangesAlert
  snapshotId="..."
  threshold={3.0}  // Alert for 3%+ changes
/>
```

---

### ApiMonitoringDashboard

**Location:** `src/components/realtime/ApiMonitoringDashboard.tsx`

**Purpose:** Admin dashboard for monitoring API usage and worker stats

**Props:** None

**Features:**
- Real-time worker statistics
- API quota usage (Twelve Data, Alpha Vantage)
- Cache statistics
- Manual refresh trigger
- Cache clear functionality (admin)
- Real-time updates every 30 seconds

**Usage:**
```tsx
<ApiMonitoringDashboard />
```

---

## UI Components (shadcn/ui)

These components are from [shadcn/ui](https://ui.shadcn.com/) and customized for Capitance.

### Button

**Location:** `src/components/ui/button.tsx`

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`

**Sizes:** `default`, `sm`, `lg`, `icon`

**Usage:**
```tsx
<Button variant="default" size="lg">
  Click Me
</Button>
```

---

### Card

**Location:** `src/components/ui/card.tsx`

**Sub-components:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

---

### Table

**Location:** `src/components/ui/table.tsx`

**Sub-components:** `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

**Usage:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### Badge

**Location:** `src/components/ui/badge.tsx`

**Variants:** `default`, `secondary`, `destructive`, `outline`

**Usage:**
```tsx
<Badge variant="default">New</Badge>
```

---

### Progress

**Location:** `src/components/ui/progress.tsx`

**Props:** `value` (0-100)

**Usage:**
```tsx
<Progress value={65} />
```

---

### Skeleton

**Location:** `src/components/ui/skeleton.tsx`

**Purpose:** Loading placeholder

**Usage:**
```tsx
<Skeleton className="h-4 w-full" />
```

---

### ScrollArea

**Location:** `src/components/ui/scroll-area.tsx`

**Purpose:** Custom scrollable container

**Usage:**
```tsx
<ScrollArea className="h-[200px]">
  <div>Scrollable content</div>
</ScrollArea>
```

---

## Custom Hooks

### useRealtimePrices

**Location:** `src/hooks/useRealtimePrices.ts`

**Exports:**
- `useEnrichedSnapshot(snapshotId, enabled?)` - Fetch snapshot with realtime prices
- `useLatestEnrichedSnapshot(enabled?)` - Fetch latest snapshot
- `usePerformanceSummary(snapshotId, enabled?)` - Performance comparison
- `useSignificantChanges(snapshotId, threshold?, enabled?)` - Significant changes
- `useWorkerStats(enabled?)` - Worker statistics
- `useCacheStats(enabled?)` - Cache statistics
- `useRefreshPrices()` - Mutation to trigger manual refresh
- `useClearPriceCache()` - Mutation to clear cache

**Usage:**
```tsx
const { data, isLoading, error } = useEnrichedSnapshot(snapshotId);

const refreshMutation = useRefreshPrices();
refreshMutation.mutate();
```

---

### useAuth

**Location:** `src/contexts/AuthContext.tsx`

**Returns:**
- `user: User | null` - Current user
- `loading: boolean` - Auth loading state
- `login(email, password, rememberMe)` - Login function
- `register(email, password)` - Register function
- `logout()` - Logout function
- `refreshUser()` - Refresh user data

**Usage:**
```tsx
const { user, loading, login, logout } = useAuth();
```

---

## Layout Components

### DashboardLayout

**Location:** `src/app/dashboard/layout.tsx`

**Features:**
- Protected route (redirects if not authenticated)
- Sidebar navigation
- Header with user info
- Responsive design
- Theme toggle

---

## Theme System

Capitance uses a custom theme system with light and dark modes.

**Theme Toggle Component:**
```tsx
<ThemeToggle />
```

**CSS Variables:** Defined in `src/app/globals.css`

---

## Animation Components (Framer Motion)

**Location:** `src/components/motion/`

**Usage:** Import `motion` from `framer-motion` for animations

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

---

## Best Practices

1. **Always use TypeScript** - Define proper prop types
2. **Error boundaries** - Wrap components in error boundaries
3. **Loading states** - Show skeleton or spinner during loading
4. **Memoization** - Use `React.memo()` for expensive components
5. **Accessibility** - Add ARIA labels and keyboard navigation
6. **Responsive design** - Use Tailwind breakpoints
7. **Code splitting** - Use `React.lazy()` for large components

---

## Component Development Guidelines

### File Structure
```
ComponentName/
  ├── ComponentName.tsx        # Main component
  ├── ComponentName.test.tsx   # Tests
  └── index.ts                 # Barrel export
```

### Naming Conventions
- **Components:** PascalCase (`RealtimePortfolioSummary`)
- **Hooks:** camelCase with `use` prefix (`useRealtimePrices`)
- **Utils:** camelCase (`formatCurrency`)
- **Types:** PascalCase (`EnrichedPosition`)

### Props Pattern
```tsx
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({
  required,
  optional = defaultValue
}) => {
  // Component logic
};
```
