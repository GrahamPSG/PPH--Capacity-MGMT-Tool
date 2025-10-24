# PRP-024: WebSocket Real-time Updates

## Status
🔲 Not Started

## Priority
P2 - Medium (Enhanced collaboration)

## Objective
Implement WebSocket-based real-time updates using Socket.io for collaborative features including live capacity updates, presence indicators, and instant notifications across all connected clients.

## Scope

### Files to Create
- `src/server/websocket/socket-server.ts` - Socket.io server setup
- `src/server/websocket/handlers/capacity.handler.ts` - Capacity update handler
- `src/server/websocket/handlers/project.handler.ts` - Project update handler
- `src/server/websocket/handlers/alert.handler.ts` - Alert notification handler
- `src/server/websocket/handlers/presence.handler.ts` - User presence handler
- `src/server/websocket/middleware/auth.middleware.ts` - Socket auth middleware
- `src/lib/websocket/client.ts` - WebSocket client wrapper
- `src/hooks/useWebSocket.ts` - WebSocket React hook
- `src/hooks/usePresence.ts` - User presence hook
- `src/hooks/useRealtimeUpdates.ts` - Real-time data updates hook
- `src/components/realtime/PresenceIndicator.tsx` - User presence UI
- `src/components/realtime/OnlineUsers.tsx` - Online users list
- `src/components/realtime/LiveUpdateBadge.tsx` - Live update indicator
- `tests/websocket/socket-server.test.ts` - Server tests
- `tests/websocket/handlers.test.ts` - Handler tests

### Dependencies to Install
```bash
npm install socket.io socket.io-client
npm install --save-dev @types/socket.io
```

## Implementation Steps

1. **Set Up Socket.io Server**
   - Initialize Socket.io with Next.js custom server
   - Configure CORS for development and production
   - Set up connection pooling
   - Implement heartbeat/ping-pong
   - Handle connection/disconnection events

2. **Implement Authentication Middleware**
   - Verify JWT token on socket connection
   - Attach user info to socket instance
   - Reject unauthorized connections
   - Handle token expiration
   - Support reconnection with new token

3. **Create Event Handlers**
   - **Capacity Updates**: Broadcast when crew assignments change
   - **Project Updates**: Notify when project/phase updated
   - **Alerts**: Push new financial alerts to relevant users
   - **Presence**: Track online/offline user status
   - **Chat**: Real-time comments/notes (future)

4. **Build WebSocket Client**
   - Singleton client connection
   - Auto-reconnect on disconnect
   - Exponential backoff for retries
   - Queue messages during disconnect
   - Emit events to server
   - Listen for events from server

5. **Create React Hooks**
   - `useWebSocket`: Core WebSocket connection hook
   - `usePresence`: Track who's online
   - `useRealtimeUpdates`: Subscribe to entity updates
   - `useTypingIndicator`: Show when users are typing
   - Auto-cleanup on unmount

6. **Implement Presence System**
   - Track active users by page/resource
   - Show who's viewing same project
   - Display user avatars with online status
   - "X is editing this project" indicator
   - Idle detection (5 min timeout)

7. **Add Optimistic Updates**
   - Update UI immediately on user action
   - Emit event to server
   - Server broadcasts to other clients
   - Rollback if server rejects
   - Conflict resolution strategy

8. **Create Notification System**
   - Toast notifications for real-time events
   - "New alert" badge in header
   - Sound notifications (optional)
   - Desktop notifications via Web Notifications API
   - Notification preferences per user

9. **Implement Room/Channel System**
   - Join project-specific rooms
   - Join division-specific rooms
   - Join user-specific room (for DMs)
   - Leave rooms on navigation
   - Broadcast to specific rooms only

10. **Add Connection Status UI**
    - Connected/Disconnected indicator
    - Reconnecting spinner
    - Offline mode warning
    - Connection quality indicator
    - Manual reconnect button

## Acceptance Criteria

- [ ] WebSocket server starts with Next.js dev server
- [ ] Clients authenticate successfully on connection
- [ ] Capacity updates broadcast to all connected clients in real-time
- [ ] Project updates appear immediately across all open sessions
- [ ] Alert notifications push to users instantly
- [ ] User presence shows who's online and viewing each project
- [ ] Auto-reconnect works after network interruption
- [ ] Optimistic updates provide instant feedback
- [ ] Connection status indicator shows current state
- [ ] Room/channel system isolates events to relevant users
- [ ] All WebSocket events are type-safe (TypeScript)
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Install Socket.io dependencies
npm install socket.io socket.io-client @types/socket.io

