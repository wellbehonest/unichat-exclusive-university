# Auto-Delete Reports After 30 Days

## 🎯 Requirement
Reports (and their associated chats) should be automatically deleted after 30 days.

---

## 📋 Solution Options

### **Option 1: Cloud Function (Recommended)**
Automatic deletion runs daily via Firebase Cloud Functions.

### **Option 2: Admin Panel Manual Cleanup**
Admin can manually trigger cleanup of old reports.

### **Option 3: Client-Side Filter** 
Hide old reports in the UI (simplest, but data still exists in Firestore).

---

## ✅ Option 1: Cloud Function (Best Solution)

### **Setup Instructions:**

1. **Install Firebase Functions:**
```bash
npm install -g firebase-tools
firebase init functions
cd functions
npm install
```

2. **Create Cloud Function:**

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Runs daily at 2 AM
export const deleteOldReports = functions.pubsub
  .schedule('0 2 * * *') // Cron: Every day at 2 AM
  .timeZone('America/New_York') // Set your timezone
  .onRun(async (context) => {
    console.log('🧹 Starting cleanup of reports older than 30 days...');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
    
    try {
      // Get reports older than 30 days
      const oldReportsSnapshot = await db.collection('reports')
        .where('timestamp', '<', thirtyDaysAgoTimestamp)
        .get();
      
      console.log(`📊 Found ${oldReportsSnapshot.docs.length} old reports to delete`);
      
      let deletedReports = 0;
      let deletedChats = 0;
      
      // Delete each old report and its associated chat
      for (const reportDoc of oldReportsSnapshot.docs) {
        const reportData = reportDoc.data();
        const chatId = reportData.chatId;
        
        // Delete the chat and its messages
        if (chatId) {
          try {
            // Delete all messages in the chat
            const messagesSnapshot = await db.collection(`chats/${chatId}/messages`).get();
            const messageBatch = db.batch();
            messagesSnapshot.docs.forEach(doc => messageBatch.delete(doc.ref));
            await messageBatch.commit();
            
            // Delete the chat document
            await db.collection('chats').doc(chatId).delete();
            deletedChats++;
            console.log(`✅ Deleted chat ${chatId}`);
          } catch (error) {
            console.error(`❌ Error deleting chat ${chatId}:`, error);
          }
        }
        
        // Delete the report
        await reportDoc.ref.delete();
        deletedReports++;
      }
      
      console.log(`✅ Cleanup complete! Deleted ${deletedReports} reports and ${deletedChats} chats`);
      
      // Log the cleanup action
      await db.collection('adminLogs').add({
        adminId: 'system',
        adminName: 'Auto-Cleanup System',
        action: 'bulk_action',
        details: `Auto-deleted ${deletedReports} reports and ${deletedChats} chats older than 30 days`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          deletedReports,
          deletedChats,
          bulkCount: deletedReports
        }
      });
      
      return null;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  });
```

3. **Deploy Function:**
```bash
cd functions
npm run build
firebase deploy --only functions
```

4. **Verify Deployment:**
- Go to Firebase Console → Functions
- You should see `deleteOldReports` scheduled to run daily at 2 AM

---

## ✅ Option 2: Admin Panel Manual Cleanup Button

Add a button to the Admin Panel that admins can click to clean up old reports.

**Add this function to AdminPage.tsx:**

```typescript
const handleCleanupOldReports = async () => {
    setConfirmAction({
        show: true,
        title: 'Clean Up Old Reports',
        message: 'This will permanently delete all reports (and their chats) older than 30 days. This action cannot be undone.',
        confirmText: 'Delete Old Reports',
        isDangerous: true,
        onConfirm: async () => {
            setConfirmAction(null);
            showAlert('Cleaning up old reports...', 'info', 'Processing');
            
            try {
                // Calculate 30 days ago
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                // Get old reports
                const oldReportsQuery = query(
                    collection(db, 'reports'),
                    where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
                );
                const oldReportsSnapshot = await getDocs(oldReportsQuery);
                
                let deletedCount = 0;
                let chatDeletedCount = 0;
                
                // Delete each old report and its chat
                for (const reportDoc of oldReportsSnapshot.docs) {
                    const reportData = reportDoc.data();
                    const chatId = reportData.chatId;
                    
                    // Delete chat messages
                    if (chatId) {
                        const messagesSnapshot = await getDocs(
                            collection(db, `chats/${chatId}/messages`)
                        );
                        for (const msgDoc of messagesSnapshot.docs) {
                            await deleteDoc(msgDoc.ref);
                        }
                        
                        // Delete chat
                        await deleteDoc(doc(db, 'chats', chatId));
                        chatDeletedCount++;
                    }
                    
                    // Delete report
                    await deleteDoc(reportDoc.ref);
                    deletedCount++;
                }
                
                showAlert(
                    `Successfully deleted ${deletedCount} old reports and ${chatDeletedCount} chats.`,
                    'success',
                    'Cleanup Complete'
                );
                
                await logAdminAction(
                    'bulk_action',
                    `Manually cleaned up ${deletedCount} reports and ${chatDeletedCount} chats older than 30 days`,
                    undefined,
                    undefined,
                    { bulkCount: deletedCount, deletedChats: chatDeletedCount }
                );
            } catch (error) {
                console.error('Error cleaning up old reports:', error);
                showAlert('Failed to clean up old reports. Check console for details.', 'error', 'Cleanup Failed');
            }
        }
    });
};
```

**Add button to Reports view header:**

```typescript
<div className="p-4 border-b border-dark-surface flex items-center justify-between">
    <h3 className="font-bold text-lg flex items-center">
        <AlertTriangle className="mr-2" />
        User Reports ({filteredReports.length})
    </h3>
    <button
        onClick={handleCleanupOldReports}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
    >
        <Trash2 size={16} />
        <span>Cleanup Old Reports (30+ days)</span>
    </button>
