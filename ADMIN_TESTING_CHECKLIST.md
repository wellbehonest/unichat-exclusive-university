# Admin Panel Testing Checklist

Complete this checklist to verify all admin features work correctly before deploying to production.

## Pre-Testing Setup

- [ ] Firebase connection working (check console for errors)
- [ ] Admin account has `isAdmin: true` in Firestore users collection
- [ ] Test data available: 5+ users, 3+ reports, 2+ chats
- [ ] Browser console open to monitor errors
- [ ] Network tab open to monitor Firestore requests

## 1. Navigation Tests

### Sidebar Navigation
- [ ] Click "Dashboard" - shows overview metrics
- [ ] Click "Approvals" - shows pending users list
- [ ] Click "Users" - shows all users with filters
- [ ] Click "Chats" - shows all active chats
- [ ] Click "Reports" - shows all reports with filters
- [ ] Click "Analytics" - shows charts and metrics
- [ ] Click "Logs" - shows admin activity log

### Badge Counts
- [ ] Pending approvals badge shows correct count (yellow badge)
- [ ] Pending reports badge shows correct count (red badge)
- [ ] Badges update in real-time when status changes

## 2. User Management Tests

### User Filtering
- [ ] Filter by status: "All" - shows all users
- [ ] Filter by status: "Pending" - shows only pending users
- [ ] Filter by status: "Approved" - shows only approved users
- [ ] Filter by status: "Rejected" - shows only rejected users
- [ ] Filter by status: "Banned" - shows only banned users
- [ ] Search by username - results update in real-time
- [ ] Search by email - results update in real-time
- [ ] Search by admission number - results update in real-time

### Individual User Actions
- [ ] Click username to open User Details Modal
- [ ] View user statistics (reports, warnings)
- [ ] Edit username in modal → Save → Changes reflected
- [ ] Edit email in modal → Save → Changes reflected
- [ ] Edit bio in modal → Save → Changes reflected
- [ ] Close modal without saving → Changes discarded
- [ ] Click "Ban" on user → Confirmation modal appears
- [ ] Confirm ban → User status changes to "banned"
- [ ] Click "View" → User Details Modal opens

### Bulk User Actions
- [ ] Click checkbox next to 3 users → Selection count shows "3 selected"
- [ ] Click "Approve Selected" → Confirmation modal appears
- [ ] Confirm bulk approve → All 3 users approved
- [ ] Select 2 pending users → Click "Ban Selected"
- [ ] Choose "1 day" ban duration → Confirm
- [ ] Check banned users have `bannedUntil` field in Firestore
- [ ] Choose "7 days" ban duration → Confirm → Verify expiration date
- [ ] Choose "30 days" ban duration → Confirm → Verify expiration date
- [ ] Choose "Permanent" ban → Confirm → Verify no expiration date
- [ ] Deselect users by clicking checkboxes again

## 3. Report Management Tests

### Report Filtering
- [ ] Filter by status: "All" - shows all reports
- [ ] Filter by status: "Pending" - shows only pending
- [ ] Filter by status: "Reviewed" - shows only reviewed
- [ ] Filter by status: "Dismissed" - shows only dismissed
- [ ] Filter by date: "Today" - shows today's reports
- [ ] Filter by date: "Last 7 days" - shows week's reports
- [ ] Filter by date: "Last 30 days" - shows month's reports
- [ ] Filter by date: "All time" - shows all reports
- [ ] Search by username - filters correctly
- [ ] Search by reason - filters correctly

### Individual Report Actions
- [ ] Click on report card → Report details expand
- [ ] Click "Warn User" → Confirmation modal appears
- [ ] Confirm warn → User gets warning message
- [ ] Check Firestore: user warnings count increased
- [ ] Click "Ban User" → Confirmation modal appears
- [ ] Confirm ban → User status changes to "banned"
- [ ] Click "Mark as Reviewed" → Report status changes
- [ ] Click "Dismiss" → Report status changes to "dismissed"

### Bulk Report Actions
- [ ] Select 3 pending reports with checkboxes
- [ ] Click "Review Selected" → Confirmation appears
- [ ] Confirm → All 3 reports marked as reviewed
- [ ] Select 2 dismissed reports → Deselect → Verify selection cleared

## 4. Analytics Tests

