# Auto-Close Chat on Partner Timeout Feature

## Overview
Automatically closes chat sessions when one chat partner has been offline for more than 5 minutes. This prevents users from being stuck in inactive chats and improves the overall chat experience.

## Implementation

### Feature Details

**Trigger**: Chat partner offline for > 5 minutes
**Action**: Auto-close chat with notification
**Check Frequency**: Every 30 seconds
**Notification**: Alert message to active user

### How It Works

1. **Real-time Monitoring**:
   - Monitors chat partner's `isOnline` status via Firestore listener
   - Tracks exact moment when partner goes offline

2. **Timeout Trigger**:
   - When partner's `isOnline` changes to `false`, starts a 5-minute timer
   - Timer automatically closes chat after exactly 5 minutes
   - If partner comes back online before 5 minutes, timer is cancelled

3. **Auto-Close Process**:
   - Shows alert notification to active user
   - Clears `currentChatId` for active user
   - Removes chat from active user's screen
   - Chat document remains for potential cleanup

### Code Implementation

**Location**: `components/ChatPage.tsx` (lines ~1922-1980)

```typescript
// Monitor chat partner's activity and auto-close if offline > 5 minutes
useEffect(() => {
    if (!currentChat || !currentUser) return;

    console.log('⏰ Setting up partner activity monitor for chat:', currentChat.id);

    // Get partner's ID
    const partnerId = currentChat.participants.find(id => id !== currentUser.uid);
    if (!partnerId) return;

    let offlineSince: number | null = null; // Track when partner went offline
    let timeoutId: NodeJS.Timeout | null = null;

    // Monitor partner's presence in real-time
    const partnerRef = doc(db, 'users', partnerId);
    const unsubscribe = onSnapshot(partnerRef, (partnerDoc) => {
        const partnerData = partnerDoc.data();
        
        if (!partnerData) {
            console.log('⚠️ Partner data not found');
            return;
        }

        const isOnline = partnerData.isOnline;
        console.log(`👤 Partner status changed: ${isOnline ? 'online' : 'offline'}`);

        if (!isOnline) {
            // Partner just went offline or is still offline
            if (offlineSince === null) {
                // Record the time partner went offline
                offlineSince = Date.now();
                console.log(`⏰ Partner went offline at ${new Date(offlineSince).toLocaleTimeString()}`);
                
                // Set timeout to close chat after 5 minutes
                timeoutId = setTimeout(() => {
                    const minutesOffline = (Date.now() - offlineSince!) / (1000 * 60);
                    console.log(`⏱️ Partner offline for ${minutesOffline.toFixed(1)} minutes, auto-closing chat...`);
                    handlePartnerTimeout(partnerData.username || 'Your chat partner');
                }, 5 * 60 * 1000); // 5 minutes in milliseconds
            }
        } else {
            // Partner came back online - cancel timeout
            if (offlineSince !== null) {
                const minutesWasOffline = (Date.now() - offlineSince) / (1000 * 60);
                console.log(`✅ Partner came back online after ${minutesWasOffline.toFixed(1)} minutes`);
                offlineSince = null;
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    console.log('🔄 Timeout cancelled - partner reconnected');
                }
            }
        }
    });

    return () => {
        console.log('🔌 Cleaning up partner activity monitor');
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        unsubscribe();
    };
}, [currentChat, currentUser]);

// Handle partner timeout (auto-close chat)
const handlePartnerTimeout = async (partnerName: string) => {
    if (!currentUser || !currentChat) return;

    console.log('🚪 Auto-closing chat due to partner timeout');

    try {
        // Show notification to user
        alert(`${partnerName} has been offline for more than 5 minutes. The chat has been closed automatically.`);

        // Clear currentChatId for current user
        await updateDoc(doc(db, 'users', currentUser.uid), { currentChatId: null });

        // Clear chat state
        setCurrentChat(null);

        // Note: Chat document remains for potential admin cleanup
    } catch (error) {
        console.error('❌ Error handling partner timeout:', error);
    }
};
```

## User Experience Flow

### Scenario 1: Partner Goes Offline Mid-Chat

1. **T=0**: User A and User B are chatting
2. **T=0**: User B closes browser/switches tab → `isOnline` changes to `false`
3. **T=0**: Timer starts immediately (5-minute countdown)
4. **T=0-5min**: User A sees chat, partner shows as offline, timer running in background
5. **T=5min**: Timer expires, auto-close triggered
6. **T=5min**: User A sees alert: "User B has been offline for more than 5 minutes. The chat has been closed automatically."
7. **T=5min**: User A returned to matching screen

### Scenario 2: Partner Reconnects Before Timeout

1. **T=0**: User A and User B chatting
2. **T=1min**: User B goes offline → Timer starts
3. **T=3min**: User B comes back online → Timer cancelled
4. **Result**: Chat continues normally (no timeout)

### Scenario 3: Tab Switch Behavior

1. User A chatting with User B
2. User B switches to different browser tab
3. Visibility change handler → User B's `isOnline` = `false`
4. Timer starts immediately (5-minute countdown)
5a. **If User B returns within 5 min**: Timer cancelled, chat continues
5b. **If User B doesn't return**: After 5 min, chat auto-closes for User A

### Scenario 4: Quick Offline/Online Cycles

1. User A and User B chatting
2. User B briefly loses connection (30 seconds)
3. User B reconnects
4. Timer cancelled (< 5 minutes)
5. Chat continues normally

## Benefits