# 2. Run WebSocket server tests
npm test -- tests/websocket/socket-server.test.ts

# 3. Run handler tests
npm test -- tests/websocket/handlers.test.ts

# 4. Start dev server with WebSocket support
npm run dev
# Should see "WebSocket server started on port 3001" in console

# 5. Test connection
# Open browser DevTools -> Network -> WS
# Navigate to app
# Verify WebSocket connection established

# 6. Test capacity real-time updates
# Open app in two browser windows side-by-side
# In window 1: update crew assignment
# In window 2: verify capacity updates immediately without refresh

# 7. Test project updates
# Open same project in two windows
# In window 1: edit project name
# In window 2: verify project name updates in real-time

# 8. Test presence indicator
# Open project detail in two windows
# Verify both users shown as "viewing this project"
# Close one window
# Verify user removed from presence list

# 9. Test alert notifications
# Trigger financial alert (set cash balance below threshold)
# Verify all connected users receive notification
# Verify toast appears with alert message

# 10. Test reconnection
# Disconnect network (or pause in DevTools)
# Verify "Disconnected" indicator appears
# Reconnect network
# Verify auto-reconnect and "Connected" indicator

# 11. Test room isolation
# Open different projects in two windows
# Update project A
# Verify project B window doesn't receive update

# 12. Test with multiple users
# Login as different users in different browsers
# Verify user presence shows correct avatars
# Verify events reach appropriate users only

# 13. Check WebSocket metrics
# Open http://localhost:3001/socket-stats (if implemented)
# Verify connection count, event counts

# 14. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Socket.io server running on port 3001
✓ WebSocket authentication middleware
✓ Event handlers for capacity, projects, alerts, presence
✓ WebSocket client with auto-reconnect
✓ React hooks for real-time features
✓ User presence system with online indicators
✓ Optimistic updates with rollback
✓ Real-time notification system
✓ Room/channel isolation
✓ Connection status UI
✓ All tests passing (>80% coverage)
```

## WebSocket Event Types

### Client → Server
```typescript
// Join project room
socket.emit('project:join', { projectId: 'uuid' })

// Update capacity
socket.emit('capacity:update', { employeeId: 'uuid', hours: 40 })

// Typing indicator
socket.emit('typing:start', { projectId: 'uuid', field: 'notes' })
```

### Server → Client
```typescript
// Capacity updated
socket.on('capacity:updated', (data) => {
  // data: { division, employeeId, newUtilization }
})

// Project updated
socket.on('project:updated', (data) => {
  // data: { projectId, field, newValue, updatedBy }
})

// New alert
socket.on('alert:new', (alert) => {
  // alert: Alert object
})

// User presence
socket.on('presence:change', (data) => {
  // data: { userId, status: 'online' | 'offline' | 'idle' }
})
```

## Related PRPs
- Depends on: PRP-003 (Authentication), PRP-001 (Project Initialization)
- Blocks: None (enhances other PRPs)
- Related: PRP-022 (Capacity Dashboard), PRP-018 (Financial Alerts)

## Estimated Time
10-12 hours

## Notes
- Run Socket.io on separate port (3001) from Next.js (3000)
- Use Redis adapter for multi-server deployments (scaling)
- Implement rate limiting (100 events/minute per connection)
- Log all WebSocket events for debugging
- Consider message queue (Redis Pub/Sub) for reliability
- Implement event replay for missed events during disconnect
- Use binary protocol for large data transfers
- Compress large events with gzip
- Monitor WebSocket connection count and memory usage
- Consider using SWR or React Query with WebSocket updates
- Add circuit breaker for failing connections
- Implement graceful shutdown (close connections on deploy)
- Use Socket.io rooms for efficient broadcasting
- Consider alternative: Server-Sent Events (SSE) for one-way updates

## Security Considerations
- Validate all incoming events
- Sanitize data before broadcasting
- Rate limit per connection
- Monitor for DDoS attacks
- Use secure WebSocket (wss://) in production
- Verify user permissions before broadcasting
- Log suspicious activity (rapid connections, unusual events)
- Implement CORS restrictions

## Rollback Plan
If validation fails:
1. Check Socket.io installation: `npm list socket.io`
2. Verify custom server setup in Next.js
3. Check WebSocket port not blocked by firewall
4. Test with WebSocket client tool (Postman, wscat)
5. Review server logs for connection errors
6. Verify JWT authentication working
7. Test events with simple console.log first
8. Check browser WebSocket support (all modern browsers)
9. Review CORS configuration
10. Test without authentication first, then add auth
