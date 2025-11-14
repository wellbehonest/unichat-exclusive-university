# 🚀 Deploy Firestore Rules - Quick Guide

## 📋 Your Current Rules (Copy this entire block)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      
      // Allow user to update their own profile
      // Coins can be increased (for purchases) or decreased (for spending)
      allow update: if isSignedIn() && request.auth.uid == userId;
      
      // Allow matchmaking updates from other users
      // Includes: currentChatId, adsWatched, coins, lifetimeCoinsSpent
      allow update: if isSignedIn() && 
                       request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['currentChatId', 'adsWatched', 'coins', 'lifetimeCoinsSpent']);
      
      // Allow admin to update any field (including adding coins)
      allow update: if isAdmin();
      
      allow delete: if isAdmin();
    }
    
    match /reports/{reportId} {
      allow create: if isSignedIn();
      allow read, update, delete: if isAdmin();
    }
    
    match /chats/{chatId} {
      allow create: if isSignedIn();
      allow read, write: if isSignedIn() && 
                           request.auth.uid in resource.data.participants;
      allow read: if isAdmin();
      allow delete: if isAdmin();  // Allow admins to delete old chats
      
      match /messages/{messageId} {
        allow read, write: if isSignedIn();
        allow delete: if isAdmin();  // Allow admins to delete old messages
      }
    }
    
    match /matchmakingQueue/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
      allow delete: if isSignedIn();
    }
    
    // Admin Logs
    match /adminLogs/{logId} {
      // Only admins can read logs
      allow read: if isAdmin();
      
      // Only admins can create logs
      allow create: if isAdmin();
      
      // Logs are immutable - cannot be updated or deleted
      allow update, delete: if false;
    }
    
    // Coin Transactions - Immutable Audit Trail
    match /coinTransactions/{transactionId} {
      // Anyone can read their own transactions
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // Only system (via Cloud Functions) can create transactions
      // In client-side mode, we allow creation but verify userId matches
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      
      // Admins can read all transactions
      allow read: if isAdmin();
      
      // Transactions are immutable - cannot be updated or deleted
      allow update, delete: if false;
    }
    
    // Coin Packages - Admin Managed
    match /coinPackages/{packageId} {
      // Anyone can read packages
      allow read: if isSignedIn();
      
      // Only admins can create, update, or delete packages
      allow create, update, delete: if isAdmin();
    }
    
    // Coin Escrows - Payment Commitment System
    match /coinEscrows/{escrowId} {
      // Anyone can read all escrows (needed for matchmaking)
      allow read: if isSignedIn();
      
      // Users can create their own escrows
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own escrows (mark as consumed/refunded)
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // Match creator can mark partner's escrow as consumed
      allow update: if isSignedIn() && 
                       request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['status', 'chatId', 'consumedAt']);
      
      // Users can delete their own expired escrows
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // Admins can manage all escrows
      allow update, delete: if isAdmin();
    }
  }
}
```

---

## 🌐 Method 1: Firebase Console (EASIEST)

### Step 1: Open Firebase Console
Go to: https://console.firebase.google.com/

### Step 2: Select Your Project
Click on your project name

### Step 3: Navigate to Firestore Rules
1. Click **"Firestore Database"** in left sidebar
2. Click **"Rules"** tab at the top

### Step 4: Replace Rules
1. **Select all** existing rules (Cmd+A / Ctrl+A)
2. **Delete** them
3. **Copy** the entire rules block above
4. **Paste** into the editor

### Step 5: Publish
1. Click **"Publish"** button at the top right
2. Wait for confirmation ✅

---

## 🖥️ Method 2: Firebase CLI (If you have firebase.json)

If you want to use Firebase CLI, you need to initialize first:

### Step 1: Initialize Firebase (One-time setup)
```bash
cd /Users/adarshverma/Downloads/unichat---exclusive-university-chat
firebase init
```

### Step 2: Select Options
- Choose: **Firestore** (use spacebar to select)
- Use existing project: Select your project
- Firestore rules file: `firestore.rules` (press Enter)
- Firestore indexes file: `firestore.indexes.json` (press Enter)

### Step 3: Deploy Rules
```bash
firebase deploy --only firestore:rules
```

---

## 📱 Method 3: Copy from File

If you prefer, just open the `firestore.rules` file and copy its contents:

### On Mac:
```bash
cat firestore.rules | pbcopy
```

Then paste into Firebase Console Rules editor.

---

## ✅ Verify Deployment

After deploying, test in browser console:

```javascript
// Test escrow creation
const escrowRef = await addDoc(collection(db, 'coinEscrows'), {
  userId: currentUser.uid,
  coinsCommitted: 1,
  status: 'pending',
  genderFilter: 'female',
  createdAt: serverTimestamp(),
  expiresAt: Timestamp.fromMillis(Date.now() + 60000)
});
console.log('Escrow created:', escrowRef.id); // Should work!
```

---

## 🐛 If You Get Permission Errors

1. **Check you're signed in**: `firebase.auth().currentUser`
2. **Hard refresh browser**: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
3. **Clear cache**: Browser settings → Clear cache
4. **Check rules deployed**: Firebase Console → Firestore → Rules tab

---

## 📝 What Changed in Rules?

### ✨ NEW: `coinEscrows` Collection (Lines 97-120)
Added complete escrow system rules:
- Users can create their own escrows
- Users can update their own escrows
- Match creator can mark partner's escrow as consumed
- Users can delete their own expired escrows
- Admins can manage all escrows

This enables the **fair payment system** where coins are only deducted on successful match!

---

## 🎯 Quick Checklist

- [ ] Open Firebase Console
- [ ] Navigate to Firestore → Rules
- [ ] Copy rules from above (or from `firestore.rules` file)
- [ ] Paste into editor
- [ ] Click "Publish"
- [ ] Test escrow creation in app
- [ ] Verify no permission errors

---

**That's it! Your escrow matchmaking system will be live!** 🎉
