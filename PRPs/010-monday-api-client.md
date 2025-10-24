# PRP-010: Monday API Client

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Implement Monday.com API client with authentication, rate limiting, error handling, retry logic, and comprehensive mocking for development and testing environments.

## Scope

### Files to Create
- `src/lib/monday/MondayClient.ts` - Main API client
- `src/lib/monday/MondayAuth.ts` - Authentication handler
- `src/lib/monday/RateLimiter.ts` - Rate limiting logic
- `src/lib/monday/QueryBuilder.ts` - GraphQL query builder
- `src/lib/monday/ErrorHandler.ts` - Error handling
- `src/lib/monday/RetryHandler.ts` - Retry logic with exponential backoff
- `src/lib/monday/MockMondayClient.ts` - Mock client for testing
- `src/lib/monday/types.ts` - Monday.com type definitions
- `src/lib/monday/config.ts` - Monday configuration
- `tests/unit/lib/monday/MondayClient.test.ts` - Client tests
- `tests/unit/lib/monday/RateLimiter.test.ts` - Rate limiter tests
- `tests/unit/lib/monday/QueryBuilder.test.ts` - Query builder tests
- `tests/unit/lib/monday/ErrorHandler.test.ts` - Error handler tests
- `tests/integration/lib/monday/MondayClient.test.ts` - Integration tests
- `.env.example` - Add Monday.com credentials template

### Environment Variables
```env
MONDAY_API_KEY=your_api_key_here
MONDAY_API_VERSION=2024-01
MONDAY_RATE_LIMIT_PER_MINUTE=60
MONDAY_TIMEOUT_MS=10000
MONDAY_RETRY_MAX_ATTEMPTS=3
MONDAY_ENABLE_MOCK=false
```

## Implementation Steps

1. **Set Up Monday.com SDK**
   - Install `monday-sdk-js` package
   - Configure authentication with API key
   - Set up GraphQL client
   - Configure timeout and connection settings
   - Add TypeScript type definitions

2. **Build Rate Limiter**
   - Implement token bucket algorithm
   - Track API calls per minute (60/minute limit)
   - Queue requests when limit reached
   - Auto-retry after rate limit reset
   - Log rate limit warnings
   - Expose metrics for monitoring

3. **Create Query Builder**
   - Build GraphQL queries for common operations
   - Query boards, items, columns, groups
   - Support pagination for large datasets
   - Add field selection (minimize payload)
   - Build mutations (create, update, delete)
   - Validate query syntax

4. **Implement Error Handler**
   - Catch Monday.com API errors
   - Map error codes to user-friendly messages
   - Log errors with context
   - Differentiate between client vs. server errors
   - Handle network errors
   - Track error metrics

5. **Build Retry Handler**
   - Implement exponential backoff strategy
   - Retry on transient errors (500, 502, 503, 504)
   - Don't retry on client errors (400, 401, 403, 404)
   - Max 3 retry attempts with delays: 1s, 2s, 4s
   - Log retry attempts
   - Track retry success rate

6. **Create Mock Client**
   - Implement same interface as real client
   - Return mock data for development
   - Simulate API delays
   - Simulate error scenarios
   - Support E2E testing without real Monday.com account
   - Auto-switch based on MONDAY_ENABLE_MOCK env var

7. **Write Comprehensive Tests**
   - Unit tests for each component
   - Test rate limiting behavior
   - Test error handling and retries
   - Test query building
   - Integration tests with mock client
   - Test authentication failure scenarios

## Acceptance Criteria

- [ ] Monday.com SDK is installed and configured
- [ ] API authentication works with API key
- [ ] Rate limiter enforces 60 requests/minute limit
- [ ] Requests are queued when rate limit reached
- [ ] Query builder generates valid GraphQL queries
- [ ] Common operations have predefined queries (get boards, items, etc.)
- [ ] Error handler catches and logs all API errors
- [ ] Errors are mapped to user-friendly messages
- [ ] Retry handler implements exponential backoff
- [ ] Transient errors are retried up to 3 times
- [ ] Client errors are not retried
- [ ] Mock client implements same interface as real client
- [ ] Mock client can be enabled via environment variable
- [ ] All Monday client tests pass (unit, integration)
- [ ] TypeScript types are defined for Monday.com entities

## Validation Steps

