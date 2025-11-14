import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, orderBy, serverTimestamp, addDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile, Chat, Message, ChatParticipantInfo, Report, AdminLog, BanDuration, CoinPackage } from '../types';
import { signOut } from 'firebase/auth';
import { Shield, Users, MessageSquare, BarChart2, UserCheck, UserX, Clock, Search, LogOut, Eye, Flag, AlertTriangle, CheckCircle, XCircle, User, Filter, Calendar, Download, Edit, FileText, TrendingUp, CheckSquare, Square, AlertCircle, Play, Ban, Coins, DollarSign, TrendingDown, Package, Plus, Save, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type AdminView = 'dashboard' | 'approvals' | 'users' | 'chats' | 'reports' | 'analytics' | 'logs' | 'revenue' | 'packages';

// --- Confirmation Modal ---
const ConfirmationModal: React.FC<{ 
    title: string; 
    message: string; 
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void; 
    onCancel: () => void;
    isDangerous?: boolean;
}> = ({ title, message, confirmText, cancelText = 'Cancel', onConfirm, onCancel, isDangerous = false }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-dark-surface">
                <div className="p-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className={`w-16 h-16 ${isDangerous ? 'bg-red-500/20' : 'bg-yellow-500/20'} rounded-full flex items-center justify-center`}>
                            <AlertTriangle className={isDangerous ? 'text-red-500' : 'text-yellow-500'} size={32} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-white mb-4">{title}</h2>
                    <p className="text-dark-text-secondary text-center leading-relaxed mb-6">{message}</p>
                    <div className="flex space-x-3">
                        <button 
                            onClick={onCancel}
                            className="flex-1 bg-dark-surface hover:bg-dark-bg text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={onConfirm}
                            className={`flex-1 ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-bold py-3 px-4 rounded-lg transition-colors`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Alert Modal Component ---
const AlertModal: React.FC<{ 
  message: string; 
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
}> = ({ message, onClose, type = 'info', title }) => {
  const colorMap = {
    success: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', bgIcon: 'rgba(16, 185, 129, 0.2)', text: '#10b981', button: '#059669', buttonHover: '#047857' },
    error: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', bgIcon: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', button: '#dc2626', buttonHover: '#b91c1c' },
    warning: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', bgIcon: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', button: '#d97706', buttonHover: '#b45309' },
    info: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', bgIcon: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', button: '#2563eb', buttonHover: '#1d4ed8' }
  };

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: BarChart2
  };

  const titleMap = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];
  const displayTitle = title || titleMap[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2" style={{ borderColor: colors.border }}>
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bgIcon }}>
              <Icon size={32} style={{ color: colors.text }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-4">{displayTitle}</h2>
          <div className="p-4 rounded-lg mb-6 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <p className="text-white text-center leading-relaxed whitespace-pre-line">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-full text-white font-bold py-3 px-4 rounded-lg transition-colors"
            style={{ backgroundColor: colors.button }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.button}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// --- User Details Modal ---
const UserDetailsModal: React.FC<{
    user: UserProfile;
    reports: Report[];
    onClose: () => void;
    onSave: (userId: string, updates: Partial<UserProfile>) => void;
}> = ({ user, reports, onClose, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState(user);
    
    const userReports = reports.filter(r => r.reportedUser === user.uid || r.reportedBy === user.uid);
    const reportedCount = reports.filter(r => r.reportedUser === user.uid).length;
    const reporterCount = reports.filter(r => r.reportedBy === user.uid).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full border-2 border-dark-surface my-8">
                <div className="p-6 border-b border-dark-surface flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <User className="mr-2" />
                        User Details
                    </h2>
                    <button onClick={onClose} className="text-dark-text-secondary hover:text-white">
                        <XCircle size={24} />
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Profile Section */}
                    <div className="bg-dark-surface p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Profile Information</h3>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="bg-brand-primary hover:bg-brand-secondary text-white px-3 py-1 rounded-lg text-sm flex items-center"
                            >
                                <Edit size={14} className="mr-1" />
                                {isEditing ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-dark-text-secondary">Username</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedUser.username}
                                        onChange={e => setEditedUser({...editedUser, username: e.target.value})}
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-semibold">{user.username}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-dark-text-secondary">Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={editedUser.email}
                                        onChange={e => setEditedUser({...editedUser, email: e.target.value})}
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-semibold">{user.email}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-dark-text-secondary">Admission Number</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedUser.admissionNumber}
                                        onChange={e => setEditedUser({...editedUser, admissionNumber: e.target.value})}
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface mt-1"
                                    />
                                ) : (
                                    <p className="text-white font-semibold">{user.admissionNumber}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-dark-text-secondary">Gender</label>
                                {isEditing ? (
                                    <select
                                        value={editedUser.gender}
                                        onChange={e => setEditedUser({...editedUser, gender: e.target.value as 'male' | 'female' | 'other'})}
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface mt-1"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                ) : (
                                    <p className="text-white font-semibold capitalize">{user.gender}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-dark-text-secondary">Status</label>
                                <p className={`font-semibold ${user.status === 'approved' ? 'text-green-400' : user.status === 'banned' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {user.status.toUpperCase()}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-dark-text-secondary">Ads Watched (Read-only)</label>
                                <p className="text-white font-semibold">{user.adsWatched}</p>
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <label className="text-xs text-dark-text-secondary">Bio</label>
                            {isEditing ? (
                                <textarea
                                    value={editedUser.bio || ''}
                                    onChange={e => setEditedUser({...editedUser, bio: e.target.value})}
                                    className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface mt-1"
                                    rows={3}
                                />
                            ) : (
                                <p className="text-white">{user.bio || 'No bio'}</p>
                            )}
                        </div>
                        
                        {isEditing && (
                            <button
                                onClick={() => {
                                    onSave(user.uid, editedUser);
                                    setIsEditing(false);
                                }}
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                            >
                                Save Changes
                            </button>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {user.status === 'banned' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-yellow-400 font-semibold flex items-center">
                                        <AlertCircle className="mr-2" size={18} />
                                        User is Currently Banned
                                    </p>
                                    {user.bannedUntil && (
                                        <p className="text-sm text-dark-text-secondary mt-1">
                                            Ban expires: {new Date(user.bannedUntil.seconds * 1000).toLocaleString()}
                                        </p>
                                    )}
                                    {!user.bannedUntil && (
                                        <p className="text-sm text-dark-text-secondary mt-1">
                                            Permanent ban (no expiration)
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => onSave(user.uid, { 
                                        status: 'approved', 
                                        bannedUntil: null,
                                        warningMessage: null 
                                    })}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
                                >
                                    <CheckCircle className="mr-2" size={18} />
                                    Unban User
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats Section */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                            <p className="text-xs text-red-400">Reported</p>
                            <p className="text-2xl font-bold text-white">{reportedCount}</p>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                            <p className="text-xs text-yellow-400">Reports Filed</p>
                            <p className="text-2xl font-bold text-white">{reporterCount}</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg">
                            <p className="text-xs text-orange-400">Warnings</p>
                            <p className="text-2xl font-bold text-white">{user.warnings || 0}</p>
                        </div>
                    </div>

                    {/* Reports Involving User */}
                    <div className="bg-dark-surface p-4 rounded-lg">
                        <h3 className="font-bold text-lg mb-3 flex items-center">
                            <Flag className="mr-2 text-red-500" />
                            Reports Involving This User ({userReports.length})
                        </h3>
                        {userReports.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {userReports.map(report => (
                                    <div key={report.id} className="bg-dark-bg p-3 rounded-lg border border-dark-surface">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm">
                                                    {report.reportedUser === user.uid ? (
                                                        <span className="text-red-400 font-semibold">Reported by {report.reportedByName}</span>
                                                    ) : (
                                                        <span className="text-yellow-400 font-semibold">Filed against {report.reportedUserName}</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-dark-text-secondary">
                                                    {new Date(report.timestamp.seconds * 1000).toLocaleString()}
                                                </p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                                                report.status === 'reviewed' ? 'bg-green-500/20 text-green-400' : 
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-red-400">{report.reason}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-dark-text-secondary text-center py-4">No reports found</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Dashboard Stats Card ---
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface flex items-center space-x-4">
        <div className="bg-brand-primary/20 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-dark-text-secondary text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);


// --- Main Admin Component ---
const AdminPage: React.FC = () => {
    const { userProfile, loading } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<AdminView>('dashboard');
    
    console.log('AdminPage render:', { 
        userProfile, 
        isAdmin: userProfile?.isAdmin, 
        loading,
        username: userProfile?.username,
        status: userProfile?.status 
    });
    
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
    const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingPackage, setIsEditingPackage] = useState(false);
    const [newPackage, setNewPackage] = useState<Partial<CoinPackage>>({
        coins: 0,
        price: 0,
        bonus: 0,
        label: '',
        enabled: true,
        popular: false
    });
    
    // Alert modal state
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        title?: string;
    }>({ message: '', type: 'info' });
    
    // Helper function to show alert modal
    const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
        setAlertConfig({ message, type, title });
        setShowAlertModal(true);
    };
    
    // Bulk action states
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
    
    // Filter states
    const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('all');
    const [reportDateFilter, setReportDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'banned'>('all');
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'7days' | '30days' | '90days' | 'alltime'>('7days');
    const [analyticsMetricFilter, setAnalyticsMetricFilter] = useState<'all' | 'users' | 'reports' | 'chats'>('all');
    
    // Ban duration state
    const [banDuration, setBanDuration] = useState<BanDuration>('permanent');
    
    const [confirmAction, setConfirmAction] = useState<{
        show: boolean;
        title: string;
        message: string;
        confirmText: string;
        isDangerous: boolean;
        onConfirm: () => void;
    } | null>(null);

    // Activity logging function
    const logAdminAction = async (
        action: AdminLog['action'],
        details: string,
        targetUserId?: string,
        targetUserName?: string,
        metadata?: AdminLog['metadata']
    ) => {
        if (!userProfile) {
            console.warn('⚠️ Cannot log admin action: userProfile is null');
            return;
        }
        
        console.log('📝 Logging admin action:', { action, details, targetUserId, targetUserName });
        
        try {
            const logData = {
                adminId: userProfile.uid,
                adminName: userProfile.username,
                action,
                targetUserId,
                targetUserName,
                details,
                timestamp: serverTimestamp(),
                metadata: metadata || {}
            };
            
            console.log('📤 Writing to adminLogs collection:', logData);
            
            await addDoc(collection(db, 'adminLogs'), logData);
            
            console.log('✅ Admin action logged successfully');
        } catch (error) {
            console.error('❌ Error logging admin action:', error);
            console.error('Error details:', error);
        }
    };

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const chatsQuery = query(collection(db, 'chats'));
        const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
        const logsQuery = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'));
        
        const unsubUsers = onSnapshot(usersQuery, 
            snapshot => {
                const fetchedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                console.log('👥 Admin panel - Users loaded:', fetchedUsers.length);
                const totalAds = fetchedUsers.reduce((acc, u) => acc + (u.adsWatched || 0), 0);
                console.log('👥 Total ads watched:', totalAds);
                const usersWithAds = fetchedUsers.filter(u => (u.adsWatched || 0) > 0);
                if (usersWithAds.length > 0) {
                    console.log('👥 Users with ads:', usersWithAds.map(u => ({ 
                        username: u.username, 
                        adsWatched: u.adsWatched 
                    })));
                }
                setUsers(fetchedUsers);
            },
            error => console.error('Users listener error:', error)
        );

        const unsubChats = onSnapshot(chatsQuery, 
            snapshot => {
                setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
            },
            error => console.error('❌ Chats listener error:', error)
        );

        const unsubReports = onSnapshot(reportsQuery, 
            snapshot => {
                setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
            },
            error => console.error('❌ Reports listener error:', error)
        );

        const unsubLogs = onSnapshot(logsQuery, 
            snapshot => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminLog));
                setAdminLogs(logs);
            },
            error => {
                console.error('Admin logs listener error:', error);
            }
        );

        return () => {
            unsubUsers();
            unsubChats();
            unsubReports();
            unsubLogs();
        };
    }, []);

    useEffect(() => {
        if (!selectedChat) {
            setChatMessages([]);
            return;
        }
        const messagesQuery = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('timestamp', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, snapshot => {
            setChatMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
        });

        return () => unsubMessages();
    }, [selectedChat]);

    // Load coin packages
    useEffect(() => {
        const packagesQuery = query(collection(db, 'coinPackages'));
        const unsubPackages = onSnapshot(packagesQuery, snapshot => {
            const packages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoinPackage));
            // Sort by order field, or by createdAt if order doesn't exist
            packages.sort((a, b) => {
                const orderA = a.order ?? 999;
                const orderB = b.order ?? 999;
                return orderA - orderB;
            });
            console.log('📦 Loaded coin packages:', packages);
            setCoinPackages(packages);
        });

        return () => unsubPackages();
    }, []);


    const handleUserStatusChange = async (uid: string, status: 'approved' | 'rejected' | 'banned', duration?: BanDuration) => {
        const user = users.find(u => u.uid === uid);
        if (!user) return;
        
        const updates: Partial<UserProfile> = { status };
        
        if (status === 'banned' && duration) {
            const banExpiresAt = duration === 'permanent' ? null : 
                duration === '1day' ? new Date(Date.now() + 24 * 60 * 60 * 1000) :
                duration === '7days' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) :
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            (updates as any).banExpiresAt = banExpiresAt ? Timestamp.fromDate(banExpiresAt) : null;
            (updates as any).banReason = 'Banned by admin';
            updates.warningMessage = duration === 'permanent' 
                ? 'Your account has been permanently banned.' 
                : `Your account has been banned until ${banExpiresAt?.toLocaleDateString()}.`;
            (updates as any).warningTimestamp = serverTimestamp();
        }
        
        await updateDoc(doc(db, 'users', uid), updates);
        
        await logAdminAction(
            status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'banned',
            `${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Banned'} user ${user.username}`,
            uid,
            user.username,
            status === 'banned' ? { banDuration: duration } : undefined
        );
    };
    
    // Bulk approve users
    const handleBulkApprove = async () => {
        setConfirmAction({
            show: true,
            title: 'Bulk Approve Users',
            message: `Are you sure you want to approve ${selectedUserIds.length} users?`,
            confirmText: 'Approve All',
            isDangerous: false,
            onConfirm: async () => {
                for (const uid of selectedUserIds) {
                    await handleUserStatusChange(uid, 'approved');
                }
                await logAdminAction('bulk_action', `Bulk approved ${selectedUserIds.length} users`, undefined, undefined, { bulkCount: selectedUserIds.length });
                setSelectedUserIds([]);
                setConfirmAction(null);
            }
        });
    };
    
    // Bulk ban users
    const handleBulkBan = async () => {
        setConfirmAction({
            show: true,
            title: 'Bulk Ban Users',
            message: `Are you sure you want to ban ${selectedUserIds.length} users?`,
            confirmText: 'Ban All',
            isDangerous: true,
            onConfirm: async () => {
                for (const uid of selectedUserIds) {
                    await handleUserStatusChange(uid, 'banned', banDuration);
                }
                await logAdminAction('bulk_action', `Bulk banned ${selectedUserIds.length} users`, undefined, undefined, { bulkCount: selectedUserIds.length, banDuration });
                setSelectedUserIds([]);
                setConfirmAction(null);
            }
        });
    };
    
    // Bulk mark reports as reviewed
    const handleBulkReviewReports = async () => {
        setConfirmAction({
            show: true,
            title: 'Bulk Review Reports',
            message: `Mark ${selectedReportIds.length} reports as reviewed?`,
            confirmText: 'Mark Reviewed',
            isDangerous: false,
            onConfirm: async () => {
                for (const reportId of selectedReportIds) {
                    await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
                }
                await logAdminAction('bulk_action', `Bulk reviewed ${selectedReportIds.length} reports`, undefined, undefined, { bulkCount: selectedReportIds.length });
                setSelectedReportIds([]);
                setConfirmAction(null);
            }
        });
    };
    
    // Toggle user selection
    const toggleUserSelection = (uid: string) => {
        setSelectedUserIds(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };
    
    // Toggle report selection
    const toggleReportSelection = (reportId: string) => {
        setSelectedReportIds(prev => 
            prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
        );
    };
    
    // Save user details
    const handleSaveUserDetails = async (userId: string, updates: Partial<UserProfile>) => {
        // Close modal and show success immediately
        setSelectedUser(null);
        showAlert('User details updated successfully!', 'success', 'Update Successful');
        
        // Perform update in background
        try {
            await updateDoc(doc(db, 'users', userId), updates);
            
            // Get the user's current data to determine what changed
            const user = users.find(u => u.uid === userId);
            const userName = updates.username || user?.username || 'Unknown User';
            
            // Determine the action type for logging based on what changed
            if (updates.hasOwnProperty('status') && updates.status === 'approved' && user?.status === 'banned') {
                // User was specifically unbanned (status changed from banned to approved)
                await logAdminAction('unbanned', `Unbanned ${userName}`, userId, userName);
            } else if (updates.hasOwnProperty('status') && updates.status === 'banned') {
                // User was banned
                await logAdminAction('banned', `Banned ${userName}`, userId, userName, { banDuration: updates.bannedUntil ? 'permanent' : undefined });
            } else if (updates.hasOwnProperty('status') && updates.status === 'approved' && user?.status === 'pending') {
                // User was approved from pending
                await logAdminAction('approved', `Approved user ${userName}`, userId, userName);
            } else if (updates.hasOwnProperty('status') && updates.status === 'rejected') {
                // User was rejected
                await logAdminAction('rejected', `Rejected user ${userName}`, userId, userName);
            } else {
                // Regular profile edit (username, bio, avatar, etc.)
                // Compare with original user data to find what actually changed
                const relevantFields = ['username', 'bio', 'avatarUrl', 'email', 'admissionNumber', 'gender', 'warnings', 'warningMessage'];
                const actuallyChangedFields = Object.keys(updates).filter(key => {
                    // Check if it's a relevant field AND the value actually changed
                    if (!relevantFields.includes(key)) return false;
                    // Compare old value with new value
                    const oldValue = user?.[key as keyof UserProfile];
                    const newValue = updates[key as keyof UserProfile];
                    return oldValue !== newValue;
                });
                
                const details = actuallyChangedFields.length > 0 
                    ? `Edited ${actuallyChangedFields.join(', ')} for ${userName}` 
                    : `Updated ${userName}'s profile`;
                await logAdminAction('profile_edited', details, userId, userName, { changes: Object.fromEntries(actuallyChangedFields.map(k => [k, updates[k as keyof UserProfile]])) });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showAlert('Warning: Update may not have been saved. Please refresh and verify.', 'error', 'Background Error');
        }
    };

    const handleEndChat = async (chatId: string) => {
        // This is a simplified version. A robust implementation would use a Cloud Function
        // to delete subcollections and update all users.
        const chatDoc = doc(db, 'chats', chatId);
        const chatSnapshot = await getDocs(query(collection(db, `chats/${chatId}/messages`)));
        chatSnapshot.forEach(async (messageDoc) => {
           // await deleteDoc(messageDoc.ref); // Not deleting messages for simplicity
        });
        // await deleteDoc(chatDoc);
        showAlert("Chat end functionality would delete the chat document. Disabled for this demo.", 'info', 'Demo Mode');

    };

    const handleReportAction = async (reportId: string, status: 'reviewed' | 'dismissed') => {
        // Close modal immediately
        setSelectedReport(null);
        
        // Perform update in background
        try {
            await updateDoc(doc(db, 'reports', reportId), { status });
            
            // Log admin action
            const report = reports.find(r => r.id === reportId);
            await logAdminAction(
                status === 'reviewed' ? 'report_reviewed' : 'report_dismissed',
                `${status === 'reviewed' ? 'Reviewed' : 'Dismissed'} report: ${report?.reason || 'Unknown reason'}`,
                undefined,
                undefined,
                { reportId }
            );
        } catch (error) {
            console.error('Error updating report:', error);
            showAlert('Failed to update report status.', 'error', 'Update Failed');
        }
    };

    // Cleanup old reports (30+ days)
    const handleCleanupOldReports = async () => {
        setConfirmAction({
            show: true,
            title: 'Clean Up Old Reports',
            message: 'This will permanently delete all reports (and their associated chats) older than 30 days. This action cannot be undone. Are you sure?',
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
                    
                    console.log(`🧹 Found ${oldReportsSnapshot.docs.length} reports older than 30 days`);
                    
                    let deletedReports = 0;
                    let deletedChats = 0;
                    
                    // Delete each old report and its chat
                    for (const reportDoc of oldReportsSnapshot.docs) {
                        const reportData = reportDoc.data();
                        const chatId = reportData.chatId;
                        
                        // Delete chat messages first
                        if (chatId) {
                            try {
                                const messagesSnapshot = await getDocs(
                                    collection(db, `chats/${chatId}/messages`)
                                );
                                
                                // Delete all messages
                                for (const msgDoc of messagesSnapshot.docs) {
                                    await deleteDoc(msgDoc.ref);
                                }
                                
                                // Delete the chat document
                                await deleteDoc(doc(db, 'chats', chatId));
                                deletedChats++;
                                console.log(`✅ Deleted chat ${chatId}`);
                            } catch (error) {
                                console.error(`❌ Error deleting chat ${chatId}:`, error);
                            }
                        }
                        
                        // Delete the report
                        await deleteDoc(reportDoc.ref);
                        deletedReports++;
                    }
                    
                    showAlert(
                        `Successfully deleted ${deletedReports} old reports and ${deletedChats} chats.`,
                        'success',
                        'Cleanup Complete'
                    );
                    
                    await logAdminAction(
                        'bulk_action',
                        `Cleaned up ${deletedReports} reports and ${deletedChats} chats older than 30 days`,
                        undefined,
                        undefined,
                        { bulkCount: deletedReports, changes: { deletedChats } }
                    );
                } catch (error) {
                    console.error('❌ Error cleaning up old reports:', error);
                    showAlert('Failed to clean up old reports. Check console for details.', 'error', 'Cleanup Failed');
                }
            }
        });
    };

    const handleUserAction = async (userId: string, action: 'warning' | 'ban', reportId: string, userName: string) => {
        const confirmTitle = action === 'ban' ? 'Ban User' : 'Warn User';
        const confirmMessage = action === 'ban' 
            ? `Are you sure you want to BAN ${userName}? They will not be able to access the chat anymore.`
            : `Are you sure you want to WARN ${userName}? They will see a warning popup immediately on their screen (if they're currently logged in) or as soon as they log in next time.`;
        
        setConfirmAction({
            show: true,
            title: confirmTitle,
            message: confirmMessage,
            confirmText: action === 'ban' ? 'Ban User' : 'Warn User',
            isDangerous: action === 'ban',
            onConfirm: async () => {
                // Close confirmation modal and show success message immediately
                setConfirmAction(null);
                setSelectedReport(null);
                showAlert(`${action === 'ban' ? 'User banned' : 'Warning sent'} successfully!`, 'success', 'Action Complete');
                
                // Then perform the actual operations in background
                try {
                    console.log(`Taking action: ${action} on user ${userId} (${userName})`);
                    const userRef = doc(db, 'users', userId);
                    
                    if (action === 'ban') {
                        // Ban the user
                        console.log('Banning user...');
                        await updateDoc(userRef, { 
                            status: 'banned',
                            currentChatId: null,
                            warningMessage: 'Your account has been banned due to violation of community guidelines.',
                            warningTimestamp: serverTimestamp()
                        });
                        console.log('User banned successfully');
                        
                        // Log admin action
                        await logAdminAction('banned', `Banned ${userName}`, userId, userName, { reportId });
                    } else {
                        // Give warning
                        const user = users.find(u => u.uid === userId);
                        const currentWarnings = (user?.warnings || 0) + 1;
                        
                        console.log(`Giving warning ${currentWarnings} to user...`);
                        await updateDoc(userRef, { 
                            warnings: currentWarnings,
                            warningMessage: `Warning ${currentWarnings}: You have received a warning from the admin. Please follow community guidelines. Multiple warnings may result in a ban.`,
                            warningTimestamp: serverTimestamp()
                        });
                        console.log('Warning sent successfully');
                        
                        // Log admin action
                        await logAdminAction('warned', `Warned ${userName} (warning #${currentWarnings})`, userId, userName, { reportId });
                    }

                    // Mark report as reviewed
                    console.log('Marking report as reviewed...');
                    await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
                    console.log('Report marked as reviewed');
                } catch (error: any) {
                    console.error('Error taking action on user:', error);
                    console.error('Error details:', error.message, error.code);
                    // Show error alert if background operation fails
                    showAlert(`Warning: Action may not have completed. ${error.message || 'Unknown error'}. Check console for details.`, 'error', 'Background Error');
                }
            }
        });
    };

    const pendingApprovals = users.filter(u => u.status === 'pending');
    const totalAdsWatched = useMemo(() => users.reduce((acc, user) => acc + (user.adsWatched || 0), 0), [users]);
    
    // Filter active chats (only show chats where ALL participants are still active)
    const activeChats = useMemo(() => {
        return chats.filter(chat => {
            // Check if ALL participants have this chat as their current chat
            return chat.participants.every(participantId => {
                const user = users.find(u => u.uid === participantId);
                return user && user.currentChatId === chat.id;
            });
        });
    }, [chats, users]);
    
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
        
        // Search filter for reports
        if (searchTerm && view === 'reports') {
            filtered = filtered.filter(r =>
                r.reportedUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.reportedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.reason.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }, [reports, reportStatusFilter, reportDateFilter, searchTerm, view]);
    
    // Filter users
    const filteredUsers = useMemo(() => {
        let filtered = users;
        
        // Filter by status
        if (userStatusFilter !== 'all') {
            filtered = filtered.filter(u => u.status === userStatusFilter);
        }
        
        // Search filter for users
        if (searchTerm && view === 'users') {
            filtered = filtered.filter(u => 
                (u.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (u.admissionNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }, [users, userStatusFilter, searchTerm, view]);

    // Analytics data calculations
    const usersOverTime = useMemo(() => {
        const daysMap = { '7days': 7, '30days': 30, '90days': 90, 'alltime': 365 };
        const numDays = daysMap[analyticsTimeRange];
        
        // For "all time", calculate days since first user
        let actualDays = numDays;
        if (analyticsTimeRange === 'alltime' && users.length > 0) {
            const oldestUser = users.reduce((oldest, user) => {
                const userDate = new Date(user.createdAt.seconds * 1000);
                const oldestDate = new Date(oldest.createdAt.seconds * 1000);
                return userDate < oldestDate ? user : oldest;
            });
            const firstUserDate = new Date(oldestUser.createdAt.seconds * 1000);
            const daysSinceFirst = Math.ceil((Date.now() - firstUserDate.getTime()) / (1000 * 60 * 60 * 24));
            actualDays = Math.max(daysSinceFirst, 1);
        }
        
        const timeRangeData = Array.from({length: actualDays}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (actualDays - 1 - i));
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                users: users.filter(u => {
                    const userDate = new Date(u.createdAt.seconds * 1000);
                    return userDate.toDateString() === date.toDateString();
                }).length
            };
        });
        return timeRangeData;
    }, [users, analyticsTimeRange]);
    
    const reportsOverTime = useMemo(() => {
        const daysMap = { '7days': 7, '30days': 30, '90days': 90, 'alltime': 365 };
        const numDays = daysMap[analyticsTimeRange];
        
        // For "all time", calculate days since first report
        let actualDays = numDays;
        if (analyticsTimeRange === 'alltime' && reports.length > 0) {
            const oldestReport = reports.reduce((oldest, report) => {
                const reportDate = new Date(report.timestamp.seconds * 1000);
                const oldestDate = new Date(oldest.timestamp.seconds * 1000);
                return reportDate < oldestDate ? report : oldest;
            });
            const firstReportDate = new Date(oldestReport.timestamp.seconds * 1000);
            const daysSinceFirst = Math.ceil((Date.now() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24));
            actualDays = Math.max(daysSinceFirst, 1);
        }
        
        const timeRangeData = Array.from({length: actualDays}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (actualDays - 1 - i));
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                reports: reports.filter(r => {
                    const reportDate = new Date(r.timestamp.seconds * 1000);
                    return reportDate.toDateString() === date.toDateString();
                }).length
            };
        });
        return timeRangeData;
    }, [reports, analyticsTimeRange]);
    
    const statusDistribution = useMemo(() => [
        { name: 'Approved', value: users.filter(u => u.status === 'approved').length, color: '#10b981' },
        { name: 'Pending', value: users.filter(u => u.status === 'pending').length, color: '#f59e0b' },
        { name: 'Rejected', value: users.filter(u => u.status === 'rejected').length, color: '#6b7280' },
        { name: 'Banned', value: users.filter(u => u.status === 'banned').length, color: '#ef4444' }
    ], [users]);

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Pending Approvals" value={pendingApprovals.length} icon={<Clock className="text-yellow-400" />} />
                        <StatCard title="Total Users" value={users.length} icon={<Users className="text-blue-400" />} />
                        <StatCard title="Active Chats" value={activeChats.length} icon={<MessageSquare className="text-green-400" />} />
                        <StatCard title="Total Ads Watched" value={totalAdsWatched} icon={<BarChart2 className="text-purple-400" />} />
                    </div>
                );
            case 'approvals':
                return (
                    <div className="bg-dark-card rounded-2xl border border-dark-surface overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-dark-surface">
                                <tr>
                                    <th className="p-4">Username</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Admission No.</th>
                                    <th className="p-4">ID Card</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingApprovals.map(user => (
                                    <tr key={user.uid} className="border-b border-dark-surface">
                                        <td className="p-4">{user.username}</td>
                                        <td className="p-4">{user.email}</td>
                                        <td className="p-4">{user.admissionNumber}</td>
                                        <td className="p-4"><a href={user.idCardUrl} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">View ID</a></td>
                                        <td className="p-4 flex space-x-2">
                                            <button onClick={() => handleUserStatusChange(user.uid, 'approved')} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-sm flex items-center"><UserCheck size={16} className="mr-1"/> Approve</button>
                                            <button onClick={() => handleUserStatusChange(user.uid, 'rejected')} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg text-sm flex items-center"><UserX size={16} className="mr-1"/> Reject</button>
                                        </td>
                                    </tr>
                                ))}
                                 {pendingApprovals.length === 0 && (
                                    <tr><td colSpan={5} className="text-center p-8 text-dark-text-secondary">No pending approvals.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'users':
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
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface text-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="banned">Banned</option>
                                    </select>
                                </div>
                                
                                {/* Ban Duration */}
                                <div>
                                    <label className="text-xs text-dark-text-secondary mb-2 block">Ban Duration</label>
                                    <select
                                        value={banDuration}
                                        onChange={e => setBanDuration(e.target.value as BanDuration)}
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface text-white"
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
                                            className="w-full bg-dark-bg p-2 pl-10 rounded-lg border border-dark-surface text-white"
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
                                                    if (selectedUserIds.length === filteredUsers.length) {
                                                        setSelectedUserIds([]);
                                                    } else {
                                                        setSelectedUserIds(filteredUsers.map(u => u.uid));
                                                    }
                                                }}
                                            >
                                                {selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
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
                                    {filteredUsers.map(user => (
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
                                                {user.status === 'banned' ? (
                                                    <button 
                                                        onClick={async () => {
                                                            await handleSaveUserDetails(user.uid, { 
                                                                status: 'approved', 
                                                                bannedUntil: null,
                                                                warningMessage: null 
                                                            });
                                                        }} 
                                                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg text-sm flex items-center"
                                                    >
                                                        <CheckCircle size={16} className="mr-1"/> Unban
                                                    </button>
                                                ) : (
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
            case 'chats':
                return (
                    <div className="flex space-x-4 h-[75vh]">
                        <div className="w-1/3 bg-dark-card rounded-2xl border border-dark-surface overflow-y-auto">
                            <h3 className="p-4 font-bold text-lg sticky top-0 bg-dark-card border-b border-dark-surface">Active Chats ({activeChats.length})</h3>
                            <ul>
                                {activeChats.length > 0 ? (
                                    activeChats.map(chat => (
                                        <li key={chat.id} onClick={() => setSelectedChat(chat)} className={`p-4 border-b border-dark-surface cursor-pointer hover:bg-dark-surface ${selectedChat?.id === chat.id ? 'bg-brand-primary/20' : ''}`}>
                                            <p className="font-semibold">{Object.values(chat.participantInfo).map(p => (p as ChatParticipantInfo).username).join(' & ')}</p>
                                            <p className="text-xs text-dark-text-secondary">Started: {new Date(chat.createdAt.seconds * 1000).toLocaleString()}</p>
                                        </li>
                                    ))
                                ) : (
                                    <li className="p-8 text-center text-dark-text-secondary">
                                        No active chats at the moment
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="w-2/3 bg-dark-card rounded-2xl border border-dark-surface flex flex-col">
                            {selectedChat ? (
                                <>
                                    <div className="p-4 border-b border-dark-surface flex justify-between items-center">
                                        <h3 className="font-bold">Chat Transcript</h3>
                                        <button onClick={() => handleEndChat(selectedChat.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg text-sm">End Chat</button>
                                    </div>
                                    <div className="flex-1 p-4 overflow-y-auto space-y-2">
                                        {chatMessages.map(msg => (
                                             <div key={msg.id} className="text-sm">
                                                {/* Fix: Cast participant info to the correct type to avoid 'unknown' type error from Firestore data */}
                                                <span className="font-bold text-brand-secondary">{(selectedChat.participantInfo[msg.senderId] as ChatParticipantInfo)?.username || 'User'}: </span>
                                                <span>{msg.content}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-dark-text-secondary">Select a chat to view messages.</div>
                            )}
                        </div>
                    </div>
                );
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
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface text-white"
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
                                        className="w-full bg-dark-bg p-2 rounded-lg border border-dark-surface text-white"
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
                                            className="w-full bg-dark-bg p-2 pl-10 rounded-lg border border-dark-surface text-white"
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
                                    <button
                                        onClick={handleCleanupOldReports}
                                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1"
                                        title="Delete reports older than 30 days"
                                    >
                                        <AlertTriangle size={14} />
                                        <span>Cleanup 30d+</span>
                                    </button>
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
                            <div className="w-2/3 bg-dark-card rounded-2xl border border-dark-surface flex flex-col">
                            {selectedReport ? (
                                <>
                                    <div className="p-4 border-b border-dark-surface">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg flex items-center">
                                                    <AlertTriangle className="mr-2 text-red-500" />
                                                    Report Details
                                                </h3>
                                                <p className="text-sm text-dark-text-secondary mt-1">Report ID: {selectedReport.id}</p>
                                            </div>
                                            {selectedReport.status === 'pending' && (
                                                <div className="flex space-x-2">
                                                    <button 
                                                        onClick={() => handleReportAction(selectedReport.id, 'reviewed')} 
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
                                                    >
                                                        <CheckCircle className="mr-1" size={16} />
                                                        Mark Reviewed
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReportAction(selectedReport.id, 'dismissed')} 
                                                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
                                                    >
                                                        <XCircle className="mr-1" size={16} />
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                                                <p className="text-xs text-red-400 font-semibold mb-2">REPORTED USER</p>
                                                <p className="font-semibold text-lg mb-1">{selectedReport.reportedUserName}</p>
                                                <p className="text-xs text-dark-text-secondary">
                                                    {selectedReport.participantProfiles[selectedReport.reportedUser]?.email}
                                                </p>
                                                <p className="text-xs text-dark-text-secondary mb-3">
                                                    {selectedReport.participantProfiles[selectedReport.reportedUser]?.admissionNumber}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <button 
                                                        onClick={() => handleUserAction(selectedReport.reportedUser, 'warning', selectedReport.id, selectedReport.reportedUserName)}
                                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center"
                                                    >
                                                        <AlertTriangle className="mr-1" size={14} />
                                                        Warn
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUserAction(selectedReport.reportedUser, 'ban', selectedReport.id, selectedReport.reportedUserName)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center"
                                                    >
                                                        <UserX className="mr-1" size={14} />
                                                        Ban
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-dark-surface p-3 rounded-lg border border-dark-surface">
                                                <p className="text-xs text-dark-text-secondary font-semibold mb-2">REPORTER</p>
                                                <p className="font-semibold text-lg mb-1">{selectedReport.reportedByName}</p>
                                                <p className="text-xs text-dark-text-secondary">
                                                    {selectedReport.participantProfiles[selectedReport.reportedBy]?.email}
                                                </p>
                                                <p className="text-xs text-dark-text-secondary mb-3">
                                                    {selectedReport.participantProfiles[selectedReport.reportedBy]?.admissionNumber}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <button 
                                                        onClick={() => handleUserAction(selectedReport.reportedBy, 'warning', selectedReport.id, selectedReport.reportedByName)}
                                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center"
                                                        title="Warn for false report"
                                                    >
                                                        <AlertTriangle className="mr-1" size={14} />
                                                        Warn
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUserAction(selectedReport.reportedBy, 'ban', selectedReport.id, selectedReport.reportedByName)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center"
                                                        title="Ban for false report"
                                                    >
                                                        <UserX className="mr-1" size={14} />
                                                        Ban
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 bg-red-500/10 border border-red-500/30 p-3 rounded-lg">
                                            <p className="text-xs text-dark-text-secondary">Reason</p>
                                            <p className="text-red-400 font-semibold">{selectedReport.reason}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <h4 className="font-bold mb-3 flex items-center">
                                            <MessageSquare className="mr-2" size={18} />
                                            Chat Transcript ({selectedReport.messages.length} messages)
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedReport.messages.map(msg => {
                                                const senderName = selectedReport.participantProfiles[msg.senderId]?.username || 'Unknown';
                                                const isReportedUser = msg.senderId === selectedReport.reportedUser;
                                                return (
                                                    <div key={msg.id} className={`p-3 rounded-lg ${isReportedUser ? 'bg-red-500/10 border border-red-500/30' : 'bg-dark-surface'}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`font-bold text-sm ${isReportedUser ? 'text-red-400' : 'text-brand-secondary'}`}>
                                                                {senderName}
                                                                {isReportedUser && <span className="ml-2 text-xs bg-red-600 px-2 py-0.5 rounded">Reported</span>}
                                                            </span>
                                                            <span className="text-xs text-dark-text-secondary">
                                                                {new Date(msg.timestamp.seconds * 1000).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        {msg.type === 'gif' ? (
                                                            <img src={msg.content} alt="GIF" className="rounded max-h-32 mt-1" />
                                                        ) : (
                                                            <p className="text-sm">{msg.content}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-dark-text-secondary">
                                    Select a report to view details
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center">
                                <TrendingUp className="mr-2" />
                                Analytics Dashboard
                            </h2>
                            
                            {/* Analytics Filters */}
                            <div className="flex items-center space-x-3">
                                {/* Time Range Filter */}
                                <div className="flex items-center space-x-2">
                                    <Filter className="text-dark-text-secondary" size={18} />
                                    <select
                                        value={analyticsTimeRange}
                                        onChange={e => setAnalyticsTimeRange(e.target.value as any)}
                                        className="bg-dark-card border border-dark-surface text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                    >
                                        <option value="7days">Last 7 Days</option>
                                        <option value="30days">Last 30 Days</option>
                                        <option value="90days">Last 90 Days</option>
                                        <option value="alltime">All Time</option>
                                    </select>
                                </div>
                                
                                {/* Metric Filter */}
                                <select
                                    value={analyticsMetricFilter}
                                    onChange={e => setAnalyticsMetricFilter(e.target.value as any)}
                                    className="bg-dark-card border border-dark-surface text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                                >
                                    <option value="all">All Metrics</option>
                                    <option value="users">Users Only</option>
                                    <option value="reports">Reports Only</option>
                                    <option value="chats">Chats Only</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Users Over Time */}
                        {(analyticsMetricFilter === 'all' || analyticsMetricFilter === 'users') && (
                            <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                                <h3 className="font-bold text-lg mb-4">New Users ({analyticsTimeRange === '7days' ? 'Last 7 Days' : analyticsTimeRange === '30days' ? 'Last 30 Days' : analyticsTimeRange === '90days' ? 'Last 90 Days' : 'All Time'})</h3>
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
                        )}
                        
                        {/* Reports Over Time */}
                        {(analyticsMetricFilter === 'all' || analyticsMetricFilter === 'reports') && (
                        <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                            <h3 className="font-bold text-lg mb-4">Reports ({analyticsTimeRange === '7days' ? 'Last 7 Days' : analyticsTimeRange === '30days' ? 'Last 30 Days' : analyticsTimeRange === '90days' ? 'Last 90 Days' : 'All Time'})</h3>
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
                        )}
                        
                        {/* User Status Distribution - Full Width */}
                        {(analyticsMetricFilter === 'all' || analyticsMetricFilter === 'users') && (
                        <div className="bg-dark-card p-6 rounded-2xl border border-dark-surface">
                            <h3 className="font-bold text-lg mb-6 flex items-center">
                                <Users className="mr-2" />
                                User Status Distribution
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Pie Chart */}
                                <div className="flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height={350}>
                                        <PieChart>
                                            <Pie
                                                data={statusDistribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}
                                                outerRadius={120}
                                                innerRadius={60}
                                                fill="#8884d8"
                                                dataKey="value"
                                                paddingAngle={2}
                                            >
                                                {statusDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1a1a1a" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                                labelStyle={{ color: '#fff' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Legend & Stats */}
                                <div className="flex flex-col justify-center space-y-4">
                                    {statusDistribution.map((status, index) => {
                                        const percentage = users.length > 0 ? (status.value / users.length * 100).toFixed(1) : 0;
                                        return (
                                            <div key={index} className="bg-dark-surface rounded-xl p-4 border border-dark-border hover:border-brand-primary/30 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-4 h-4 rounded-full shadow-lg" 
                                                            style={{ backgroundColor: status.color }}
                                                        />
                                                        <span className="font-semibold text-lg">{status.name}</span>
                                                    </div>
                                                    <span className="text-2xl font-bold" style={{ color: status.color }}>
                                                        {status.value}
                                                    </span>
                                                </div>
                                                <div className="ml-7">
                                                    <div className="flex items-center justify-between text-sm text-dark-text-secondary mb-1">
                                                        <span>Percentage</span>
                                                        <span className="font-medium">{percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-dark-card rounded-full h-2 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ 
                                                                width: `${percentage}%`, 
                                                                backgroundColor: status.color 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Total Summary */}
                                    <div className="bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 rounded-xl p-4 border border-brand-primary/30 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-lg">Total Users</span>
                                            <span className="text-3xl font-bold text-brand-secondary">
                                                {users.length}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                        
                        {/* Key Metrics */}
                        {analyticsMetricFilter === 'all' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 rounded-2xl border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <Users className="text-blue-400" size={24} />
                                    <span className="text-3xl font-bold text-blue-400">{users.length}</span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Total Users</h4>
                            </div>
                            
                            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 rounded-2xl border border-green-500/20 hover:border-green-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <MessageSquare className="text-green-400" size={24} />
                                    <span className="text-3xl font-bold text-green-400">{activeChats.length}</span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Active Chats</h4>
                            </div>
                            
                            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-6 rounded-2xl border border-red-500/20 hover:border-red-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <AlertTriangle className="text-red-400" size={24} />
                                    <span className="text-3xl font-bold text-red-400">{reports.length}</span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Total Reports</h4>
                            </div>
                            
                            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-6 rounded-2xl border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <Clock className="text-yellow-400" size={24} />
                                    <span className="text-3xl font-bold text-yellow-400">
                                        {reports.filter(r => r.status === 'pending').length}
                                    </span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Pending Reports</h4>
                            </div>
                        </div>
                        )}
                        
                        {/* Additional Metrics */}
                        {analyticsMetricFilter === 'all' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <Play className="text-purple-400" size={24} />
                                    <span className="text-3xl font-bold text-purple-400">{totalAdsWatched}</span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Total Ads Watched</h4>
                            </div>
                            
                            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-6 rounded-2xl border border-orange-500/20 hover:border-orange-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <CheckCircle className="text-orange-400" size={24} />
                                    <span className="text-3xl font-bold text-orange-400">
                                        {users.filter(u => u.status === 'approved').length}
                                    </span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Approved Users</h4>
                            </div>
                            
                            <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 p-6 rounded-2xl border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <Ban className="text-pink-400" size={24} />
                                    <span className="text-3xl font-bold text-pink-400">
                                        {users.filter(u => u.status === 'banned').length}
                                    </span>
                                </div>
                                <h4 className="text-dark-text-secondary text-sm font-medium">Banned Users</h4>
                            </div>
                        </div>
                        )}
                    </div>
                );
            case 'packages':
                return (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center">
                                <Package className="mr-3" />
                                Coin Packages Management
                            </h2>
                            <button
                                onClick={() => {
                                    setIsEditingPackage(true);
                                    setSelectedPackage(null);
                                    setNewPackage({
                                        coins: 0,
                                        price: 0,
                                        bonus: 0,
                                        label: '',
                                        enabled: true,
                                        popular: false
                                    });
                                }}
                                className="bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                            >
                                <Plus size={18} />
                                <span>Add New Package</span>
                            </button>
                        </div>

                        {/* Packages Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {coinPackages.map(pkg => (
                                <div
                                    key={pkg.id}
                                    className={`bg-dark-card border-2 rounded-2xl p-6 relative ${
                                        pkg.enabled ? 'border-dark-surface' : 'border-red-500/30 opacity-60'
                                    } ${pkg.popular ? 'ring-2 ring-brand-primary' : ''}`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary px-3 py-1 rounded-full text-xs font-bold">
                                            POPULAR
                                        </div>
                                    )}
                                    {!pkg.enabled && (
                                        <div className="absolute -top-3 right-4 bg-red-600 px-3 py-1 rounded-full text-xs font-bold">
                                            DISABLED
                                        </div>
                                    )}
                                    
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-gray-400 mb-1">{pkg.label}</p>
                                        <div className="flex items-center justify-center space-x-2 mb-2">
                                            <Coins className="text-yellow-400" size={32} />
                                            <span className="text-4xl font-bold">{pkg.coins + pkg.bonus}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {pkg.coins} coins {pkg.bonus > 0 && `+ ${pkg.bonus} bonus`}
                                        </p>
                                    </div>

                                    <div className="text-center mb-4">
                                        <p className="text-3xl font-bold text-green-400">₹{pkg.price}</p>
                                        {pkg.bonus > 0 && (
                                            <p className="text-xs text-green-300 mt-1">
                                                {Math.round((pkg.bonus / pkg.coins) * 100)}% bonus
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                setSelectedPackage(pkg);
                                                setNewPackage(pkg);
                                                setIsEditingPackage(true);
                                            }}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center space-x-1"
                                        >
                                            <Edit size={16} />
                                            <span className="text-sm">Edit</span>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await updateDoc(doc(db, 'coinPackages', pkg.id), {
                                                    enabled: !pkg.enabled,
                                                    updatedAt: serverTimestamp()
                                                });
                                                showAlert(`Package ${!pkg.enabled ? 'enabled' : 'disabled'} successfully`, 'success');
                                            }}
                                            className={`flex-1 ${pkg.enabled ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white py-2 rounded-lg flex items-center justify-center space-x-1`}
                                        >
                                            {pkg.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            <span className="text-sm">{pkg.enabled ? 'Disable' : 'Enable'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {coinPackages.length === 0 && (
                            <div className="text-center py-12 bg-dark-card rounded-2xl">
                                <Package className="mx-auto text-gray-600 mb-4" size={48} />
                                <p className="text-gray-400">No coin packages yet. Create your first package!</p>
                            </div>
                        )}

                        {/* Edit/Create Package Modal */}
                        {isEditingPackage && (
                            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
                                <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-dark-surface">
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-6">
                                            {selectedPackage ? 'Edit Package' : 'Create New Package'}
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Label</label>
                                                <input
                                                    type="text"
                                                    value={newPackage.label || ''}
                                                    onChange={e => setNewPackage({ ...newPackage, label: e.target.value })}
                                                    placeholder="e.g., Starter, Popular, Premium"
                                                    className="w-full bg-dark-bg border border-dark-surface rounded-lg p-3 text-white"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">Coins</label>
                                                    <input
                                                        type="number"
                                                        value={newPackage.coins || 0}
                                                        onChange={e => setNewPackage({ ...newPackage, coins: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-dark-bg border border-dark-surface rounded-lg p-3 text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">Bonus</label>
                                                    <input
                                                        type="number"
                                                        value={newPackage.bonus || 0}
                                                        onChange={e => setNewPackage({ ...newPackage, bonus: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-dark-bg border border-dark-surface rounded-lg p-3 text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={newPackage.price || 0}
                                                    onChange={e => setNewPackage({ ...newPackage, price: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-dark-bg border border-dark-surface rounded-lg p-3 text-white"
                                                />
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newPackage.popular || false}
                                                        onChange={e => setNewPackage({ ...newPackage, popular: e.target.checked })}
                                                        className="w-5 h-5 rounded border-dark-surface"
                                                    />
                                                    <span className="text-sm">Mark as Popular</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newPackage.enabled !== false}
                                                        onChange={e => setNewPackage({ ...newPackage, enabled: e.target.checked })}
                                                        className="w-5 h-5 rounded border-dark-surface"
                                                    />
                                                    <span className="text-sm">Enabled</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex space-x-3 mt-6">
                                            <button
                                                onClick={() => {
                                                    setIsEditingPackage(false);
                                                    setSelectedPackage(null);
                                                }}
                                                className="flex-1 bg-dark-surface hover:bg-dark-bg text-white py-3 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Validate inputs
                                                        if (!newPackage.label || newPackage.label.trim() === '') {
                                                            showAlert('Please enter a package label', 'error');
                                                            return;
                                                        }
                                                        if (!newPackage.coins || newPackage.coins <= 0) {
                                                            showAlert('Coins must be greater than 0', 'error');
                                                            return;
                                                        }
                                                        if (!newPackage.price || newPackage.price <= 0) {
                                                            showAlert('Price must be greater than 0', 'error');
                                                            return;
                                                        }
                                                        if (newPackage.bonus === undefined || newPackage.bonus < 0) {
                                                            showAlert('Bonus cannot be negative', 'error');
                                                            return;
                                                        }

                                                        if (selectedPackage) {
                                                            // Update existing package
                                                            const updateData = {
                                                                label: newPackage.label,
                                                                coins: newPackage.coins,
                                                                price: newPackage.price,
                                                                bonus: newPackage.bonus || 0,
                                                                popular: newPackage.popular || false,
                                                                enabled: newPackage.enabled !== false,
                                                                updatedAt: serverTimestamp()
                                                            };
                                                            console.log('Updating package:', selectedPackage.id, updateData);
                                                            await updateDoc(doc(db, 'coinPackages', selectedPackage.id), updateData);
                                                            showAlert('Package updated successfully', 'success');
                                                        } else {
                                                            // Create new package
                                                            const order = coinPackages.length;
                                                            const newData = {
                                                                label: newPackage.label,
                                                                coins: newPackage.coins,
                                                                price: newPackage.price,
                                                                bonus: newPackage.bonus || 0,
                                                                popular: newPackage.popular || false,
                                                                enabled: newPackage.enabled !== false,
                                                                order,
                                                                createdAt: serverTimestamp(),
                                                                updatedAt: serverTimestamp()
                                                            };
                                                            console.log('Creating new package:', newData);
                                                            await addDoc(collection(db, 'coinPackages'), newData);
                                                            showAlert('Package created successfully', 'success');
                                                        }
                                                        setIsEditingPackage(false);
                                                        setSelectedPackage(null);
                                                    } catch (error: any) {
                                                        console.error('Error saving package:', error);
                                                        showAlert(`Failed to save package: ${error.message || 'Unknown error'}`, 'error');
                                                    }
                                                }}
                                                className="flex-1 bg-brand-primary hover:bg-brand-secondary text-white py-3 rounded-lg flex items-center justify-center space-x-2"
                                            >
                                                <Save size={18} />
                                                <span>Save Package</span>
                                            </button>
                                        </div>

                                        {selectedPackage && (
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
                                                        try {
                                                            await deleteDoc(doc(db, 'coinPackages', selectedPackage.id));
                                                            showAlert('Package deleted successfully', 'success');
                                                            setIsEditingPackage(false);
                                                            setSelectedPackage(null);
                                                        } catch (error) {
                                                            console.error('Error deleting package:', error);
                                                            showAlert('Failed to delete package', 'error');
                                                        }
                                                    }
                                                }}
                                                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2"
                                            >
                                                <Trash2 size={16} />
                                                <span>Delete Package</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'logs':
                return (
                    <div className="bg-dark-card rounded-2xl border border-dark-surface">
                        <div className="p-4 border-b border-dark-surface flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center">
                                <FileText className="mr-2" />
                                Admin Activity Log ({adminLogs.length})
                            </h3>
                            <button
                                onClick={async () => {
                                    console.log('🧪 TEST BUTTON CLICKED - Creating test log entry...');
                                    await logAdminAction(
                                        'profile_edited',
                                        'TEST LOG ENTRY - Manual test from Logs view',
                                        'test_user_id',
                                        'Test User',
                                        { changes: { test: 'This is a manual test' } }
                                    );
                                    console.log('🧪 Test log entry should now appear in console and Firestore');
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
                            >
                                <Play size={16} />
                                <span>Test Log Creation</span>
                            </button>
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
                                                {log.timestamp?.seconds 
                                                    ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                                                    : 'Just now'
                                                }
                                            </td>
                                            <td className="p-4 font-semibold">{log.adminName || 'Admin'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    log.action === 'banned' ? 'bg-red-500/20 text-red-300' :
                                                    log.action === 'unbanned' ? 'bg-green-500/20 text-green-300' :
                                                    log.action === 'approved' ? 'bg-green-500/20 text-green-300' :
                                                    log.action === 'report_reviewed' ? 'bg-green-500/20 text-green-300' :
                                                    log.action === 'warned' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    log.action === 'profile_edited' ? 'bg-blue-500/20 text-blue-300' :
                                                    log.action === 'rejected' ? 'bg-orange-500/20 text-orange-300' :
                                                    log.action === 'report_dismissed' ? 'bg-gray-500/20 text-gray-300' :
                                                    'bg-purple-500/20 text-purple-300'
                                                }`}>
                                                    {log.action.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm">{log.details}</td>
                                            <td className="p-4 text-sm text-dark-text-secondary">
                                                {log.targetUserName || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {adminLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-dark-text-secondary">
                                                No activity logs yet. Admin actions will appear here.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            
            case 'revenue':
                return (
                    <div className="space-y-6">
                        {/* Revenue Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl border border-green-500/30 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm text-gray-400">Total Revenue</h3>
                                    <DollarSign className="w-6 h-6 text-green-400" />
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">
                                    ₹{(() => {
                                        const total = users.reduce((sum, user) => sum + ((user.lifetimeCoinsEarned || 0) * 1), 0);
                                        return total.toLocaleString('en-IN');
                                    })()}
                                </p>
                                <p className="text-xs text-gray-400">All time earnings</p>
                            </div>

                            <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-2xl border border-yellow-500/30 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm text-gray-400">Coins Sold</h3>
                                    <Coins className="w-6 h-6 text-yellow-400" />
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">
                                    {users.reduce((sum, user) => sum + (user.lifetimeCoinsEarned || 0), 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">Total coins purchased</p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/30 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm text-gray-400">Active Balance</h3>
                                    <TrendingUp className="w-6 h-6 text-purple-400" />
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">
                                    {users.reduce((sum, user) => sum + (user.coins || 0), 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">Coins in circulation</p>
                            </div>

                            <div className="bg-gradient-to-br from-red-900/20 to-pink-900/20 rounded-2xl border border-red-500/30 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm text-gray-400">Coins Spent</h3>
                                    <TrendingDown className="w-6 h-6 text-red-400" />
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">
                                    {users.reduce((sum, user) => sum + (user.lifetimeCoinsSpent || 0), 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-400">Total usage</p>
                            </div>
                        </div>

                        {/* Top Spenders */}
                        <div className="bg-dark-card rounded-2xl border border-dark-surface">
                            <div className="p-4 border-b border-dark-surface">
                                <h3 className="font-bold text-lg flex items-center">
                                    <TrendingUp className="mr-2" />
                                    Top Purchasers
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-dark-surface">
                                        <tr>
                                            <th className="p-4">Rank</th>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Total Purchased</th>
                                            <th className="p-4">Revenue</th>
                                            <th className="p-4">Current Balance</th>
                                            <th className="p-4">Spent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users
                                            .filter(user => (user.lifetimeCoinsEarned || 0) > 0)
                                            .sort((a, b) => (b.lifetimeCoinsEarned || 0) - (a.lifetimeCoinsEarned || 0))
                                            .slice(0, 10)
                                            .map((user, index) => (
                                                <tr key={user.uid} className="border-b border-dark-surface hover:bg-dark-surface/50">
                                                    <td className="p-4">
                                                        <span className={`font-bold ${
                                                            index === 0 ? 'text-yellow-400' :
                                                            index === 1 ? 'text-gray-300' :
                                                            index === 2 ? 'text-orange-400' :
                                                            'text-gray-400'
                                                        }`}>
                                                            #{index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div>
                                                            <p className="font-semibold text-white">{user.username}</p>
                                                            <p className="text-xs text-gray-400">{user.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <Coins className="w-4 h-4 text-yellow-400" />
                                                            <span className="font-bold text-white">
                                                                {(user.lifetimeCoinsEarned || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-bold text-green-400">
                                                            ₹{((user.lifetimeCoinsEarned || 0) * 1).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-purple-400">
                                                            {(user.coins || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-red-400">
                                                            {(user.lifetimeCoinsSpent || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                        {users.filter(user => (user.lifetimeCoinsEarned || 0) > 0).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center p-8 text-dark-text-secondary">
                                                    No coin purchases yet. Revenue will appear here.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Conversion Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-dark-card rounded-2xl border border-dark-surface p-6">
                                <h4 className="text-sm text-gray-400 mb-2">Total Users</h4>
                                <p className="text-2xl font-bold text-white">{users.length}</p>
                            </div>
                            <div className="bg-dark-card rounded-2xl border border-dark-surface p-6">
                                <h4 className="text-sm text-gray-400 mb-2">Paying Users</h4>
                                <p className="text-2xl font-bold text-white">
                                    {users.filter(u => (u.lifetimeCoinsEarned || 0) > 0).length}
                                </p>
                            </div>
                            <div className="bg-dark-card rounded-2xl border border-dark-surface p-6">
                                <h4 className="text-sm text-gray-400 mb-2">Conversion Rate</h4>
                                <p className="text-2xl font-bold text-green-400">
                                    {users.length > 0 
                                        ? ((users.filter(u => (u.lifetimeCoinsEarned || 0) > 0).length / users.length) * 100).toFixed(1)
                                        : 0
                                    }%
                                </p>
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    // Show loading while auth is loading
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-primary mx-auto mb-4"></div>
                    <p className="text-dark-text-secondary">Loading admin panel...</p>
                </div>
            </div>
        );
    }
    
    // Don't render admin panel if not admin
    if (!userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-bg">
                <div className="text-center">
                    <Shield size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                    <p className="text-dark-text-secondary">You don't have permission to access the admin panel.</p>
                    <button 
                        onClick={() => navigate('/chat')}
                        className="mt-4 bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg"
                    >
                        Go to Chat
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen bg-dark-bg">
            <nav className="w-64 bg-dark-card p-4 flex flex-col border-r border-dark-surface">
                <div className="flex items-center space-x-2 mb-8 p-2">
                    <Shield size={32} className="text-brand-primary" />
                    <h1 className="text-2xl font-bold">Admin Panel</h1>
                </div>
                <ul className="space-y-2">
                    {(['dashboard', 'approvals', 'users', 'chats', 'reports', 'analytics', 'revenue', 'packages', 'logs'] as AdminView[]).map(v => (
                        <li key={v}>
                            <button onClick={() => setView(v)} className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors ${view === v ? 'bg-brand-primary/20 text-brand-primary' : 'hover:bg-dark-surface'}`}>
                                {v === 'dashboard' && <BarChart2 />}
                                {v === 'approvals' && <UserCheck />}
                                {v === 'users' && <Users />}
                                {v === 'chats' && <MessageSquare />}
                                {v === 'reports' && <Flag />}
                                {v === 'analytics' && <TrendingUp />}
                                {v === 'revenue' && <Coins />}
                                {v === 'packages' && <Package />}
                                {v === 'logs' && <FileText />}
                                <span className="capitalize">{v}</span>
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
                 <div className="mt-auto">
                    <div className="p-2 border-t border-dark-surface">
                        <p className="text-sm font-semibold">{userProfile?.username}</p>
                        <p className="text-xs text-dark-text-secondary">{userProfile?.email}</p>
                    </div>
                    <button onClick={() => navigate('/profile')} className="w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-dark-surface">
                        {userProfile?.avatarUrl ? (
                            <img 
                                src={userProfile.avatarUrl} 
                                alt="Profile" 
                                className="w-6 h-6 rounded-full object-cover"
                            />
                        ) : (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                userProfile ? ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][
                                    userProfile.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 8
                                ] : 'bg-gray-500'
                            }`}>
                                {userProfile?.username?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                        )}
                        <span>Profile</span>
                    </button>
                    <button onClick={() => signOut(auth)} className="w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-dark-surface">
                        <LogOut />
                        <span>Log Out</span>
                    </button>
                </div>
            </nav>
            <main className="flex-1 p-8 overflow-y-auto">
                {renderContent()}
            </main>
            {confirmAction && (
                <ConfirmationModal
                    title={confirmAction.title}
                    message={confirmAction.message}
                    confirmText={confirmAction.confirmText}
                    isDangerous={confirmAction.isDangerous}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                />
            )}
            {selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    reports={reports}
                    onClose={() => setSelectedUser(null)}
                    onSave={handleSaveUserDetails}
                />
            )}
            {showAlertModal && (
                <AlertModal 
                    message={alertConfig.message} 
                    type={alertConfig.type}
                    title={alertConfig.title}
                    onClose={() => setShowAlertModal(false)} 
                />
            )}
        </div>
    );
};

export default AdminPage;
