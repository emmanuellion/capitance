# Testing Guide - Capitance Frontend

Guide for writing and running tests in the Capitance frontend application.

## Testing Stack

- **Test Runner:** Vitest
- **Testing Library:** @testing-library/react
- **Mocking:** MSW (Mock Service Worker)
- **Assertions:** @testing-library/jest-dom

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# UI mode (interactive)
npm run test:ui

# Coverage report
npm run test:coverage
```

---

## Test File Naming

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`

Place test files next to the code they test.

---

## Writing Component Tests

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing with Providers

```tsx
import { renderWithProviders } from '@/test/utils';

describe('AuthenticatedComponent', () => {
  it('shows user email', () => {
    const { getByText } = renderWithProviders(
      <AuthenticatedComponent />,
      {
        authState: { user: { email: 'test@example.com' } }
      }
    );

    expect(getByText('test@example.com')).toBeInTheDocument();
  });
});
```

---

## Testing Hooks

### Basic Hook Test

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useEnrichedSnapshot } from './useRealtimePrices';
import { createTestQueryClient } from '@/test/utils';
import { QueryClientProvider } from '@tanstack/react-query';

describe('useEnrichedSnapshot', () => {
  it('fetches enriched snapshot', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () => useEnrichedSnapshot('snapshot-123'),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data._id).toBe('snapshot-123');
  });
});
```

---

## Mocking API Calls with MSW

### Setup MSW Handlers

**File:** `src/test/mocks/handlers.ts`

```tsx
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api/v1';

export const handlers = [
  http.get(`${API_URL}/snapshots/:id`, ({ params }) => {
    return HttpResponse.json({
      snapshot: {
        _id: params.id,
        totalValue: 10000,
        positions: [],
      },
    });
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (body.email === 'test@example.com') {
      return HttpResponse.json({
        user: { _id: '123', email: 'test@example.com' },
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),
];
```

### Use MSW in Tests

```tsx
import { server } from '@/test/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LoginForm', () => {
  it('logs in successfully', async () => {
    const { user } = renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });
});
```

---

## Testing Patterns

### Testing Loading States

```tsx
it('shows loading state', () => {
  render(<Component />);
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
});
```

### Testing Error States

```tsx
it('shows error message', async () => {
  server.use(
    http.get('/api/snapshots', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  render(<SnapshotList />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```tsx
it('handles form submission', async () => {
  const { user } = render(<ContactForm />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.type(screen.getByLabelText('Email'), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('Form submitted')).toBeInTheDocument();
  });
});
```

### Testing Conditional Rendering

```tsx
it('shows content when authenticated', () => {
  const { rerender } = renderWithProviders(<ProtectedContent />, {
    authState: { user: null }
  });

  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();

  rerender(<ProtectedContent />, {
    authState: { user: { email: 'test@example.com' } }
  });

  expect(screen.getByText('Protected content')).toBeInTheDocument();
});
```

---

## Test Utilities

### Common Test Utilities

**File:** `src/test/utils.tsx`

```tsx
export const createMockSnapshot = (overrides = {}) => ({
  _id: 'snapshot-123',
  totalValue: 10000,
  positions: [],
  ...overrides,
});

export const createMockPosition = (overrides = {}) => ({
  isin: 'US0378331005',
  assetName: 'Apple Inc.',
  quantity: 10,
  currentPrice: 150,
  ...overrides,
});

export const waitForLoadingToFinish = () =>
  waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });
```

---

## Coverage Goals

- **Overall:** 70%+
- **Components:** 60%+
- **Hooks:** 80%+
- **Utils:** 85%+

Check coverage:
```bash
npm run test:coverage
```

View HTML report: `coverage/index.html`

---

## Best Practices

1. **Test behavior, not implementation**
2. **Use accessible queries** (`getByRole`, `getByLabelText`)
3. **Avoid `data-testid`** unless necessary
4. **Test user interactions** with `@testing-library/user-event`
5. **Mock external dependencies** (APIs, third-party libraries)
6. **Keep tests isolated** - no shared state between tests
7. **Use descriptive test names** - "it should..."
8. **Test error cases** - not just happy paths
9. **Avoid snapshot tests** for UI - they're brittle
10. **Keep tests simple** - one concept per test

---

## Common Pitfalls

### ❌ Don't Query by Class Name

```tsx
// Bad
expect(container.querySelector('.button-primary')).toBeInTheDocument();

// Good
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
```

### ❌ Don't Use `getBy*` for Elements That May Not Exist

```tsx
// Bad - throws if not found
expect(screen.getByText('Optional')).not.toBeInTheDocument();

// Good
expect(screen.queryByText('Optional')).not.toBeInTheDocument();
```

### ❌ Don't Forget to Await Async Operations

```tsx
// Bad
user.click(button);
expect(screen.getByText('Success')).toBeInTheDocument();

// Good
await user.click(button);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

---

## Debugging Tests

### Log Rendered Output

```tsx
import { screen } from '@testing-library/react';

// Log current DOM
screen.debug();

// Log specific element
screen.debug(screen.getByRole('button'));
```

### Use Testing Playground

```tsx
import { screen } from '@testing-library/react';

screen.logTestingPlaygroundURL();
// Opens browser with query suggestions
```

### Check Query Availability

```tsx
// Check what queries are available
screen.getByRole('');  // Shows available roles in error message
```

---

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [MSW Docs](https://mswjs.io/)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
