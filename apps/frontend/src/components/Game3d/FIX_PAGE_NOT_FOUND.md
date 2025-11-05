# Fix: "Page Doesn't Exist" Error for 3D Game

## Problem
When selecting the Smash skill and starting a game, the application was navigating to `/game3d/{roomId}` but showing a "page doesn't exist" error.

## Root Causes

### 1. Missing Route Definition
The router had a route for `/game3d` but not for `/game3d/:roomId` (with the roomId parameter).

### 2. Missing WebSocket Connection
The Game3d component wasn't reading the WebSocket URL correctly, so it couldn't connect to the game server.

---

## Fixes Applied

### Fix 1: Added `/game3d/:roomId` Route
**File**: `apps/frontend/src/router/Router.ts`

**Added**:
```typescript
this.routes.push({
    path: '/game3d/:roomId',
    view: Game3dView,
    title: 'Pong 3D gaming',
    beforeEnter: async (to, from, params) => {
        return await roomExistsGuard(to, from, params);
    },
});
```

**Removed**: The old `/game3d` route without the roomId parameter

**Why**: The router needs to handle URLs like `/game3d/abc-123-def` where `abc-123-def` is the room ID. The `:roomId` is a URL parameter that gets extracted and validated.

---

### Fix 2: WebSocket URL Connection
**File**: `apps/frontend/src/components/Game3d/Game3d.ts`

**Updated `connectToServer()` method**:
```typescript
private connectToServer() {
    // First check if URL is stored in sessionStorage (from waiting room)
    const storedUrl = sessionStorage.getItem('gameWsURL');
    if (storedUrl) {
        console.log('3D Game: Connecting with stored URL:', storedUrl);
        this.net.connect(storedUrl);
    } else {
        // Fallback: construct URL from current path
        const host = import.meta.env.VITE_HOST;
        const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
        const roomId = window.location.pathname.split('/').pop();
        const fallbackUrl =
            host && endpoint && roomId ? `wss://${host}${endpoint}/${roomId}` : undefined;
        console.log('3D Game: Connecting with fallback URL:', fallbackUrl);
        this.net.connect(fallbackUrl);
    }
}
```

**Why**: 
- The waiting room stores the WebSocket URL in `sessionStorage` as `gameWsURL`
- If that's available, use it (normal flow)
- If not, extract the roomId from the URL path and construct the WebSocket URL

---

### Fix 3: Session Storage Cleanup
**File**: `apps/frontend/src/components/Game3d/Game3d.ts`

**Added cleanup in two places**:

1. **On Game Over**:
```typescript
this.net.onGameOver = (winner) => {
    console.log('3D Game: Game over, winner is', winner);
    sessionStorage.removeItem('gameWsURL'); // Clean up
};
```

2. **On Dispose**:
```typescript
public dispose() {
    sessionStorage.removeItem('gameWsURL'); // Clean up
    this.net.cleanup();
    // ...rest of cleanup
}
```

**Why**: Prevents stale WebSocket URLs from being reused in future games.

---

## Flow After Fix

```
1. Player selects SMASH → Navigate to /play/waiting
                              ↓
2. Waiting room joins match → Receives gameServerURL
                              ↓
3. Stores in sessionStorage → sessionStorage.setItem('gameWsURL', url)
                              ↓
4. Navigate to /game3d/{roomId} → Router finds matching route ✅
                              ↓
5. Game3dView loads → Calls initGame3d()
                              ↓
6. Game3d connects to server → Reads sessionStorage.getItem('gameWsURL')
                              ↓
7. WebSocket connection established → Game starts! 🎮
```

---

## Testing

### Test Case 1: Normal Flow (Waiting Room)
1. Go to `/play`
2. Select **Smash**
3. Click **Play Online**
4. Wait for opponent
5. **Expected**: Redirects to `/game3d/{roomId}` and game loads successfully

### Test Case 2: Direct URL Access
1. Manually navigate to `/game3d/some-room-id`
2. **Expected**: 
   - If room exists: Game loads (using fallback URL construction)
   - If room doesn't exist: Router guard redirects to home

### Verify in Console:
```
3D Game: Connecting with stored URL: wss://localhost:8443/gameback/game/abc-123
WebSocket opened, sending logIn with ID: player_abc123
Welcome from server
3D Game: Assigned to side left
```

---

## Related Files

- ✅ `apps/frontend/src/router/Router.ts` - Added route
- ✅ `apps/frontend/src/components/Game3d/Game3d.ts` - Fixed connection
- ✅ `apps/frontend/src/views/WaitingRoomView.ts` - Already correct (navigates to `/game3d/{roomId}`)
- ✅ `apps/frontend/src/views/Game3dView.ts` - Already correct (loads Game3d)

---

## Summary

The page doesn't exist error was caused by:
1. ❌ Missing route for `/game3d/:roomId`
2. ❌ Game3d not connecting to WebSocket properly

Both issues are now fixed! The 3D game should now load correctly when selecting the Smash skill. 🎮✨
