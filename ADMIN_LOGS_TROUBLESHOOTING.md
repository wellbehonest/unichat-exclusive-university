# Admin Logs Troubleshooting Guide

## Issue
Admin activity logs not showing in the Logs view.

## Fixes Applied

### 1. **Added Error Handling to Firestore Listeners**
```typescript
const unsubLogs = onSnapshot(logsQuery, 
    snapshot => {
        console.log('📊 Admin logs received:', snapshot.docs.length);
        setAdminLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminLog)));
    },
    error => {
        console.error('❌ Admin logs listener error:', error);
        console.error('Error details:', error.message, error.code);
    }
);
```

**Why:** Silent errors in Firestore listeners could prevent logs from loading.

---

### 2. **Enhanced Logging in logAdminAction Function**
```typescript
const logAdminAction = async (...) => {
    if (!userProfile) {
        console.warn('⚠️ Cannot log admin action: userProfile is null');
        return;
    }
    
    console.log('📝 Logging admin action:', { action, details });
    console.log('📤 Writing to adminLogs collection:', logData);
    
    await addDoc(collection(db, 'adminLogs'), logData);
    
    console.log('✅ Admin action logged successfully');
};
```

**Why:** Helps diagnose if logs are being written to Firestore.

---

### 3. **Added Fallback for Missing Timestamps**
```typescript
{log.timestamp?.seconds 
    ? new Date(log.timestamp.seconds * 1000).toLocaleString()
    : 'Just now'
}
```

**Why:** Firestore's `serverTimestamp()` is null until written, which could crash rendering.

---

### 4. **Added Empty State Message**
```typescript
{adminLogs.length === 0 && (
    <tr>
        <td colSpan={5} className="text-center p-8 text-dark-text-secondary">
            No activity logs yet. Admin actions will appear here.
        </td>
    </tr>
)}
```

**Why:** Helps distinguish between "no logs" and "logs not loading".

---

## How to Debug

### Step 1: Check Browser Console
Open the admin panel and check for:
- ✅ `📊 Admin logs received: X` (shows listener is working)
- ❌ `❌ Admin logs listener error:` (shows permission/security issue)
- ❌ `❌ Users listener error:` (shows broader Firestore issue)

### Step 2: Perform an Action
1. Approve a pending user
2. Ban a user
3. Review a report
4. Edit a user profile

Check console for:
- ✅ `📝 Logging admin action: {...}`
- ✅ `📤 Writing to adminLogs collection: {...}`
- ✅ `✅ Admin action logged successfully`
- ❌ `❌ Error logging admin action:` (shows write permission issue)

### Step 3: Check Firestore Database
Go to Firebase Console → Firestore Database:
1. Look for `adminLogs` collection
2. Check if documents are being created
3. Verify document structure matches:
   ```javascript
   {
       adminId: "user_uid",
       adminName: "username",
       action: "approved" | "banned" | "warned" | etc.,
       targetUserId: "target_uid" (optional),
       targetUserName: "target_name" (optional),
       details: "Approved user John",
       timestamp: serverTimestamp(),
       metadata: {...}
   }
   ```

### Step 4: Check Firestore Security Rules
Ensure admins can read and write to `adminLogs`:
```javascript
match /adminLogs/{logId} {
  // Allow admins to read all logs
  allow read: if isAdmin();
  
  // Allow admins to create logs
  allow create: if isAdmin();
  
  // Prevent editing/deleting logs (immutable)
  allow update, delete: if false;
}
```

---

## Common Issues & Solutions

### Issue 1: "Admin logs listener error: Missing or insufficient permissions"
**Cause:** Firestore security rules blocking access
**Solution:** Update security rules to allow admins to read adminLogs collection

### Issue 2: Logs show "Just now" instead of timestamps
**Cause:** serverTimestamp() not yet resolved
**Solution:** Already fixed with fallback, will update on next snapshot

### Issue 3: Console shows "Cannot log admin action: userProfile is null"
**Cause:** Admin is not fully authenticated or profile not loaded
**Solution:** Wait for profile to load before performing admin actions

### Issue 4: adminLogs collection doesn't exist in Firestore
**Cause:** No actions have been logged yet
**Solution:** Perform any admin action (approve, ban, etc.) to create first log

### Issue 5: Logs view is empty but console shows no errors
**Cause:** Listener working but no logs exist yet
**Solution:** Perform admin actions to create logs, check for "No activity logs yet" message

---

## Testing the Logs

### Quick Test Actions:
1. **Approve a pending user** → Should log "APPROVED" action
2. **Ban a user from report** → Should log "BANNED" action  
3. **Warn a user from report** → Should log "WARNED" action
4. **Edit user profile** → Should log "PROFILE_EDITED" action
5. **Unban a banned user** → Should log "UNBANNED" action
6. **Review a report** → Should log "REPORT_REVIEWED" action
7. **Dismiss a report** → Should log "REPORT_DISMISSED" action
8. **Bulk approve users** → Should log "BULK_ACTION" action

### Expected Console Output:
```
📝 Logging admin action: { action: 'approved', details: 'Approved user John' }
📤 Writing to adminLogs collection: { adminId: '...', adminName: 'Admin', ... }
✅ Admin action logged successfully
📊 Admin logs received: 1
```

### Expected Firestore:
New document in `adminLogs` collection with all required fields.

### Expected UI:
Logs view shows new entry with:
- Timestamp (or "Just now")
- Admin name
- Color-coded action badge
- Details description
- Target user name

---

## Log Action Color Codes

| Action | Color | Badge |
|--------|-------|-------|
| BANNED | Red | 🔴 |
| UNBANNED | Green | 🟢 |
| APPROVED | Green | 🟢 |
| REPORT REVIEWED | Green | 🟢 |
| WARNED | Yellow | 🟡 |
| PROFILE EDITED | Blue | 🔵 |
| REJECTED | Orange | 🟠 |
| REPORT DISMISSED | Gray | ⚪ |
| BULK ACTION | Purple | 🟣 |

---

## Performance Notes

- Logs are ordered by timestamp (DESC) - newest first
- Listener updates in real-time when new logs are added
- No pagination currently (will be slow if > 1000 logs)
- Consider adding pagination if logs exceed 100 entries

---

## Next Steps if Still Not Working

1. **Check Authentication:**
   ```javascript
   console.log('Current user profile:', userProfile);
   console.log('Is admin:', userProfile?.isAdmin);
   ```

2. **Check Firestore Connection:**
   ```javascript
   console.log('Firestore instance:', db);
   ```

3. **Manually Test Firestore Write:**
   In browser console:
   ```javascript
   await addDoc(collection(db, 'adminLogs'), {
       adminId: 'test',
       adminName: 'Test Admin',
       action: 'test',
       details: 'Manual test log',
       timestamp: serverTimestamp(),
       metadata: {}
   });
   ```

4. **Check Network Tab:**
   - Look for Firestore requests to `adminLogs`
   - Check for 403 (permission denied) errors
   - Verify requests are being sent

5. **Check Firestore Indexes:**
   - Navigate to Firebase Console → Firestore → Indexes
   - Look for any required indexes on `adminLogs` collection
   - Create composite index if needed: `timestamp DESC`

---

## Success Indicators

✅ Console shows: `📊 Admin logs received: X` (X > 0)
✅ Logs view displays table with entries
✅ Performing actions creates new log entries immediately
✅ Log entries have proper timestamps and formatting
✅ Color-coded badges show correct action types
✅ No errors in browser console

If all indicators pass, admin logs are working correctly! 🎉