```bash
# 1. Install Monday.com SDK
npm install monday-sdk-js

# 2. Add environment variables
cp .env.example .env.local
# Edit .env.local and add your Monday.com API key

# 3. Test authentication
node -e "
const { MondayClient } = require('./src/lib/monday/MondayClient');
const client = new MondayClient(process.env.MONDAY_API_KEY);
client.getBoards().then(boards => {
  console.log('✓ Authentication successful');
  console.log('Boards:', boards.length);
});
"

# 4. Test rate limiting
# Create script to make 100 requests rapidly
node scripts/test-rate-limit.js
# Should queue requests and throttle to 60/minute

# 5. Test error handling
node -e "
const { MondayClient } = require('./src/lib/monday/MondayClient');
const client = new MondayClient('invalid_key');
client.getBoards().catch(err => {
  console.log('✓ Error handled:', err.message);
});
"

# 6. Test mock client
MONDAY_ENABLE_MOCK=true npm run dev
# Should use mock client instead of real API

# 7. Run unit tests
npm run test -- tests/unit/lib/monday/MondayClient.test.ts
npm run test -- tests/unit/lib/monday/RateLimiter.test.ts
npm run test -- tests/unit/lib/monday/QueryBuilder.test.ts
npm run test -- tests/unit/lib/monday/ErrorHandler.test.ts
# All tests should pass

# 8. Run integration tests
npm run test:ci -- tests/integration/lib/monday/MondayClient.test.ts
# Should use mock client for testing

# 9. Test query builder
node -e "
const { QueryBuilder } = require('./src/lib/monday/QueryBuilder');
const query = QueryBuilder.getBoard('12345', ['name', 'state']);
console.log('✓ Query built:', query);
"

# 10. Test retry logic
# Simulate 503 error and verify retry
node scripts/test-retry.js
# Should retry 3 times with exponential backoff
```

## Expected Output

```
✓ Monday.com SDK installed
✓ API authentication successful
✓ Rate limiter enforces 60 req/min limit
✓ Requests queued when limit reached
✓ Query builder generates valid queries
✓ Error handler catches all errors
✓ Errors mapped to friendly messages
✓ Retry handler implements exponential backoff
✓ Transient errors retried (max 3 attempts)
✓ Client errors not retried
✓ Mock client enabled via env var
✓ All Monday client tests passing (28/28)
```

## Monday.com API Operations

```typescript
interface MondayClient {
  // Authentication
  authenticate(apiKey: string): Promise<void>;

  // Boards
  getBoards(): Promise<Board[]>;
  getBoard(boardId: string): Promise<Board>;

  // Items
  getItems(boardId: string): Promise<Item[]>;
  getItem(itemId: string): Promise<Item>;
  createItem(boardId: string, itemName: string, columnValues: Record<string, any>): Promise<Item>;
  updateItem(itemId: string, columnValues: Record<string, any>): Promise<Item>;
  deleteItem(itemId: string): Promise<void>;

  // Groups
  getGroups(boardId: string): Promise<Group[]>;
  createGroup(boardId: string, groupName: string): Promise<Group>;
  updateGroup(groupId: string, groupName: string): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;

  // Columns
  getColumns(boardId: string): Promise<Column[]>;
  getColumnValues(itemId: string): Promise<ColumnValue[]>;
  updateColumnValue(itemId: string, columnId: string, value: any): Promise<void>;

  // Webhooks
  createWebhook(boardId: string, url: string, event: string): Promise<Webhook>;
  deleteWebhook(webhookId: string): Promise<void>;
}
```

## Rate Limiting Strategy

```typescript
class RateLimiter {
  private tokens: number = 60; // 60 requests per minute
  private lastRefill: Date = new Date();
  private queue: Array<() => Promise<any>> = [];

  async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    // Refill tokens every minute
    if (Date.now() - this.lastRefill.getTime() > 60000) {
      this.tokens = 60;
      this.lastRefill = new Date();
    }

    // If no tokens, queue request
    if (this.tokens === 0) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await request();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    // Execute immediately
    this.tokens--;
    return request();
  }
}
```

## Error Codes

```typescript
const MondayErrorCodes = {
  400: 'Bad Request - Invalid query or parameters',
  401: 'Unauthorized - Invalid or missing API key',
  403: 'Forbidden - Insufficient permissions',
  404: 'Not Found - Board or item does not exist',
  429: 'Rate Limit Exceeded - Too many requests',
  500: 'Internal Server Error - Monday.com service error',
  502: 'Bad Gateway - Monday.com temporarily unavailable',
  503: 'Service Unavailable - Monday.com maintenance',
  504: 'Gateway Timeout - Request took too long'
};

// Retriable errors
const RetriableErrors = [500, 502, 503, 504];

// Non-retriable errors
const NonRetriableErrors = [400, 401, 403, 404, 429];
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation)
- Blocks: PRP-011 (Monday Sync Service), PRP-012 (Monday Webhooks)

## Estimated Time
5-6 hours

## Notes
- Monday.com uses GraphQL API (not REST)
- Rate limit is 60 requests per minute per API key
- API key should be stored in environment variable, never in code
- Consider implementing circuit breaker pattern for resilience (future)
- Mock client should support all operations for comprehensive testing
- Log all API calls for debugging and monitoring
- Consider caching frequently accessed boards/items (future)
- Track API usage metrics for billing optimization

## Rollback Plan
If validation fails:
1. Verify Monday.com API key is valid
2. Check network connectivity to Monday.com
3. Test with Monday.com API playground first
4. Verify GraphQL query syntax
5. Check rate limiting logic with load test
6. Test error handling with invalid requests
7. Disable Monday.com integration and use mock client