✅ **No Stuck Chats**: Users don't wait indefinitely for offline partners
✅ **Better UX**: Clear notification when chat is closed
✅ **Resource Management**: Frees up chat slots for active users
✅ **Automatic Cleanup**: No manual intervention needed
✅ **Fair Timeout**: 5 minutes is reasonable grace period for temporary disconnections

## Technical Details

### Dependencies

- **Firestore Listeners**: Real-time partner presence monitoring via `onSnapshot`
- **setTimeout**: Single timer set when partner goes offline
- **User Presence System**: Relies on `isOnline` field (updated by heartbeat/visibility changes)

### Performance Impact

- **Minimal**: Only one listener per active chat
- **Efficient**: Uses `setTimeout` instead of `setInterval` (no periodic checks)
- **Cleanup**: Properly removes listeners and clears timeout on unmount or reconnection

### Edge Cases Handled

✅ **Partner reconnects before timeout**: Timer cancelled, chat continues
✅ **Partner data missing**: Safely handles undefined partner data
✅ **Component unmount**: Cleanup function removes listeners and clears timer
✅ **User leaves before timeout**: Monitoring stops when chat ends normally
✅ **Multiple offline events**: Only first offline event starts timer
✅ **Rapid online/offline changes**: Timer resets on each state change

## Configuration

### Adjustable Parameters

**Timeout Duration** (currently 5 minutes):
```typescript
}, 5 * 60 * 1000); // Change this value (in milliseconds)
// Examples:
// 3 minutes: 3 * 60 * 1000
// 10 minutes: 10 * 60 * 1000
```

**Recommended Values**:
- **Minimum timeout**: 2 minutes (allow for quick reconnections)
- **Maximum timeout**: 10 minutes (prevent excessively long waits)
- **Current setting**: 5 minutes (balanced between patience and responsiveness)

## Testing Scenarios

### Test 1: Normal Timeout
1. Start chat between two users
2. Have User B close browser/tab
3. Wait 5 minutes
4. User A should see timeout notification
5. User A returned to matching screen

### Test 2: Quick Reconnection
1. Start chat between two users
2. Have User B close tab
3. User B reopens tab within 2 minutes
4. Chat should continue (no timeout)

### Test 3: Tab Switch
1. User A and User B chatting
2. User B switches to different browser tab
3. User B marked as offline (visibility change)
4. User B returns within 5 minutes
5. Chat continues normally

### Test 4: Network Disconnection
1. Start chat
2. Disconnect User B's internet
3. Wait 5 minutes
4. User A sees timeout notification
5. Reconnect User B's internet
6. User B sees empty chat screen

## Monitoring & Debugging

### Console Logs

The feature includes comprehensive logging:

```
⏰ Setting up partner activity monitor for chat: <chatId>
👤 Partner status changed: online/offline
⏰ Partner went offline at HH:MM:SS
✅ Partner came back online after X.X minutes
🔄 Timeout cancelled - partner reconnected
⏱️ Partner offline for X.X minutes, auto-closing chat...
🚪 Auto-closing chat due to partner timeout
🔌 Cleaning up partner activity monitor
```

### Common Issues

**Issue**: Timeout triggers too early/late
- **Cause**: Client-side timer relies on `isOnline` status updates
- **Solution**: Ensure heartbeat system updates `isOnline` reliably

**Issue**: Timeout doesn't trigger after partner closes browser
- **Cause**: Heartbeat stopped but `isOnline` not updated
- **Solution**: Check visibility change handler and beforeunload event

**Issue**: Timer not cancelled when partner returns
- **Cause**: Listener not detecting `isOnline` change
- **Solution**: Verify Firestore listener is active and receiving updates

**Issue**: Multiple timeout notifications
- **Cause**: Multiple listeners or timer not cleared
- **Solution**: Ensure cleanup function properly clears timeout and unsubscribes

## Future Enhancements

### Potential Improvements

1. **Visual Countdown**: Show "Partner offline - closing in X minutes"
2. **Reconnection Notification**: Alert when partner comes back online
3. **Configurable Timeout**: Allow users to set their own timeout preference
4. **Grace Period Warning**: Warn at 4 minutes, close at 5 minutes
5. **Auto-Rematch Option**: Offer to find new partner automatically
6. **Offline Message Queue**: Allow sending messages that deliver when partner returns

### Advanced Features

- **Smart Timeout**: Shorter timeout during peak hours, longer during off-peak
- **Activity-Based Timeout**: Reset timer when partner was recently active
- **Admin Override**: Allow admins to set global timeout policies
- **Timeout History**: Track timeout events for analytics

## Related Components

- **ChatPage.tsx**: Main implementation
- **User Presence System**: Heartbeat and online status tracking
- **Admin Panel**: Can view chat statistics including timeouts

## Security & Privacy

✅ **No Data Leakage**: Only partner's username shown in notification
✅ **Clean Disconnect**: User's chat state properly cleared
✅ **No Message Loss**: Messages remain in database (if needed for admin review)

## Firestore Impact

### Read Operations
- **1 listener per active chat**: Monitors partner's user document
- **Updates every 30 seconds**: When partner's presence changes

### Write Operations
- **1 write on timeout**: Updates current user's `currentChatId` to null

### Cost Optimization
- Efficient: Only monitors when chat is active
- Minimal: 1 listener + periodic checks (no queries)
- Cleanup: Properly unsubscribes on component unmount

---

**Last Updated**: January 2025  
**Status**: ✅ Implemented - Ready for Testing  
**Feature Type**: Auto-Timeout / Presence Monitoring  
**Impact**: Improves chat UX and prevents stuck sessions
