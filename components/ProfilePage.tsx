import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { doc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { User, Camera, Edit2, AlertTriangle, Check, X, ArrowLeft, XCircle, Coins, Plus, Sparkles, History, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CoinTransaction } from '../types';

// Error Modal Component
const ErrorModal: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-500/50">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="text-red-500" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-4">Error</h2>
          <p className="text-dark-text-secondary text-center leading-relaxed mb-6">{message}</p>
          <button 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Generate random avatar with initials
const generateAvatar = (name: string, seed: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  const colorIndex = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  // Handle single word or multi-word names
  const nameParts = name.trim().split(' ').filter(n => n.length > 0);
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  
  return (
    <div className={`w-32 h-32 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-dark-card`}>
      {initials}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentTransactions, setRecentTransactions] = useState<CoinTransaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    if (userProfile) {
      // Fallback for legacy data that might have fullName instead of username
      setNewName(userProfile.username || (userProfile as any).fullName || '');
      setNewBio(userProfile.bio || '');
      setAvatarUrl(userProfile.avatarUrl || '');
    }
  }, [userProfile]);

  // Fetch recent coin transactions
  const fetchRecentTransactions = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'coinTransactions'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        firestoreLimit(10)
      );
      
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CoinTransaction[];
      
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    if (showTransactions) {
      fetchRecentTransactions();
    }
  }, [showTransactions, currentUser]);

  const canChangeName = () => {
    if (!userProfile?.lastNameChange) return true;
    
    const lastChange = typeof userProfile.lastNameChange === 'object' && 'seconds' in userProfile.lastNameChange
      ? userProfile.lastNameChange.seconds * 1000
      : new Date(userProfile.lastNameChange).getTime();
    
    const now = Date.now();
    const hoursSinceLastChange = (now - lastChange) / (1000 * 60 * 60);
    const changesMadeToday = userProfile.nameChangesToday || 0;
    
    // Reset counter if it's been 24 hours
    if (hoursSinceLastChange >= 24) return true;
    
    return changesMadeToday < 2;
  };

  const canChangeAvatar = () => {
    if (!userProfile?.lastAvatarChange) return true;
    
    const lastChange = typeof userProfile.lastAvatarChange === 'object' && 'seconds' in userProfile.lastAvatarChange
      ? userProfile.lastAvatarChange.seconds * 1000
      : new Date(userProfile.lastAvatarChange).getTime();
    
    const now = Date.now();
    const hoursSinceLastChange = (now - lastChange) / (1000 * 60 * 60);
    const changesMadeToday = userProfile.avatarChangesToday || 0;
    
    // Reset counter if it's been 24 hours
    if (hoursSinceLastChange >= 24) return true;
    
    return changesMadeToday < 2;
  };

  const handleNameSave = async () => {
    if (!currentUser || !userProfile) return;
    
    if (newName.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters long');
      setShowErrorModal(true);
      return;
    }

    if (!canChangeName()) {
      setErrorMessage('You can only change your name 2 times per day. Try again later.');
      setShowErrorModal(true);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const now = Date.now();
      const lastChange = userProfile.lastNameChange 
        ? (typeof userProfile.lastNameChange === 'object' && 'seconds' in userProfile.lastNameChange
          ? userProfile.lastNameChange.seconds * 1000
          : new Date(userProfile.lastNameChange).getTime())
        : 0;
      
      const hoursSinceLastChange = (now - lastChange) / (1000 * 60 * 60);
      const shouldResetCounter = hoursSinceLastChange >= 24;
      
      console.log('Updating username:', {
        uid: currentUser.uid,
        newName: newName.trim(),
        shouldResetCounter
      });
      
      await updateDoc(userRef, {
        username: newName.trim(),
        lastNameChange: serverTimestamp(),
        nameChangesToday: shouldResetCounter ? 1 : (userProfile.nameChangesToday || 0) + 1
      });

      console.log('Username updated successfully');
      setSuccess('Name updated successfully!');
      setIsEditingName(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating name:', err);
      console.error('Error details:', {
        code: err?.code,
        message: err?.message,
        name: err?.name
      });
      setErrorMessage(`Failed to update name: ${err?.message || 'Unknown error'}`);
      setShowErrorModal(true);
    }
  };

  const handleBioSave = async () => {
    if (!currentUser || !userProfile) return;
    
    if (newBio.trim().length > 150) {
      setErrorMessage('Bio must be 150 characters or less');
      setShowErrorModal(true);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      console.log('Updating bio:', {
        uid: currentUser.uid,
        newBio: newBio.trim()
      });
      
      await updateDoc(userRef, {
        bio: newBio.trim()
      });

      console.log('Bio updated successfully');
      setSuccess('Bio updated successfully!');
      setIsEditingBio(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating bio:', err);
      setErrorMessage(`Failed to update bio: ${err?.message || 'Unknown error'}`);
      setShowErrorModal(true);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !userProfile) {
      console.log('Upload blocked: No current user or profile');
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInKB: (file.size / 1024).toFixed(2)
    });

    // Check file size (2KB = 2048 bytes)
    if (file.size > 2048) {
      console.log('File too large:', file.size, 'bytes (max: 2048 bytes)');
      setErrorMessage('Avatar must be smaller than 2KB. Please choose a smaller image.');
      setShowErrorModal(true);
      e.target.value = ''; // Reset input
      return;
    }

    if (!canChangeAvatar()) {
      console.log('Upload rate limit reached');
      setErrorMessage('You can only change your avatar 2 times per day. Try again later.');
      setShowErrorModal(true);
      e.target.value = ''; // Reset input
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      setErrorMessage('Please upload an image file');
      setShowErrorModal(true);
      e.target.value = ''; // Reset input
      return;
    }

    try {
      setIsUploading(true);
      console.log('Starting avatar upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userUid: currentUser.uid
      });

      // Create storage reference
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
      console.log('Storage ref created:', storageRef.fullPath);
      
      // Upload file to storage with timeout
      console.log('Uploading bytes to storage...');
      const snapshot = await Promise.race([
        uploadBytes(storageRef, file),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
        )
      ]) as any;
      console.log('File uploaded to storage successfully');
      
      // Get download URL
      console.log('Getting download URL...');
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadUrl);

      const userRef = doc(db, 'users', currentUser.uid);
      const now = Date.now();
      const lastChange = userProfile.lastAvatarChange 
        ? (typeof userProfile.lastAvatarChange === 'object' && 'seconds' in userProfile.lastAvatarChange
          ? userProfile.lastAvatarChange.seconds * 1000
          : new Date(userProfile.lastAvatarChange).getTime())
        : 0;
      
      const hoursSinceLastChange = (now - lastChange) / (1000 * 60 * 60);
      const shouldResetCounter = hoursSinceLastChange >= 24;

      console.log('Updating Firestore with avatar URL:', {
        downloadUrl,
        shouldResetCounter,
        currentCount: userProfile.avatarChangesToday || 0
      });
      
      await updateDoc(userRef, {
        avatarUrl: downloadUrl,
        lastAvatarChange: serverTimestamp(),
        avatarChangesToday: shouldResetCounter ? 1 : (userProfile.avatarChangesToday || 0) + 1
      });

      console.log('Avatar updated successfully in Firestore');
      setAvatarUrl(downloadUrl);
      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      e.target.value = ''; // Reset input for next upload
    } catch (err: any) {
      console.error('❌ Error uploading avatar:', err);
      console.error('Error details:', {
        code: err?.code,
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      });
      
      // Show user-friendly error message
      let errorMsg = 'Failed to upload avatar';
      if (err?.code === 'storage/unauthorized') {
        errorMsg = 'Permission denied. Please check Firebase Storage rules.';
      } else if (err?.code === 'storage/canceled') {
        errorMsg = 'Upload was canceled.';
      } else if (err?.message?.includes('timeout')) {
        errorMsg = 'Upload timed out. Please try again or use a smaller image.';
      } else if (err?.message) {
        errorMsg = `Failed to upload avatar: ${err.message}`;
      }
      
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
      e.target.value = ''; // Reset input even on error
    } finally {
      console.log('Upload process completed, setting isUploading to false');
      setIsUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white">Please log in to view your profile.</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  const nameChangesLeft = canChangeName() 
    ? (2 - (userProfile.nameChangesToday || 0)) 
    : 0;
  
  const avatarChangesLeft = canChangeAvatar() 
    ? (2 - (userProfile.avatarChangesToday || 0)) 
    : 0;

  return (
    <div className="min-h-screen bg-dark-bg bg-grid-dark-surface/[0.2] py-8 px-4">
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-dark-bg [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center text-dark-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Chat
          </button>
        </div>

        {/* Coin Balance Card */}
        <div className="bg-gradient-to-br from-yellow-900/20 via-orange-900/20 to-yellow-900/20 rounded-2xl shadow-xl border border-yellow-500/30 p-6 mb-6 relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-orange-400/5 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Your Balance</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                      {userProfile.coins || 0}
                    </span>
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/store')}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/30"
              >
                <ShoppingCart className="w-5 h-5" />
                Buy Coins
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-yellow-500/20">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Earned</p>
                <p className="text-lg font-bold text-green-400">
                  {userProfile.lifetimeCoinsEarned || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Spent</p>
                <p className="text-lg font-bold text-red-400">
                  {userProfile.lifetimeCoinsSpent || 0}
                </p>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setShowTransactions(!showTransactions)}
                  className="w-full hover:bg-yellow-500/10 rounded-lg py-1 transition-colors"
                >
                  <p className="text-xs text-gray-400 mb-1">History</p>
                  <div className="flex items-center justify-center gap-1">
                    <History className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">View</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Transaction History */}
            {showTransactions && (
              <div className="mt-4 pt-4 border-t border-yellow-500/20 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-semibold text-white mb-3">Recent Transactions</h4>
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{tx.description}</p>
                          <p className="text-xs text-gray-400">
                            {tx.timestamp && typeof tx.timestamp === 'object' && 'seconds' in tx.timestamp
                              ? new Date(tx.timestamp.seconds * 1000).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Just now'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </p>
                          {tx.razorpayAmount && (
                            <p className="text-xs text-gray-400">₹{tx.razorpayAmount}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-dark-card rounded-2xl shadow-xl border border-dark-surface overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-brand-primary to-brand-secondary"></div>
          
          {/* Profile Content */}
          <div className="p-8 -mt-16">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {isUploading && (
                  <div className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-70 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-32 h-32 rounded-full border-4 border-dark-card object-cover"
                  />
                ) : (
                  generateAvatar(userProfile.username || (userProfile as any).fullName || 'User', userProfile.uid)
                )}
                
                <label 
                  htmlFor="avatar-upload" 
                  className={`absolute bottom-0 right-0 bg-brand-primary hover:bg-brand-secondary text-white p-3 rounded-full cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera size={20} />
                  )}
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploading || !canChangeAvatar()}
                    className="hidden"
                  />
                </label>
              </div>
              
              {!canChangeAvatar() && (
                <p className="text-xs text-red-400 mt-2">
                  Avatar changes exhausted for today
                </p>
              )}
              {canChangeAvatar() && avatarChangesLeft < 2 && (
                <p className="text-xs text-yellow-400 mt-2">
                  {avatarChangesLeft} avatar change{avatarChangesLeft !== 1 ? 's' : ''} left today
                </p>
              )}
              <p className="text-[10px] text-dark-text-secondary mt-1">Max size: 2KB</p>
            </div>

            {/* Name Section */}
            <div className="mb-6">
              <label className="text-sm text-dark-text-secondary mb-2 block">Username</label>
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-dark-bg text-white p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Enter your username"
                  />
                  <button
                    onClick={handleNameSave}
                    className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setNewName(userProfile.username || (userProfile as any).fullName || '');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-dark-bg p-4 rounded-lg border border-dark-surface">
                  <span className="text-white font-medium">{userProfile.username || (userProfile as any).fullName || 'User'}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    disabled={!canChangeName()}
                    className={`text-brand-primary hover:text-brand-secondary transition-colors ${!canChangeName() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
              {!canChangeName() && (
                <p className="text-xs text-red-400 mt-2">
                  Name changes exhausted for today
                </p>
              )}
              {canChangeName() && nameChangesLeft < 2 && (
                <p className="text-xs text-yellow-400 mt-2">
                  {nameChangesLeft} name change{nameChangesLeft !== 1 ? 's' : ''} left today
                </p>
              )}
            </div>

            {/* Bio Section */}
            <div className="mb-6">
              <label className="text-sm text-dark-text-secondary mb-2 block">Bio</label>
              {isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    maxLength={150}
                    rows={3}
                    className="w-full bg-dark-bg text-white p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                    placeholder="Tell others about yourself..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-text-secondary">
                      {newBio.length}/150 characters
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleBioSave}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <Check size={16} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBio(false);
                          setNewBio(userProfile.bio || '');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                      >
                        <X size={16} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-dark-bg p-4 rounded-lg border border-dark-surface min-h-[80px] flex items-start justify-between">
                  <span className="text-white flex-1">
                    {userProfile.bio || 'No bio yet. Click edit to add one!'}
                  </span>
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="text-brand-primary hover:text-brand-secondary transition-colors ml-2"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Email Section */}
            <div className="mb-6">
              <label className="text-sm text-dark-text-secondary mb-2 block">Email</label>
              <div className="bg-dark-bg p-4 rounded-lg border border-dark-surface">
                <span className="text-white">{userProfile.email}</span>
              </div>
            </div>

            {/* Admission Number */}
            <div className="mb-6">
              <label className="text-sm text-dark-text-secondary mb-2 block">Admission Number</label>
              <div className="bg-dark-bg p-4 rounded-lg border border-dark-surface">
                <span className="text-white">{userProfile.admissionNumber}</span>
              </div>
            </div>

            {/* Gender */}
            <div className="mb-6">
              <label className="text-sm text-dark-text-secondary mb-2 block">Gender</label>
              <div className="bg-dark-bg p-4 rounded-lg border border-dark-surface">
                <span className="text-white capitalize">{userProfile.gender}</span>
              </div>
            </div>

            {/* Warnings Section */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="text-yellow-400 mr-2" size={20} />
                <h3 className="text-yellow-400 font-bold">Warning History</h3>
              </div>
              <div className="text-white">
                <p className="text-sm text-dark-text-secondary mb-1">Total Warnings Received:</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {userProfile.warnings || 0}
                </p>
                {(userProfile.warnings || 0) > 0 && (
                  <p className="text-xs text-dark-text-secondary mt-2">
                    Multiple warnings may result in account restrictions or ban.
                  </p>
                )}
              </div>
            </div>

            {/* Success Messages */}
            {success && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-sm">
                {success}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal 
          message={errorMessage}
          onClose={() => {
            setShowErrorModal(false);
            setErrorMessage('');
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
