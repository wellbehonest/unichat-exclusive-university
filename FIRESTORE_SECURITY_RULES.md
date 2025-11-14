# Firestore Security Rules for UniChat

**IMPORTANT**: Apply these security rules to your Firebase project to protect admin features and user data.

## How to Apply Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy and paste the rules below
5. Click **Publish** to apply changes

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Helper function to check if user is approved
    function isApproved() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved';
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read their own user document
      allow read: if isAuthenticated() && request.auth.uid == userId;
      
      // Admins can read all user documents
      allow read: if isAdmin();
      
      // Users can create their own document during signup
      allow create: if isAuthenticated() && request.auth.uid == userId;
      
      // Users can update their own profile (except admin/status fields)
      allow update: if isAuthenticated() && 
                      request.auth.uid == userId && 
                      !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin', 'status', 'warnings', 'bannedUntil']);
      
      // Admins can update any user (including status, warnings, ban fields)
      allow update: if isAdmin();
      
      // Admins can delete users
      allow delete: if isAdmin();
    }
    
    // Chats collection
    match /chats/{chatId} {
      // Only approved users can read/write chats
      allow read, write: if isApproved();
      
      // Admins can read all chats
      allow read: if isAdmin();
      
      // Admins can delete chats
      allow delete: if isAdmin();
    }
    
    // Reports collection
    match /reports/{reportId} {
      // Users can create reports
      allow create: if isAuthenticated();
      
      // Admins can read all reports
      allow read: if isAdmin();
      
      // Admins can update report status
      allow update: if isAdmin();
      
      // Admins can delete reports
      allow delete: if isAdmin();
    }
    
    // Admin Logs collection (Activity Tracking)
    match /adminLogs/{logId} {
      // Only admins can read logs
      allow read: if isAdmin();
      
      // Only admins can create logs (via logAdminAction function)
      allow create: if isAdmin();
      
      // NEVER allow update or delete on logs (immutable audit trail)
      allow update, delete: if false;
    }
    
    // University Emails collection (for email verification)
    match /universityEmails/{emailId} {
      // Anyone can read to check if email exists
      allow read: if true;
      
      // Only admins can create/update/delete university emails
      allow create, update, delete: if isAdmin();
    }
    
    // OTP collection (for email verification)
    match /otps/{otpId} {
      // Users can read their own OTP
      allow read: if isAuthenticated() && resource.data.email == request.auth.token.email;
      
      // Anyone can create OTP (during signup)
      allow create: if true;
      
      // Auto-delete after verification (or use TTL in Firestore)
      allow delete: if isAuthenticated();
    }
  }
}
```

## Rate Limiting (Recommended Cloud Function)

Add server-side rate limiting for sensitive operations:

```typescript
// Example Cloud Function to rate limit OTP requests
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const sendOTP = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  // Check rate limit: max 5 OTP requests per hour per email
  const recentOTPs = await admin.firestore()
    .collection('otps')
    .where('email', '==', email)
    .where('createdAt', '>', new Date(Date.now() - 60 * 60 * 1000))
    .get();
  
  if (recentOTPs.size >= 5) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Too many OTP requests. Please try again later.'
    );
  }
  
  // Generate and send OTP
  // ... (EmailJS integration here)
});
```

## Security Best Practices

### 1. **Admin Verification**
- Never hardcode admin status in client code
- Always verify admin status server-side using Firestore rules
- Use Cloud Functions for critical admin operations

### 2. **Ban Enforcement**
- Add client-side ban checking on app load
- Redirect banned users immediately
- Show ban expiration date if temporary ban

### 3. **Activity Logging**
- All admin actions automatically logged to `adminLogs` collection
- Logs are immutable (cannot be edited or deleted)
- Include metadata for audit trail (who, what, when, why)

### 4. **Report Abuse Prevention**
- Rate limit report creation (max 10 per user per day)
- Implement spam detection for duplicate reports
- Automatically dismiss obvious spam reports

### 5. **Data Privacy**
- Users can only see their own profile data
- Admins see all data but actions are logged
- Never expose sensitive data (email, admission number) in public chats

## Testing Security Rules

Use Firebase Rules Playground to test:

1. Go to Firebase Console → Firestore → Rules
2. Click "Rules Playground"
3. Test scenarios:
   - Non-admin reading adminLogs (should fail)
   - Admin reading adminLogs (should succeed)
   - User updating their own status (should fail)
   - Admin updating user status (should succeed)
   - Banned user reading chats (should fail)

## Common Security Errors

### Error: "Missing or insufficient permissions"
**Cause**: User doesn't have required permissions for operation
**Fix**: Check if user is authenticated, approved, or admin

### Error: "PERMISSION_DENIED"
**Cause**: Security rules rejecting the request
**Fix**: Verify user status in Firestore matches expected state

### Error: "Cannot update immutable fields"
**Cause**: Non-admin trying to update admin/status/warnings fields
**Fix**: Remove restricted fields from update request

## Monitoring

Enable Firebase Security Rules monitoring:

1. Firebase Console → Firestore → Rules
2. Enable "Rules Analytics" 
3. Monitor denied requests
4. Alert on suspicious patterns (mass denials, unauthorized access attempts)

## Emergency Access Revocation

If admin account compromised:

1. Go to Firebase Console → Authentication
2. Disable compromised admin account
3. Update Firestore document: `users/{adminId}` → set `isAdmin: false`
4. Review `adminLogs` for unauthorized actions
5. Revert any malicious changes
6. Reset admin password and re-enable account

---

**Last Updated**: January 2025  
**Apply these rules immediately to secure your production app!**
