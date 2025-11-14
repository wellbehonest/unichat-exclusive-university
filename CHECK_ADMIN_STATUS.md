# Check Admin Status

## How to verify you have admin access:

1. Open your browser console (F12) on the app
2. Type this command:
```javascript
console.log('Is Admin:', window.userProfile?.isAdmin)
```

3. If it shows `false` or `undefined`, you need to manually set yourself as admin in Firestore:
   - Go to Firebase Console → Firestore Database
   - Find your user document in the `users` collection
   - Find your UID (it's the document ID)
   - Edit the document and set `isAdmin: true`

## Alternative: Set admin via Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "users" collection
4. Find your user document (the document ID is your UID)
5. Click on it to edit
6. Add or update the field: `isAdmin` = `true` (boolean)
7. Save changes
8. Refresh your app

After setting yourself as admin and deploying the new rules, the package creation will work!
