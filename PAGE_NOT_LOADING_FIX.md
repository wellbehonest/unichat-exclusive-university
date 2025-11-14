# 🚨 Page Not Loading - Troubleshooting

## Quick Checks

### 1. Server Status
✅ **Server is running on:** http://localhost:3001/

Check terminal shows:
```
✓ VITE v6.4.1  ready in 246 ms
➜  Local:   http://localhost:3001/
```

### 2. Browser Steps

**Step 1**: Open http://localhost:3001/ in your browser

**Step 2**: Press **F12** to open Developer Tools

**Step 3**: Check the **Console** tab for errors

---

## Common Issues & Solutions

### Issue 1: Blank White Page

**Check Console for:**
```
❌ Firebase: Error (auth/...)
❌ Uncaught ReferenceError
❌ Module not found
```

**Solution A: Clear Cache**
1. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) - Hard refresh
2. Or: Clear browser cache in settings

**Solution B: Check Network Tab**
1. Open Dev Tools (F12)
2. Go to Network tab
3. Refresh page
4. Look for failed requests (red)
5. Check if `main.tsx` or `ChatPage.tsx` failed to load

### Issue 2: Loading Forever (Spinner)

**Possible causes:**
- Firebase authentication issue
- Firestore connection issue
- Infinite loop in code

**Solution:**
1. Check console for errors
2. Look for network requests stuck on "Pending"
3. Check if Firestore rules are blocking requests

### Issue 3: "Failed to fetch" or Network Error

**Solution:**
1. Check if server is actually running: http://localhost:3001/
2. Make sure you're not using http://localhost:3000/
3. Try http://192.168.1.4:3001/ instead

### Issue 4: Firebase Auth Error

**Check console for:**
```
❌ Firebase: Error (auth/configuration-not-found)
❌ Firebase: Error (auth/network-request-failed)
```

**Solution:**
1. Check internet connection
2. Firebase config is correct (already verified ✅)
3. Try signing out and back in

---

## 🔍 Debug Steps

### Step 1: Check Browser Console

Open Dev Tools (F12) → Console tab

**Look for:**
- ❌ Red error messages
- ⚠️ Yellow warnings
- 🔵 Blue info messages

### Step 2: Check Network Tab

Open Dev Tools (F12) → Network tab → Refresh page

**Look for:**
- Failed requests (Status: 404, 500)
- Pending requests (stuck loading)
- CORS errors

### Step 3: Check Application Tab

Open Dev Tools (F12) → Application tab

**Check:**
- Local Storage: Should have Firebase auth data
- Session Storage: Should have user session
- IndexedDB: Firebase cache

---

## 🧪 Test Basic Functionality

### Test 1: Can you see the landing page?

**Expected:** Landing page with "Welcome to UniChat" or similar

**If not:**
- Check if `App.tsx` is loading
- Check console for routing errors

### Test 2: Can you sign in?

**Expected:** Auth page with email/password fields

**If not:**
- Check Firebase Auth is enabled
- Check console for auth errors

### Test 3: Can you access chat page?

**Expected:** After login, see chat dashboard

**If not:**
- Check user profile exists in Firestore
- Check `currentUser` state in console

---

## 🔬 Advanced Debugging

### Check if React is Loading

Open console and type:
```javascript
console.log('React loaded:', typeof React !== 'undefined');
console.log('Location:', window.location.href);
```

### Check if Firebase is Connected

Open console and type:
```javascript
import { db } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Test Firestore connection
getDocs(collection(db, 'users'))
  .then(snap => console.log('✅ Firestore connected, users:', snap.size))
  .catch(err => console.error('❌ Firestore error:', err));
```

### Check Current User

If logged in, check:
```javascript
import { auth } from './services/firebase';
console.log('Current user:', auth.currentUser);
```

---

## 📋 Information Needed

To help debug, please provide:

**1. What URL are you accessing?**
- [ ] http://localhost:3001/
- [ ] http://localhost:3000/
- [ ] Other: ___________

**2. What do you see?**
- [ ] Completely blank white page
- [ ] Loading spinner (stuck)
- [ ] Error message (what does it say?)
- [ ] Page loads but specific feature broken

**3. Browser Console Errors?**
```
[Paste any red error messages here]
```

**4. Network Tab Status?**
- [ ] All requests green (200)
- [ ] Some requests failed (404/500)
- [ ] Requests stuck on "Pending"

**5. Browser & OS?**
- Browser: [Chrome / Firefox / Safari / Edge]
- OS: [Mac / Windows / Linux]
- Version: [Latest / Older]

---

## 🚀 Quick Fix Attempts

### Fix 1: Hard Refresh
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### Fix 2: Clear Browser Data
1. Open browser settings
2. Clear cache and cookies
3. Close and reopen browser
4. Try again

### Fix 3: Restart Dev Server
In terminal:
```bash
# Press Ctrl+C to stop server
# Then restart:
npm run dev
```

### Fix 4: Reinstall Dependencies
```bash
# Stop server (Ctrl+C)
rm -rf node_modules
npm install
npm run dev
```

---

## 🎯 Expected Behavior

When working correctly, you should see:

**1. Initial Load:**
- URL: http://localhost:3001/
- Shows: Landing page or Auth page
- Console: Minimal logs, no errors

**2. After Login:**
- Shows: Chat dashboard
- Console: Firebase auth success messages
- Network: All requests green (200)

**3. Matchmaking:**
- Click "Find Match"
- Console shows: Matchmaking logs
- Modal appears when match found

---

## 📞 Next Steps

**Tell me:**
1. What you see when you open http://localhost:3001/
2. Any error messages in browser console (F12)
3. Screenshot if possible

Then I can provide specific fix!