</div>
```

---

## ✅ Option 3: Client-Side Filter (Simplest)

Just hide reports older than 30 days in the UI (they still exist in Firestore):

**Update filteredReports in AdminPage.tsx:**

```typescript
const filteredReports = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return reports.filter(report => {
        // Filter out reports older than 30 days
        if (report.timestamp?.toDate() < thirtyDaysAgo) {
            return false;
        }
        
        // Apply other filters...
        const matchesStatus = reportFilter.status === 'all' || report.status === reportFilter.status;
        const matchesSearch = !reportFilter.search || 
            report.reason.toLowerCase().includes(reportFilter.search.toLowerCase()) ||
            report.reportedUserName.toLowerCase().includes(reportFilter.search.toLowerCase());
        
        return matchesStatus && matchesSearch;
    });
}, [reports, reportFilter]);
```

---

## 📊 Comparison

| Feature | Cloud Function | Manual Button | Client Filter |
|---------|---------------|---------------|---------------|
| **Automatic** | ✅ Yes (daily) | ❌ No (manual) | ✅ Yes |
| **Deletes Data** | ✅ Yes | ✅ Yes | ❌ No |
| **Saves Storage** | ✅ Yes | ✅ Yes | ❌ No |
| **Setup Complexity** | 🔴 High | 🟡 Medium | 🟢 Low |
| **Cost** | Free (within limits) | Free | Free |
| **Recommended** | ✅ Best | ⚠️ Backup | ❌ Temporary |

---

## 🎯 Recommended Approach

**Use Cloud Function (Option 1)** for production:
- Runs automatically every day
- No admin action needed
- Saves Firestore storage costs
- Professional solution

**Add Manual Button (Option 2)** as backup:
- For immediate cleanup
- Admin control over timing
- Useful for testing

---

## 🔒 Firestore Security Considerations

If using client-side deletion (Option 2), update security rules to allow admins to delete chats:

```javascript
match /chats/{chatId} {
  allow delete: if isAdmin();
  
  match /messages/{messageId} {
    allow delete: if isAdmin();
  }
}
```

---

## 📝 Admin Log Entries

Both automated and manual cleanup will create admin log entries:

```
🟣 BULK ACTION
Details: Auto-deleted 15 reports and 15 chats older than 30 days
Admin: Auto-Cleanup System
Time: 2025-11-08 2:00 AM
```

---

## ⚠️ Important Notes

1. **Data is Permanently Deleted** - Once deleted, reports and chats cannot be recovered
2. **30-Day Window** - Only reports older than 30 days are affected
3. **Associated Chats** - The reported chat is also deleted to save storage
4. **Admin Logs Preserved** - Cleanup actions are logged for audit trail
5. **Messages Deleted First** - Subcollections are deleted before parent documents

---

## 🚀 Next Steps

Choose your implementation:

### For Cloud Function (Recommended):
1. Install Firebase CLI
2. Initialize Functions
3. Copy the function code
4. Deploy to Firebase
5. Monitor in Firebase Console

### For Manual Button:
1. I can add the cleanup button to your AdminPage.tsx
2. Update Firestore security rules
3. Test with old test data

Which option would you like me to implement?