### Charts Rendering
- [ ] Users Over Time chart loads without errors
- [ ] Chart shows correct data for last 7 days
- [ ] Hover over data points shows tooltips
- [ ] Reports Over Time chart loads correctly
- [ ] User Status Distribution pie chart shows percentages
- [ ] Pie chart colors match status types (green=approved, yellow=pending, red=banned)

### Key Metrics
- [ ] "Total Users" count matches Firestore count
- [ ] "Active Chats" count matches active chats
- [ ] "Total Reports" count matches reports collection
- [ ] "Ads Watched" sum is calculated correctly

### Real-time Updates
- [ ] Add new user in Firestore → Chart updates automatically
- [ ] Create new report → Reports chart updates
- [ ] Approve user → Status distribution updates

## 5. Activity Logs Tests

### Log Creation
- [ ] Approve a user → New log entry appears instantly
- [ ] Ban a user → Log shows "banned" action with username
- [ ] Warn a user → Log shows "warned" action with warning count
- [ ] Review report → Log shows "report_reviewed" action
- [ ] Dismiss report → Log shows "report_dismissed" action
- [ ] Bulk approve 3 users → Log shows bulk action with count
- [ ] Edit user details → Log shows "user_updated" action with changes

### Log Display
- [ ] Logs sorted by most recent first (newest on top)
- [ ] Action column shows color-coded badges:
  - Green: approved, report_reviewed
  - Yellow: warned, user_updated
  - Red: banned, rejected, report_dismissed
  - Blue: bulk actions
- [ ] Admin name displayed correctly
- [ ] Target user name shown (when applicable)
- [ ] Details column shows complete action description
- [ ] Timestamp formatted correctly (e.g., "2 minutes ago")

### Log Persistence
- [ ] Refresh page → Logs persist
- [ ] Check Firestore `adminLogs` collection → Entries match UI
- [ ] Verify logs are immutable (cannot edit in Firestore console)

## 6. User Details Modal Tests

### Modal Opening
- [ ] Click username in Users view → Modal opens
- [ ] Click "View" button → Modal opens
- [ ] Modal shows user avatar, username, email
- [ ] Modal shows admission number, gender

### Profile Editing
- [ ] Edit username → Enter new name → Save → Success message
- [ ] Edit email → Enter new email → Save → Success message
- [ ] Edit admission number → Save → Changes reflected
- [ ] Edit gender dropdown → Save → Changes reflected
- [ ] Edit bio → Enter multi-line text → Save → Changes reflected
- [ ] Edit adsWatched count → Save → Number updates

### Reports Section
- [ ] "Reports by User" section shows reports created by user
- [ ] "Reports Against User" section shows reports targeting user
- [ ] Report cards show reason, status, date
- [ ] Empty state shows "No reports" when none exist

### Statistics
- [ ] "Times Reported" count matches Firestore data
- [ ] "Reports Made" count matches reports collection
- [ ] "Warnings" count matches user warnings field
- [ ] Statistics update after actions (e.g., warning user)

### Modal Closing
- [ ] Click "Cancel" → Modal closes without saving
- [ ] Click "Save Changes" → Modal closes after save
- [ ] Click outside modal (overlay) → Modal closes
- [ ] Press ESC key → Modal closes

## 7. Confirmation Modals Tests

### Warning Confirmation
- [ ] Click "Warn User" → Modal shows warning details
- [ ] Modal displays user name clearly
- [ ] "Warn User" button is NOT dangerous (no red color)
- [ ] Click "Cancel" → Action cancelled, modal closes
- [ ] Click "Warn User" → Action executes, modal closes

### Ban Confirmation
- [ ] Click "Ban User" → Modal shows ban warning
- [ ] Modal text emphasizes consequences (cannot access chat)
- [ ] "Ban User" button is RED (dangerous action)
- [ ] Click "Cancel" → Action cancelled
- [ ] Click "Ban User" → User banned, modal closes

### Bulk Action Confirmation
- [ ] Bulk approve → Modal shows count (e.g., "3 users")
- [ ] Bulk ban → Modal shows count and duration
- [ ] Confirm bulk ban with "1 day" → All users banned until tomorrow
- [ ] Verify `bannedUntil` timestamps in Firestore

## 8. Performance Tests

### Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Users view with 50+ users loads in < 3 seconds
- [ ] Reports view with 30+ reports loads in < 3 seconds
- [ ] Analytics charts render in < 2 seconds
- [ ] Logs view with 100+ logs loads in < 3 seconds

### Real-time Updates
- [ ] Open two browser windows with same admin account
- [ ] Approve user in window 1 → Window 2 updates instantly
- [ ] Create report in window 1 → Window 2 shows new report
- [ ] Verify no console errors during real-time sync

### Memory Usage
- [ ] Open Performance tab in DevTools
- [ ] Monitor memory usage over 5 minutes
- [ ] Memory should stabilize (no memory leaks)
- [ ] CPU usage should be low when idle

## 9. Error Handling Tests

### Network Errors
- [ ] Disconnect internet → Try to approve user → Error message shown
- [ ] Reconnect internet → Retry action → Success
- [ ] Check console for Firestore offline mode messages

### Permission Errors
- [ ] Create non-admin account (`isAdmin: false`)
- [ ] Try to access admin panel → Should be redirected/blocked
- [ ] Check console for permission denied errors

### Invalid Data
- [ ] Edit user email to invalid format → Save → Validation error
- [ ] Edit username to empty string → Save → Validation error
- [ ] Try to ban already banned user → Graceful handling

## 10. Security Tests

### Admin Verification
- [ ] Log in with non-admin account
- [ ] Verify cannot access `/admin` route
- [ ] Verify Firestore rules block non-admin reads of adminLogs

### Activity Logging
- [ ] Every admin action creates a log entry
- [ ] Logs include admin name, timestamp, target user
- [ ] Logs are immutable (check Firestore rules)

### Ban Enforcement
- [ ] Ban a user → Log out that user
- [ ] Try to log in with banned account
- [ ] Verify banned user sees ban message
- [ ] Verify banned user cannot access chat

## 11. UI/UX Tests

### Responsive Design
- [ ] Test on desktop (1920x1080) → All elements visible
- [ ] Test on laptop (1366x768) → Scrolling works
- [ ] Test on tablet (768px) → Mobile layout (if applicable)
- [ ] Test on mobile (375px) → Touch-friendly buttons

### Dark Theme
- [ ] All text readable (sufficient contrast)
- [ ] Cards have visible borders
- [ ] Buttons have hover states
- [ ] Active sidebar item highlighted
- [ ] Modals have dark background with overlay

### Accessibility
- [ ] Tab navigation works through all interactive elements
- [ ] Focus indicators visible on buttons/inputs
- [ ] Screen reader can read all labels
- [ ] Color-coded badges have text labels (not just color)

## 12. Data Integrity Tests

### User Status Transitions
- [ ] Pending → Approved → User can access chat
- [ ] Pending → Rejected → User blocked
- [ ] Approved → Banned → User kicked from chat
- [ ] Banned → Approved → User can access chat again

### Report Lifecycle
- [ ] Create report → Status is "pending"
- [ ] Admin reviews → Status becomes "reviewed"
- [ ] Admin dismisses → Status becomes "dismissed"
- [ ] Check Firestore: status changes persist

### Warning System
- [ ] Give warning 1 → User warnings = 1
- [ ] Give warning 2 → User warnings = 2
- [ ] Give warning 3 → User warnings = 3
- [ ] Warning message updates with count
- [ ] Warning timestamp updates each time

## Known Issues / Bugs to Watch For

- [ ] Charts not loading → Check Recharts installation
- [ ] Modal not closing → Check z-index conflicts
- [ ] Bulk actions selecting wrong users → Verify `selectedUserIds` state
- [ ] Logs not showing → Check Firestore listener in useEffect
- [ ] Ban duration not saving → Verify `bannedUntil` calculation
- [ ] Filters not working → Check useMemo dependencies

## Post-Testing

- [ ] Document all bugs found in separate issue tracker
- [ ] Verify Firestore security rules applied
- [ ] Check Firebase usage quotas (reads, writes, storage)
- [ ] Review console logs for warnings
- [ ] Clear browser cache and test again
- [ ] Test with fresh Firebase data (not test data)

---

**Testing Completed By**: _____________  
**Date**: _____________  
**Total Bugs Found**: _____________  
**Critical Bugs**: _____________  
**Status**: ✅ Ready for Production / ⚠️ Needs Fixes
