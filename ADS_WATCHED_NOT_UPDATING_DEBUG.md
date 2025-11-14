# Ads Watched Not Updating - Debug Guide

## Issue
The `adsWatched` count is not updating in the admin panel after users watch ads.

## Debugging Steps

### Step 1: Watch an Ad (As Regular User)

1. **Open browser console** (F12)
2. **Sign in as a regular user** (NOT admin)
3. **Click "Watch Ad"** button
4. **Let the video play completely**
5. **Watch console output**

**Expected Console Output:**
```
🎬 Ad completed - Starting credit grant...
Current adsWatched: 0
Updating to: 1
✅ Credit granted successfully!
✅ Verified in Firestore: 1
```

### Step 2: Check for Errors

**If you see:**
```
❌ Error granting credit: FirebaseError: Missing or insufficient permissions
```

**Solution**: Deploy Firestore rules from `UPDATED_FIRESTORE_RULES.txt`

**If you see:**
```
❌ Error granting credit: [some other error]
```

**Solution**: Copy the full error and check:
1. Network tab for failed requests
2. Firebase Console → Authentication (user is signed in?)
3. Firebase Console → Firestore (document exists?)

**If you don't see ANY console output:**
- Video might not have completed
- `handleAdComplete` is not being called
- Check if `onComplete` callback is working

### Step 3: Verify in Firebase Console

1. **Open Firebase Console**
2. **Go to Firestore Database**
3. **Navigate to**: `users` collection
4. **Find your test user document**
5. **Check if `adsWatched` field exists and incremented**

**What to look for:**
- `adsWatched: 1` (or higher) ✅ Good - Firestore IS updating
- `adsWatched: 0` or missing ❌ Bad - Update failed
- Field exists but number didn't change ❌ Bad - Permission or logic issue

### Step 4: Check Admin Panel (As Admin)

1. **Open browser console** (F12)
2. **Sign in as admin**
3. **Open Admin Panel**
4. **Watch console output**

**Expected Console Output:**
```
👥 Admin panel - Users loaded: 5
👥 Total ads watched: 1
👥 Users with ads: [
  { username: "testuser", adsWatched: 1 }
]
```

**If you see:**
```
👥 Admin panel - Users loaded: 5
👥 Total ads watched: 0
```

**Possible causes:**
1. User data not synced yet (wait a few seconds, should auto-update)
2. Admin panel loaded before user watched ad
3. Firestore listener not working
4. User document doesn't have `adsWatched` field

### Step 5: Check Firestore Rules

**Run this test in browser console (as regular user):**

```javascript
// Test if you can update your own adsWatched
const { doc, updateDoc } = await import('firebase/firestore');
const { db, auth } = await import('./services/firebase');

try {
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    adsWatched: 999
  });
  console.log('✅ Rules allow update!');
} catch (error) {
  console.error('❌ Rules BLOCK update:', error);
}
```

**If blocked**: Firestore rules not deployed correctly.

## Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions"

**Cause**: Firestore rules not allowing the update

**Solution**:
1. Copy content from `UPDATED_FIRESTORE_RULES.txt`
2. Go to Firebase Console → Firestore Database → Rules
3. Paste the rules
4. Click **Publish**
5. Wait 30 seconds for propagation
6. Try again

### Issue 2: Field doesn't exist on new users

**Cause**: Existing users created before `adsWatched` field was added

**Solution - Option 1 (Manual)**:
1. Firebase Console → Firestore Database
2. Go to each user document
3. Click **Add field**
4. Name: `adsWatched`
5. Type: **number**
6. Value: `0`

**Solution - Option 2 (Automated Script)**:

Run this in browser console as admin:

```javascript
const initializeAdsWatched = async () => {
  const { collection, getDocs, writeBatch, doc } = await import('firebase/firestore');
  const { db } = await import('./services/firebase');
  
  console.log('🔧 Initializing adsWatched for all users...');
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  let count = 0;
  
  usersSnapshot.docs.forEach(userDoc => {
    const data = userDoc.data();
    if (data.adsWatched === undefined) {
      batch.update(doc(db, 'users', userDoc.id), { adsWatched: 0 });
      count++;
      console.log(`📝 Adding adsWatched to ${data.username || userDoc.id}`);
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Initialized adsWatched for ${count} users!`);
  } else {
    console.log('✅ All users already have adsWatched field!');
  }
};

