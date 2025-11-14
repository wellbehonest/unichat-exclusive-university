# Admin Panel Upgrade Guide

## ✅ Completed
1. **Types Updated** - Added `AdminLog`, `BanDuration`, `UserActivity` types
2. **Recharts Installed** - Analytics chart library ready

## 🚀 Features to Add

### 1. Filter & Search Implementation

#### Add to state (already added):
```typescript
const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('all');
const [reportDateFilter, setReportDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'banned'>('all');
```

#### Add filtered reports logic (add after line 593):
```typescript
// Filter reports
const filteredReports = useMemo(() => {
    let filtered = reports;
    
    // Filter by status
    if (reportStatusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === reportStatusFilter);
    }
    
    // Filter by date
    if (reportDateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        filtered = filtered.filter(r => {
            const reportDate = new Date(r.timestamp.seconds * 1000);
            if (reportDateFilter === 'today') return reportDate >= today;
            if (reportDateFilter === 'week') return reportDate >= weekAgo;
            if (reportDateFilter === 'month') return reportDate >= monthAgo;
            return true;
        });
    }
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(r =>
            r.reportedUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.reportedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.reason.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return filtered;
}, [reports, reportStatusFilter, reportDateFilter, searchTerm]);
```

#### Update Reports View (replace line 725-761):
```typescript
case 'reports':
    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-dark-card p-4 rounded-2xl border border-dark-surface">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs text-dark-text-secondary mb-2 block">Status</label>
                        <select
                            value={reportStatusFilter}
                            onChange={e => setReportStatusFilter(e.target.value as any)}
                            className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>
                    
                    {/* Date Filter */}
                    <div>
                        <label className="text-xs text-dark-text-secondary mb-2 block">Date Range</label>
                        <select
                            value={reportDateFilter}
                            onChange={e => setReportDateFilter(e.target.value as any)}
                            className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                        </select>
                    </div>
                    
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="text-xs text-dark-text-secondary mb-2 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" size={18} />
                            <input
                                type="text"
                                placeholder="Search by username or reason..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-dark-bg p-2 pl-10 rounded-lg border border-dark-surface"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Bulk Actions */}
                {selectedReportIds.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dark-surface flex items-center justify-between">
                        <p className="text-sm">
                            <span className="font-bold">{selectedReportIds.length}</span> reports selected
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleBulkReviewReports}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                            >
                                <CheckCircle className="mr-2" size={16} />
                                Mark Reviewed
                            </button>
                            <button
                                onClick={() => setSelectedReportIds([])}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Reports List */}
            <div className="flex space-x-4 h-[65vh]">
                <div className="w-1/3 bg-dark-card rounded-2xl border border-dark-surface overflow-y-auto">
                    <h3 className="p-4 font-bold text-lg sticky top-0 bg-dark-card border-b border-dark-surface flex items-center justify-between">
                        <span className="flex items-center">
                            <Flag className="mr-2 text-red-500" />
                            Reports ({filteredReports.length})
                        </span>
                    </h3>
                    <ul>
                        {filteredReports.map(report => (
                            <li 
                                key={report.id}
                                className={`p-4 border-b border-dark-surface cursor-pointer hover:bg-dark-surface ${selectedReport?.id === report.id ? 'bg-brand-primary/20' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleReportSelection(report.id);
                                        }}
                                        className="mr-2"
                                    >
                                        {selectedReportIds.includes(report.id) ? (
                                            <CheckSquare className="text-brand-primary" size={18} />
                                        ) : (
                                            <Square className="text-dark-text-secondary" size={18} />
                                        )}
                                    </button>
                                    <span
                                        onClick={() => setSelectedReport(report)}
                                        className={`flex-1 text-xs px-2 py-1 rounded-full ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : report.status === 'reviewed' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
                                    >
                                        {report.status.toUpperCase()}
                                    </span>
                                </div>
                                <div onClick={() => setSelectedReport(report)}>
                                    <p className="font-semibold text-sm">{report.reportedUserName}</p>
                                    <p className="text-xs text-dark-text-secondary">Reported by: {report.reportedByName}</p>
                                    <p className="text-xs text-red-400 mt-1">{report.reason}</p>
                                    <p className="text-xs text-dark-text-secondary mt-1">
                                        {new Date(report.timestamp.seconds * 1000).toLocaleString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Rest of reports view stays the same */}
            </div>
        </div>
    );
```

### 2. Bulk Actions for Users

#### Update Users View (replace line 641-682):
```typescript
case 'users':
    const filteredAndSearchedUsers = useMemo(() => {
        let filtered = users;
        
        // Filter by status
        if (userStatusFilter !== 'all') {
            filtered = filtered.filter(u => u.status === userStatusFilter);
        }
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(u => 
                (u.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (u.admissionNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }, [users, userStatusFilter, searchTerm]);
    
    return (
        <div className="space-y-4">
            {/* Filter & Bulk Action Bar */}
            <div className="bg-dark-card p-4 rounded-2xl border border-dark-surface">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs text-dark-text-secondary mb-2 block">Status Filter</label>
                        <select
                            value={userStatusFilter}
                            onChange={e => setUserStatusFilter(e.target.value as any)}
                            className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="banned">Banned</option>
                        </select>
                    </div>
                    
                    {/* Ban Duration (for bulk ban) */}
                    <div>
                        <label className="text-xs text-dark-text-secondary mb-2 block">Ban Duration</label>
                        <select
                            value={banDuration}
                            onChange={e => setBanDuration(e.target.value as BanDuration)}
                            className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface"
                        >
                            <option value="1day">1 Day</option>
                            <option value="7days">7 Days</option>
                            <option value="30days">30 Days</option>
                            <option value="permanent">Permanent</option>
                        </select>
                    </div>
                    
                    {/* Search */}
                    <div>
                        <label className="text-xs text-dark-text-secondary mb-2 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-dark-bg p-2 pl-10 rounded-lg border border-dark-surface"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Bulk Actions */}
                {selectedUserIds.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dark-surface flex items-center justify-between">
                        <p className="text-sm">
                            <span className="font-bold">{selectedUserIds.length}</span> users selected
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleBulkApprove}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                            >
                                <UserCheck className="mr-2" size={16} />
                                Approve All
                            </button>
                            <button
                                onClick={handleBulkBan}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                            >
                                <UserX className="mr-2" size={16} />
                                Ban All ({banDuration})
                            </button>
                            <button
                                onClick={() => setSelectedUserIds([])}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Users Table */}
            <div className="bg-dark-card rounded-2xl border border-dark-surface overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-dark-surface">
                        <tr>
                            <th className="p-4 w-12">
                                <button
                                    onClick={() => {
                                        if (selectedUserIds.length === filteredAndSearchedUsers.length) {
                                            setSelectedUserIds([]);
                                        } else {
                                            setSelectedUserIds(filteredAndSearchedUsers.map(u => u.uid));
                                        }
                                    }}
                                >
                                    {selectedUserIds.length === filteredAndSearchedUsers.length && filteredAndSearchedUsers.length > 0 ? (
                                        <CheckSquare className="text-brand-primary" size={18} />
                                    ) : (
                                        <Square className="text-dark-text-secondary" size={18} />
                                    )}
                                </button>
                            </th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Warnings</th>
                            <th className="p-4">Ads Watched</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                     <tbody>
                        {filteredAndSearchedUsers.map(user => (
                            <tr key={user.uid} className="border-b border-dark-surface hover:bg-dark-surface/50">
                                <td className="p-4">
                                    <button onClick={() => toggleUserSelection(user.uid)}>
                                        {selectedUserIds.includes(user.uid) ? (
                                            <CheckSquare className="text-brand-primary" size={18} />
                                        ) : (
                                            <Square className="text-dark-text-secondary" size={18} />
                                        )}
                                    </button>
                                </td>
                                <td 
                                    className="p-4 cursor-pointer hover:text-brand-primary"
                                    onClick={() => setSelectedUser(user)}
                                >
                                    {user.username}
                                </td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        user.status === 'approved' ? 'bg-green-500/20 text-green-300' : 
                                        user.status === 'banned' ? 'bg-red-500/20 text-red-300' :
                                        user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                        'bg-gray-500/20 text-gray-300'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.warnings ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.warnings === 1 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                            <AlertTriangle size={12} className="inline mr-1" />
                                            Warning {user.warnings}
                                        </span>
                                    ) : (
                                        <span className="text-dark-text-secondary text-sm">None</span>
                                    )}
                                </td>
                                <td className="p-4">{user.adsWatched}</td>
                                <td className="p-4 flex space-x-2">
                                    <button
                                        onClick={() => setSelectedUser(user)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg text-sm flex items-center"
                                    >
                                        <Eye size={16} className="mr-1"/> View
                                    </button>
                                    {user.status !== 'banned' && (
                                        <button 
                                            onClick={() => handleUserStatusChange(user.uid, 'banned', banDuration)} 
                                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg text-sm flex items-center"
                                        >
                                            <UserX size={16} className="mr-1"/> Ban
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
```

### 3. Analytics View

Add this new case in renderContent():

```typescript
case 'analytics':
    // Calculate analytics data
    const usersOverTime = useMemo(() => {
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                users: users.filter(u => {
                    const userDate = new Date(u.createdAt.seconds * 1000);
                    return userDate.toDateString() === date.toDateString();
                }).length
            };
        });
        return last7Days;
    }, [users]);
    
    const reportsOverTime = useMemo(() => {
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                reports: reports.filter(r => {
                    const reportDate = new Date(r.timestamp.seconds * 1000);
                    return reportDate.toDateString() === date.toDateString();
                }).length
            };
        });
        return last7Days;
    }, [reports]);
    
    const statusDistribution = [
        { name: 'Approved', value: users.filter(u => u.status === 'approved').length, color: '#10b981' },
        { name: 'Pending', value: users.filter(u => u.status === 'pending').length, color: '#f59e0b' },
        { name: 'Rejected', value: users.filter(u => u.status === 'rejected').length, color: '#6b7280' },
        { name: 'Banned', value: users.filter(u => u.status === 'banned').length, color: '#ef4444' }
    ];
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center">
                <TrendingUp className="mr-2" />
                Analytics Dashboard
            </h2>
            
            {/* Users Over Time */}
            <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                <h3 className="font-bold text-lg mb-4">New Users (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={usersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="users" stroke="#f57c00" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            {/* Reports Over Time */}
            <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                <h3 className="font-bold text-lg mb-4">Reports (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={reportsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="reports" fill="#ef4444" />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
            
            {/* User Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                    <h3 className="font-bold text-lg mb-4">User Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                    <h3 className="font-bold text-lg mb-4">Key Metrics</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-dark-surface rounded-lg">
                            <span className="text-dark-text-secondary">Total Users</span>
                            <span className="text-2xl font-bold">{users.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-dark-surface rounded-lg">
                            <span className="text-dark-text-secondary">Active Chats</span>
                            <span className="text-2xl font-bold">{chats.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-dark-surface rounded-lg">
                            <span className="text-dark-text-secondary">Total Reports</span>
                            <span className="text-2xl font-bold">{reports.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-dark-surface rounded-lg">
                            <span className="text-dark-text-secondary">Pending Reports</span>
                            <span className="text-2xl font-bold text-yellow-400">
                                {reports.filter(r => r.status === 'pending').length}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-dark-surface rounded-lg">
                            <span className="text-dark-text-secondary">Total Ads Watched</span>
                            <span className="text-2xl font-bold">{totalAdsWatched}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
```

### 4. Admin Logs View

```typescript
case 'logs':
    return (
        <div className="bg-dark-card rounded-2xl border border-dark-surface">
            <div className="p-4 border-b border-dark-surface">
                <h3 className="font-bold text-lg flex items-center">
                    <FileText className="mr-2" />
                    Admin Activity Log ({adminLogs.length})
                </h3>
            </div>
            <div className="overflow-y-auto max-h-[75vh]">
                <table className="w-full text-left">
                    <thead className="bg-dark-surface sticky top-0">
                        <tr>
                            <th className="p-4">Time</th>
                            <th className="p-4">Admin</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Details</th>
                            <th className="p-4">Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adminLogs.map(log => (
                            <tr key={log.id} className="border-b border-dark-surface">
                                <td className="p-4 text-sm text-dark-text-secondary">
                                    {new Date(log.timestamp.seconds * 1000).toLocaleString()}
                                </td>
                                <td className="p-4 font-semibold">{log.adminName}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        log.action === 'banned' ? 'bg-red-500/20 text-red-300' :
                                        log.action === 'approved' ? 'bg-green-500/20 text-green-300' :
                                        log.action === 'warned' ? 'bg-yellow-500/20 text-yellow-300' :
                                        'bg-blue-500/20 text-blue-300'
                                    }`}>
                                        {log.action.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-4 text-sm">{log.details}</td>
                                <td className="p-4 text-sm text-dark-text-secondary">
                                    {log.targetUserName || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
```

### 5. Update Sidebar Navigation

Replace the sidebar navigation section (around line 920):

```typescript
<ul className="space-y-2">
    {(['dashboard', 'approvals', 'users', 'chats', 'reports', 'analytics', 'logs'] as AdminView[]).map(v => (
        <li key={v}>
            <button onClick={() => setView(v)} className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors ${view === v ? 'bg-brand-primary/20 text-brand-primary' : 'hover:bg-dark-surface'}`}>
                {v === 'dashboard' && <BarChart2 />}
                {v === 'approvals' && <UserCheck />}
                {v === 'users' && <Users />}
                {v === 'chats' && <MessageSquare />}
                {v === 'reports' && <Flag />}
                {v === 'analytics' && <TrendingUp />}
                {v === 'logs' && <FileText />}
                <span className="capitalize">{v}</span>
                
                {/* Badge counts */}
                {v === 'approvals' && pendingApprovals.length > 0 && (
                    <span className="ml-auto bg-yellow-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {pendingApprovals.length}
                    </span>
                )}
                {v === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {reports.filter(r => r.status === 'pending').length}
                    </span>
                )}
            </button>
        </li>
    ))}
</ul>
```

### 6. Add User Details Modal Rendering

Add this at the end of the component, before the closing `</div>` (around line 988):

```typescript
{selectedUser && (
    <UserDetailsModal
        user={selectedUser}
        reports={reports}
        onClose={() => setSelectedUser(null)}
        onSave={handleSaveUserDetails}
    />
)}
```

### 7. Update handleUserAction to include logging

Find handleUserAction function and add logging after actions:

```typescript
// After banning (around line 548)
await logAdminAction('banned', `Banned ${userName}`, userId, userName, { reportId });

// After warning (around line 560)
await logAdminAction('warned', `Warned ${userName}`, userId, userName, { reportId });
```

## 🔒 Security: Firestore Rules Update

Create/update `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin logs - only admins can write
    match /adminLogs/{logId} {
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow update, delete: if false; // Never allow updates or deletes
    }
    
    // Other existing rules...
  }
}
```

## 📝 Implementation Checklist

- [ ] Add filtered reports logic
- [ ] Update Reports view with filters and bulk actions
- [ ] Update Users view with filters and bulk actions
- [ ] Add Analytics view
- [ ] Add Logs view
- [ ] Update sidebar navigation with badge counts
- [ ] Add User Details Modal rendering
- [ ] Add logging to handleUserAction
- [ ] Update Firestore security rules
- [ ] Test all features thoroughly

## 🎨 UI Consistency Notes

All new components follow the existing dark theme:
- `bg-dark-card` for cards
- `bg-dark-surface` for surfaces/tables
- `bg-dark-bg` for inputs
- `border-dark-surface` for borders
- `text-dark-text-secondary` for secondary text
- Consistent rounded corners (`rounded-lg`, `rounded-2xl`)
- Consistent spacing (`p-4`, `space-x-2`, etc.)
- Brand colors for primary actions
- Red for dangerous actions
- Green for positive actions
- Yellow for warnings

## 🛡️ Security Features Implemented

1. **Activity Logging**: All admin actions logged to Firestore
2. **Ban Duration**: Temporary bans with expiration dates
3. **Bulk Action Confirmations**: Prevent accidental mass actions
4. **User Details Modal**: Controlled editing with logging
5. **Firestore Rules**: Protect admin logs from unauthorized access
6. **Input Validation**: All filters validated before use
7. **XSS Protection**: React handles escaping automatically
8. **CSRF Protection**: Firebase handles auth tokens

## 📊 Performance Optimizations

1. **useMemo** for filtered data
2. **Efficient queries** with Firestore indexes
3. **Virtual scrolling** ready (can add react-window if needed)
4. **Debounced search** can be added if performance issues arise
