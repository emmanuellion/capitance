# State Management Guide - Capitance Frontend

This document explains the state management patterns used in the Capitance frontend application.

## Overview

Capitance uses a combination of state management solutions:
- **Global State:** React Context API (`AuthContext`, `ThemeContext`)
- **Server State:** TanStack Query (React Query)
- **Form State:** react-hook-form + zod validation
- **Local State:** React useState/useReducer

---

## Global State - React Context

### AuthContext

**Location:** `src/contexts/AuthContext.tsx`

**Purpose:** Manages authentication state across the application

**State:**
```typescript
{
  user: User | null;
  loading: boolean;
}
```

**Methods:**
- `login(email, password, rememberMe)` - Authenticate user
- `register(email, password, confirmPassword)` - Create account
- `logout()` - Sign out
- `refreshUser()` - Reload user data

**Usage:**
```tsx
import { useAuth } from '@/contexts/AuthContext';

function Component() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome, {user.email}</div>;
}
```

**Implementation Details:**
- Uses HttpOnly cookies for token storage
- Auto-refreshes access tokens
- Loads user on app initialization
- Provides loading state during initial auth check

---

### ThemeContext

**Location:** `src/contexts/ThemeContext.tsx`

**Purpose:** Manages light/dark theme preference

**State:**
```typescript
{
  theme: 'light' | 'dark' | 'system';
}
```

**Methods:**
- `setTheme(theme)` - Change theme preference

**Usage:**
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

**Persistence:** Stored in `localStorage`

---

## Server State - TanStack Query

### Configuration

**Location:** `src/app/layout.tsx`

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // 1 minute
      cacheTime: 5 * 60 * 1000,       // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

### Query Patterns

#### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => api.get('/snapshots'),
    staleTime: 2 * 60 * 1000,  // 2 minutes
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Error message={error.message} />;

  return <div>{data.snapshots.length} snapshots</div>;
}
```

#### Query with Parameters

```tsx
const { data } = useQuery({
  queryKey: ['snapshot', snapshotId],
  queryFn: () => api.get(`/snapshots/${snapshotId}`),
  enabled: !!snapshotId,  // Only run if snapshotId exists
});
```

#### Auto-refetching Query

```tsx
const { data } = useQuery({
  queryKey: ['realtime-prices', snapshotId],
  queryFn: () => api.get(`/realtime/snapshots/${snapshotId}`),
  refetchInterval: 2 * 60 * 1000,  // Refetch every 2 minutes
  refetchIntervalInBackground: false,  // Pause when tab is inactive
});
```

### Mutation Patterns

#### Basic Mutation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function Component() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => api.post('/snapshots', data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    },
    onError: (error) => {
      console.error('Mutation failed:', error);
    },
  });

  return (
    <button onClick={() => mutation.mutate({ data })}>
      {mutation.isLoading ? 'Loading...' : 'Create Snapshot'}
    </button>
  );
}
```

#### Optimistic Updates

```tsx
const mutation = useMutation({
  mutationFn: updateSnapshot,
  onMutate: async (newSnapshot) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['snapshots'] });

    // Snapshot previous value
    const previousSnapshots = queryClient.getQueryData(['snapshots']);

    // Optimistically update cache
    queryClient.setQueryData(['snapshots'], (old) => [...old, newSnapshot]);

    return { previousSnapshots };
  },
  onError: (err, newSnapshot, context) => {
    // Rollback on error
    queryClient.setQueryData(['snapshots'], context.previousSnapshots);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['snapshots'] });
  },
});
```

---

## Real-time Data Flow

### Architecture

```
User Action → Component → React Query → API Call → Backend
                                ↓
                          Cache (stale/fresh)
                                ↓
                        Auto-refetch (2min)
                                ↓
                          Update UI
```

### Example: Real-time Portfolio

```tsx
function RealtimePortfolio({ snapshotId }) {
  // 1. Fetch enriched snapshot with auto-refresh
  const { data: snapshot } = useEnrichedSnapshot(snapshotId);

  // 2. Fetch significant changes (optional)
  const { data: changes } = useSignificantChanges(snapshotId, 2.0);

  // 3. Manual refresh mutation
  const refreshMutation = useRefreshPrices();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  return (
    <div>
      <RealtimePortfolioSummary snapshot={snapshot} />
      {changes && <SignificantChangesAlert changes={changes} />}
      <Button onClick={handleRefresh}>Refresh Prices</Button>
    </div>
  );
}
```

### Cache Invalidation Strategy

**When to invalidate:**
1. After mutations (POST, PUT, DELETE)
2. After file uploads
3. After manual refresh
4. After authentication changes

**Example:**
```tsx
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['snapshots', snapshotId] });

// Invalidate all snapshots queries
queryClient.invalidateQueries({ queryKey: ['snapshots'] });

// Invalidate exact match only
queryClient.invalidateQueries({
  queryKey: ['snapshots', snapshotId],
  exact: true
});
```

---

## Form State - react-hook-form + zod

### Form Pattern

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.post('/auth/login', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## Local State - useState/useReducer

### Simple State

```tsx
function Component() {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  );
}
```

### Complex State with useReducer

```tsx
type State = {
  filters: { type: string; date: string };
  sortBy: 'date' | 'value';
  sortOrder: 'asc' | 'desc';
};

type Action =
  | { type: 'SET_FILTER'; key: string; value: string }
  | { type: 'SET_SORT'; sortBy: string; sortOrder: string }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'SET_SORT':
      return { ...state, sortBy: action.sortBy, sortOrder: action.sortOrder };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function Component() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      <button onClick={() => dispatch({ type: 'RESET' })}>
        Reset Filters
      </button>
    </div>
  );
}
```

---

## Derived State

### useMemo for Expensive Computations

```tsx
function PortfolioAnalytics({ positions }) {
  const totalValue = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.currentValue, 0);
  }, [positions]);

  const topGainers = useMemo(() => {
    return positions
      .filter(p => p.gainLossPercentage > 0)
      .sort((a, b) => b.gainLossPercentage - a.gainLossPercentage)
      .slice(0, 5);
  }, [positions]);

  return (
    <div>
      <div>Total: {totalValue}</div>
      <div>Top Gainers: {topGainers.length}</div>
    </div>
  );
}
```

---

## Performance Optimization

### Component Memoization

```tsx
const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive rendering
  return <div>{data}</div>;
});
```

### Callback Memoization

```tsx
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

## State Management Best Practices

1. **Use the right tool:**
   - React Context for global UI state (auth, theme)
   - React Query for server state
   - useState for simple local state
   - useReducer for complex local state

2. **Avoid prop drilling:** Use Context or React Query

3. **Keep state close to where it's used:** Don't lift state unnecessarily

4. **Normalize data:** Avoid nested state structures

5. **Use TypeScript:** Type your state and actions

6. **Handle loading/error states:** Always show appropriate UI

7. **Optimize re-renders:** Use memo, useCallback, useMemo wisely

8. **Cache strategically:** Configure appropriate staleTime and cacheTime

9. **Invalidate smartly:** Only invalidate what changed
