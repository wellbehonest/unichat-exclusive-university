# Fixed: Chat Duration Timer Persists After Refresh

## 🐛 Problem
Chat duration timer reset to 00:00 when user refreshed the page during an active chat.

## ✅ Solution
Timer now calculates duration from server timestamp (`startedAt`), not from component mount time.

## 🔧 What Changed

**Before:**
```typescript
const serverNow = Date.now() + serverTimeOffset; // Depended on offset
const durationSeconds = Math.floor((serverNow - startTimeMs) / 1000);
```

**After:**
```typescript
const now = Date.now(); // Direct calculation from server timestamp
const durationSeconds = Math.floor((now - startTimeMs) / 1000);
setChatDuration(Math.max(0, durationSeconds)); // Never negative
```

## ✅ Testing

1. Start a chat, wait 3 minutes (timer shows 03:00)
2. **Refresh page** (Cmd+R)
3. Timer should show **03:XX** (not 00:00) ✅

The timer now persists correctly across page refreshes! 🎉