initializeAdsWatched();
```

### Issue 3: Admin panel shows 0 but Firestore shows correct value

**Cause**: Admin panel listener not receiving updates OR caching issue

**Solution**:
1. **Hard refresh** admin panel: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Sign out and back in** as admin
3. **Check console** for listener errors
4. **Wait 5 seconds** - listener might be slow

### Issue 4: Number increments but doesn't persist

**Cause**: Update succeeds but gets overwritten

**Solution**:
1. Check if any other code is updating `adsWatched`
2. Check if user profile is being reset somewhere
3. Look for batch writes that might overwrite the field

### Issue 5: Works for admin but not regular users

**Cause**: Firestore rules only allow admin updates

**Fix the rules**:
```javascript
match /users/{userId} {
  // THIS LINE IS CRITICAL:
  allow update: if isSignedIn() && request.auth.uid == userId;
}
```

### Issue 6: Video completes but callback doesn't fire

**Cause**: `onComplete` prop not passing correctly

**Solution**: Check AdVideoPlayer usage in ChatPage:

```typescript
{showAdVideo && (
    <AdVideoPlayer
        videoUrl="/ad-video.mp4"
        onComplete={handleAdComplete}  // ← Make sure this is correct
        onClose={handleCloseAdVideo}
    />
)}
```

## Complete Test Sequence

### Test 1: Fresh User Journey

1. Create new test user
2. Sign in
3. Check Firestore - should have `adsWatched: 0`
4. Watch one ad
5. Console should show: `✅ Credit granted successfully!`
6. Check Firestore - should show `adsWatched: 1`
7. Watch another ad
8. Check Firestore - should show `adsWatched: 2`

### Test 2: Admin Panel Updates

1. Keep admin panel open
2. In another browser/tab, sign in as regular user
3. Watch an ad
4. Admin panel console should log: `👥 Users with ads: [...]`
5. Refresh admin panel if needed
6. Check Analytics → Total Ads Watched
7. Check Users → Ads Watched column

### Test 3: Real-Time Sync

1. Open admin panel (keep console open)
2. Open another tab as regular user
3. Watch ad in user tab
4. **DON'T refresh admin panel**
5. Within 1-2 seconds, admin console should log updated count
6. Admin panel UI should update automatically

## Expected Behavior

### When User Watches Ad:
1. ✅ Video plays to completion
2. ✅ `handleAdComplete` fires
3. ✅ Firestore `updateDoc` succeeds
4. ✅ Console shows: "Credit granted successfully"
5. ✅ Firestore verification shows new count
6. ✅ User can see credit in their UI (if applicable)

### Admin Panel Response:
1. ✅ Firestore listener detects change
2. ✅ Console logs: "Users loaded" with new data
3. ✅ Console logs: "Total ads watched: X"
4. ✅ Console logs: "Users with ads: [...]"
5. ✅ UI updates automatically
6. ✅ Analytics card shows new total
7. ✅ Users table shows new count

## Final Checklist

Before contacting for help, verify:

- [ ] Firestore rules deployed from `UPDATED_FIRESTORE_RULES.txt`
- [ ] User document has `adsWatched` field (at least value `0`)
- [ ] Video plays completely without errors
- [ ] Console shows "Credit granted successfully" after video
- [ ] Firestore Console shows incremented value
- [ ] Admin signed in with `isAdmin: true` in their user document
- [ ] Admin panel console shows "Users loaded" logs
- [ ] Browser console has no red errors
- [ ] Tried hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Waited at least 5 seconds for real-time sync

## Get Diagnostic Info

Run this in browser console and share output:

```javascript
// Diagnostic Script
const getDiagnostics = async () => {
  const { auth } = await import('./services/firebase');
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('./services/firebase');
  
  console.log('=== DIAGNOSTICS ===');
  console.log('Current user:', auth.currentUser?.uid);
  console.log('User email:', auth.currentUser?.email);
  
  if (auth.currentUser) {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();
    console.log('User data:', {
      username: userData?.username,
      isAdmin: userData?.isAdmin,
      adsWatched: userData?.adsWatched,
      status: userData?.status
    });
  }
  
  console.log('=== END DIAGNOSTICS ===');
};

getDiagnostics();
```

---

**Status**: Debug mode enabled
**Next Step**: Watch an ad and check console output
**Expected**: See detailed logs showing exactly what's happening
