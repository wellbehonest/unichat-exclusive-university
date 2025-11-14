
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, limit, serverTimestamp, addDoc, orderBy, deleteDoc, updateDoc, writeBatch, getDoc, Timestamp, increment } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { GenderPreference, Chat, Message, UserProfile, ChatParticipantInfo, MatchProposal, QueueEntry } from '../types';
import { signOut } from 'firebase/auth';
import { LogOut, Send, Users, X, Clock, Sparkles, Tv, MessageSquare, Search, FileImage, Flag, AlertTriangle, CheckCircle, User, CornerDownLeft, Smile, Menu, Trash2, Upload, Shield, Edit2, ChevronLeft, XCircle, Info, Coins, Zap, Plus, ShoppingCart, Diamond, UserCircle2, UserCheck, Settings, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { IoMale, IoFemale } from 'react-icons/io5';

// Tenor API Configuration
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Default Tenor test key
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

// --- GIF Picker Component ---
interface TenorGif {
  id: string;
  media_formats: {
    tinygif: { url: string };
    gif: { url: string };
  };
}

const GifPicker: React.FC<{ onSelectGif: (gifUrl: string) => void; onClose: () => void }> = ({ onSelectGif, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load featured/trending GIFs on mount
    fetchGifs('');
  }, []);

  const fetchGifs = async (search: string) => {
    setLoading(true);
    try {
      const endpoint = search ? 'search' : 'featured';
      const searchParam = search ? `&q=${encodeURIComponent(search)}` : '';
      const response = await fetch(
        `${TENOR_API_URL}/${endpoint}?key=${TENOR_API_KEY}${searchParam}&limit=20&media_filter=gif,tinygif`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchGifs(searchTerm);
  };

  return (
    <div className="absolute bottom-16 left-0 right-0 bg-dark-card border border-dark-surface rounded-t-xl shadow-2xl flex flex-col z-50" style={{ height: '280px' }}>
      <div className="px-2.5 py-2 border-b border-dark-surface flex items-center justify-between bg-dark-surface/50">
        <h3 className="font-semibold text-white flex items-center text-xs">
          <FileImage className="mr-1.5" size={16} />
          GIFs
        </h3>
        <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <form onSubmit={handleSearch} className="p-1.5 bg-dark-surface/30">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-dark-text-secondary" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-2 py-1 text-xs bg-dark-bg text-white rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary border border-dark-surface"
          />
        </div>
      </form>
      
      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-6 h-6 border-4 border-dashed rounded-full animate-spin border-brand-primary"></div>
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-5 gap-0.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif.media_formats.gif.url);
                  onClose();
                }}
                className="relative rounded overflow-hidden hover:ring-1 hover:ring-brand-primary transition-all bg-dark-surface group aspect-square"
              >
                <img
                  src={gif.media_formats.tinygif.url}
                  alt="GIF"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-dark-text-secondary text-xs">
            No GIFs found
          </div>
        )}
      </div>
      
      <div className="px-2 py-1 border-t border-dark-surface text-center text-[10px] text-dark-text-secondary bg-dark-surface/30">
        Powered by Tenor
      </div>
    </div>
  );
};

// --- Emoji Picker Component ---
const EmojiPicker: React.FC<{ onSelectEmoji: (emoji: string) => void; onClose: () => void }> = ({ onSelectEmoji, onClose }) => {
  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳'],
    'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳'],
  };

  const [activeCategory, setActiveCategory] = useState<string>('Smileys');

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-dark-bg border border-dark-surface rounded-3xl shadow-2xl flex flex-col z-50" style={{ height: '280px' }}>
      <div className="px-2.5 py-2 border-b border-dark-surface flex items-center justify-between bg-dark-surface/50 rounded-t-3xl">
        <div className="flex space-x-2">
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                activeCategory === category
                  ? 'bg-brand-primary text-white'
                  : 'text-dark-text-secondary hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {emojiCategories[activeCategory as keyof typeof emojiCategories].map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="text-2xl hover:bg-dark-surface rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Profile Modal Component ---
interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onBlock: () => void;
}

// Generate random avatar with initials
const generateProfileAvatar = (name: string, seed: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  const colorIndex = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const nameParts = name.trim().split(' ').filter(n => n.length > 0);
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  
  return (
    <div className={`w-24 h-24 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white text-3xl font-bold`}>
      {initials}
    </div>
  );
};

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose, onBlock }) => {
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const handleBlockUser = () => {
    onBlock();
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-dark-surface" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">User Profile</h2>
            <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex flex-col items-center mb-6">
            {profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt="Profile" 
                className="w-24 h-24 rounded-full border-4 border-dark-surface object-cover"
              />
            ) : (
              generateProfileAvatar(profile.username, profile.uid)
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-dark-text-secondary block mb-1">Username</label>
              <div className="bg-dark-bg p-3 rounded-lg border border-dark-surface">
                <span className="text-white font-medium">{profile.username}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-dark-text-secondary block mb-1">Gender</label>
              <div className="bg-dark-bg p-3 rounded-lg border border-dark-surface">
                <span className="text-white capitalize">{profile.gender}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-dark-text-secondary block mb-1">Bio</label>
              <div className="bg-dark-bg p-3 rounded-lg border border-dark-surface min-h-[80px]">
                <span className="text-white">{profile.bio || 'No bio available'}</span>
              </div>
            </div>
          </div>

          {/* Block Button */}
          <div className="mt-6 pt-4 border-t border-dark-surface">
            {!showBlockConfirm ? (
              <button
                onClick={() => setShowBlockConfirm(true)}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-500 font-bold py-3 px-4 rounded-lg transition-colors border border-red-600/50 flex items-center justify-center"
              >
                <X className="mr-2" size={18} />
                Block User
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-dark-text-secondary text-center">
                  Block this user? You won't be matched with them again.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowBlockConfirm(false)}
                    className="flex-1 bg-dark-surface hover:bg-dark-bg text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockUser}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Block
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// --- Leave Confirmation Modal ---
const LeaveConfirmationModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-dark-surface">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-4">Leave Chat?</h2>
          <p className="text-dark-text-secondary text-center leading-relaxed mb-6">
            Are you sure you want to leave this chat? This will end the conversation for both users.
          </p>
          <div className="flex space-x-3">
            <button 
              onClick={onCancel}
              className="flex-1 bg-dark-surface hover:bg-dark-bg text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Stay
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Leave Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// --- Success Modal Component ---
const SuccessModal: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border border-green-500/50 transform animate-scale-in">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-green-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Success!</h2>
          <p className="text-dark-text-secondary">{message}</p>
          <button 
            onClick={onClose}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// --- Report Modal Component ---
const ReportModal: React.FC<{ onClose: () => void; onSubmit: (reason: string) => void }> = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const predefinedReasons = [
    'Inappropriate content',
    'Harassment or bullying',
    'Spam or advertising',
    'Hate speech',
    'Threatening behavior',
    'Other'
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' ? reason : selectedReason;
    if (finalReason.trim()) {
      onSubmit(finalReason);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border border-dark-surface">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Flag className="mr-2 text-red-500" size={24} />
              Report User
            </h2>
            <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-3 rounded-lg text-sm mb-4 flex items-start">
            <AlertTriangle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
            <p>This will report the user and save the chat for admin review. False reports may result in action against your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">Select a reason:</label>
              <div className="space-y-2">
                {predefinedReasons.map((r) => (
                  <label key={r} className="flex items-center p-3 bg-dark-surface rounded-lg cursor-pointer hover:bg-dark-surface/70 transition-colors">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="h-4 w-4 text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="ml-3 text-white">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Please describe:</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary text-white min-h-[100px]"
                  required
                />
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-dark-surface hover:bg-dark-surface/70 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedReason}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// --- Warning Notification Modal ---
const WarningNotificationModal: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-500">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-4">Admin Warning</h2>
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg mb-6">
            <p className="text-white text-center leading-relaxed">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
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
    info: Info
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

  const modalContent = (
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

  return ReactDOM.createPortal(modalContent, document.body);
};

// --- Slide-Up Panel Component ---
type PanelType = 'profile' | 'account' | 'privacy' | 'settings' | null;

const SlideUpPanel: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    type: PanelType;
    userProfile: UserProfile | null;
    showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}> = ({ isOpen, onClose, type, userProfile, showAlert }) => {
    const { currentUser } = useAuth();
    const [username, setUsername] = useState(userProfile?.username || '');
    const [bio, setBio] = useState(userProfile?.bio || '');
    const [gender, setGender] = useState(userProfile?.gender || 'male');
    const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    
    // Settings state
    const [interestSearchTimeout, setInterestSearchTimeout] = useState<number>(
        parseInt(localStorage.getItem('interestSearchTimeout') || '30')
    );
    const [muteNotifications, setMuteNotifications] = useState<boolean>(
        localStorage.getItem('muteNotifications') === 'true'
    );
    const [autoRematch, setAutoRematch] = useState<boolean>(
        localStorage.getItem('autoRematch') === 'true'
    );

    // Track changes
    useEffect(() => {
        if (type === 'profile') {
            const usernameChanged = username !== (userProfile?.username || '');
            const bioChanged = bio !== (userProfile?.bio || '');
            setHasChanges(usernameChanged || bioChanged);
        }
    }, [username, bio, type, userProfile]);

    // Load blocked users when privacy panel opens
    useEffect(() => {
        if (type !== 'privacy' || !userProfile?.blockedUsers || userProfile.blockedUsers.length === 0) {
            setBlockedUsers([]);
            return;
        }

        const loadBlockedUsers = async () => {
            const profiles: UserProfile[] = [];
            for (const uid of userProfile.blockedUsers) {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    profiles.push({ uid, ...userDoc.data() } as UserProfile);
                }
            }
            setBlockedUsers(profiles);
        };

        loadBlockedUsers();
    }, [type, userProfile?.blockedUsers]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !currentUser || !userProfile) return;
        
        // Check daily limit for avatar changes
        const now = new Date();
        const lastChange = userProfile.lastAvatarChange?.toDate();
        const changesToday = userProfile.avatarChangesToday || 0;
        
        // Reset counter if it's a new day
        const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
        
        if (!isNewDay && changesToday >= 3) {
            showAlert('⚠️ Avatar change limit reached!\n\nYou can only change your avatar 3 times per day. Please try again tomorrow.', 'warning', 'Avatar Limit Reached');
            return;
        }
        
        const file = e.target.files[0];
        if (file.size > 2 * 1024) {
            showAlert('⚠️ Image too large!\n\nImage must be less than 2KB in size.', 'error', 'File Size Error');
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                await updateDoc(doc(db, 'users', currentUser.uid), { 
                    avatarUrl: base64,
                    lastAvatarChange: serverTimestamp(),
                    avatarChangesToday: isNewDay ? 1 : changesToday + 1
                });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Failed to upload avatar. Please try again.', 'error', 'Upload Failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!currentUser || !userProfile) return;
        
        // Check daily limit for avatar changes
        const now = new Date();
        const lastChange = userProfile.lastAvatarChange?.toDate();
        const changesToday = userProfile.avatarChangesToday || 0;
        
        // Reset counter if it's a new day
        const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
        
        if (!isNewDay && changesToday >= 3) {
            showAlert('⚠️ Avatar change limit reached!\n\nYou can only change your avatar 3 times per day. Please try again tomorrow.', 'warning', 'Avatar Limit Reached');
            return;
        }
        
        await updateDoc(doc(db, 'users', currentUser.uid), { 
            avatarUrl: null,
            lastAvatarChange: serverTimestamp(),
            avatarChangesToday: isNewDay ? 1 : changesToday + 1
        });
    };

    const handleSaveProfile = async () => {
        if (!currentUser || !userProfile) return;
        
        // Check if username has changed
        const usernameChanged = username.trim() !== userProfile.username;
        
        if (usernameChanged) {
            // Check daily limit for username changes
            const now = new Date();
            const lastChange = userProfile.lastNameChange?.toDate();
            const changesToday = userProfile.nameChangesToday || 0;
            
            // Reset counter if it's a new day
            const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
            
            if (!isNewDay && changesToday >= 3) {
                showAlert('⚠️ Username change limit reached!\n\nYou can only change your username 3 times per day. Please try again tomorrow.', 'warning', 'Username Limit Reached');
                setIsSaving(false);
                return;
            }
        }
        
        setIsSaving(true);
        try {
            const updates: any = {
                bio: bio.trim(),
                gender
            };
            
            // If username changed, update counter
            if (usernameChanged) {
                const now = new Date();
                const lastChange = userProfile.lastNameChange?.toDate();
                const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
                
                updates.username = username.trim() || userProfile.username;
                updates.lastNameChange = serverTimestamp();
                updates.nameChangesToday = isNewDay ? 1 : (userProfile.nameChangesToday || 0) + 1;
            }
            
            await updateDoc(doc(db, 'users', currentUser.uid), updates);
            setHasChanges(false);
            // Show brief success feedback
            setTimeout(() => setIsSaving(false), 500);
        } catch (error) {
            console.error('Error saving profile:', error);
            setIsSaving(false);
            showAlert('Failed to save changes. Please try again.', 'error', 'Save Failed');
        }
    };

    const handleUnblock = async (uid: string) => {
        if (!currentUser || !userProfile) return;
        const newBlockedUsers = (userProfile.blockedUsers || []).filter(id => id !== uid);
        await updateDoc(doc(db, 'users', currentUser.uid), { blockedUsers: newBlockedUsers });
    };

    const handleDeleteAccount = async () => {
        if (!currentUser) return;
        if (!confirm('Are you sure? This will permanently delete your account and all data.')) return;
        
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid));
            await currentUser.delete();
            await signOut(auth);
        } catch (error) {
            showAlert('Error deleting account. Please try logging out and back in first.', 'error', 'Delete Failed');
        }
    };

    const getPanelTitle = () => {
        switch (type) {
            case 'profile': return 'Profile';
            case 'account': return 'Account';
            case 'privacy': return 'Privacy';
            default: return '';
        }
    };

    const panelContent = (
        <div className={`fixed inset-0 z-[250] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            
            {/* Slide-Up Panel */}
            <div className={`absolute bottom-0 left-0 right-0 ${type === 'privacy' ? 'h-[75vh]' : type === 'account' ? 'h-[55vh]' : type === 'settings' ? 'h-[70vh]' : 'h-[82vh]'} max-h-[90vh] bg-gradient-to-b from-dark-card to-dark-bg rounded-t-[2rem] shadow-2xl border-t-2 border-brand-primary/20 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header with Back Button */}
                    <div className="p-5 flex items-center space-x-4 border-b border-dark-surface/50 flex-shrink-0">
                        <button 
                            onClick={onClose} 
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-dark-surface hover:bg-dark-surface/70 text-dark-text-secondary hover:text-brand-primary transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white">{getPanelTitle()}</h2>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-surface scrollbar-track-transparent">
                        <div className="p-6 pb-16">
                        {type === 'profile' && (
                            <div className="flex flex-col items-center space-y-6">
                                {/* Avatar */}
                                <div className="relative group">
                                    {userProfile?.avatarUrl ? (
                                        <img src={userProfile.avatarUrl} alt="Avatar" className="w-28 h-28 rounded-full object-cover ring-4 ring-brand-primary/20" />
                                    ) : (
                                        <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold ring-4 ring-brand-primary/20 ${
                                            userProfile ? ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'][
                                                userProfile.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4
                                            ] : 'bg-gray-500'
                                        }`}>
                                            {userProfile?.username?.slice(0, 2).toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>

                                {/* Avatar Buttons with Change Counter */}
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="flex space-x-3">
                                        <label className="px-5 py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-sm font-medium rounded-xl cursor-pointer transition-all flex items-center space-x-2 shadow-lg hover:shadow-brand-primary/20">
                                            <Upload size={16} />
                                            <span>Change Photo</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
                                        </label>
                                        {userProfile?.avatarUrl && (
                                            <button 
                                                onClick={handleRemoveAvatar} 
                                                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium rounded-xl transition-all border border-red-500/20"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {(() => {
                                        const now = new Date();
                                        const lastChange = userProfile?.lastAvatarChange?.toDate();
                                        const changesToday = userProfile?.avatarChangesToday || 0;
                                        const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
                                        const remaining = isNewDay ? 3 : Math.max(0, 3 - changesToday);
                                        return (
                                            <p className="text-xs text-dark-text-secondary/70">
                                                {remaining > 0 ? `${remaining} change${remaining !== 1 ? 's' : ''} remaining today` : 'No changes remaining today'}
                                            </p>
                                        );
                                    })()}
                                </div>

                                {/* Username */}
                                <div className="w-full max-w-md">
                                    <label className="text-sm font-medium text-dark-text-secondary mb-2 block">Username</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-dark-surface/50 text-white p-3 pr-10 rounded-xl border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                            placeholder="Enter your username"
                                        />
                                        <Edit2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary pointer-events-none" />
                                    </div>
                                    {(() => {
                                        const now = new Date();
                                        const lastChange = userProfile?.lastNameChange?.toDate();
                                        const changesToday = userProfile?.nameChangesToday || 0;
                                        const isNewDay = !lastChange || lastChange.toDateString() !== now.toDateString();
                                        const remaining = isNewDay ? 3 : Math.max(0, 3 - changesToday);
                                        return (
                                            <p className="text-xs text-dark-text-secondary/70 mt-1.5">
                                                {remaining > 0 ? `${remaining} change${remaining !== 1 ? 's' : ''} remaining today` : 'No changes remaining today'}
                                            </p>
                                        );
                                    })()}
                                </div>

                                {/* Bio */}
                                <div className="w-full max-w-md">
                                    <label className="text-sm font-medium text-dark-text-secondary mb-2 block">Bio</label>
                                    <div className="relative">
                                        <textarea 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value.slice(0, 150))}
                                            placeholder="Tell us about yourself..."
                                            className="w-full bg-dark-surface/50 text-white p-3 pr-10 rounded-xl border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent min-h-[110px] resize-none transition-all"
                                        />
                                        <Edit2 size={16} className="absolute right-3 top-3 text-dark-text-secondary pointer-events-none" />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-dark-text-secondary font-medium">{bio.length}/150</span>
                                    </div>
                                </div>

                                {/* Save Button */}
                                {hasChanges && (
                                    <div className="w-full max-w-md mt-6">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={18} />
                                                    <span>Save Changes</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {type === 'account' && (
                            <div className="max-w-md mx-auto space-y-5">
                                {/* Email */}
                                <div>
                                    <label className="text-sm font-medium text-dark-text-secondary mb-2 block">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={currentUser?.email || ''}
                                        readOnly
                                        className="w-full bg-dark-surface/30 text-dark-text-secondary p-3 rounded-xl border border-dark-surface/50 cursor-not-allowed"
                                    />
                                </div>

                                {/* Gender (Read-only) */}
                                <div>
                                    <label className="text-sm font-medium text-dark-text-secondary mb-2 block">Gender</label>
                                    <input 
                                        type="text" 
                                        value={userProfile?.gender ? userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1) : 'Not specified'}
                                        readOnly
                                        className="w-full bg-dark-surface/30 text-dark-text-secondary p-3 rounded-xl border border-dark-surface/50 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-dark-text-secondary/60 mt-1.5">Gender cannot be changed</p>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-dark-surface/50 my-6"></div>

                                {/* Logout */}
                                <button 
                                    onClick={() => signOut(auth)}
                                    className="w-full bg-dark-surface hover:bg-dark-surface/70 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 border border-dark-surface/50 hover:border-brand-primary/30"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>

                                {/* Delete Account */}
                                <button 
                                    onClick={handleDeleteAccount}
                                    className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 border border-red-500/30 hover:border-red-500/50"
                                >
                                    <Trash2 size={18} />
                                    <span>Delete Account</span>
                                </button>
                                <p className="text-xs text-center text-red-400/60">⚠️ This action cannot be undone</p>
                            </div>
                        )}

                        {type === 'privacy' && (
                            <div className="max-w-lg mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-primary/10">
                                            <Shield size={20} className="text-brand-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Blocked Users</h3>
                                            <p className="text-xs text-dark-text-secondary">{blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''} blocked</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {blockedUsers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4">
                                        <div className="w-20 h-20 rounded-full bg-dark-surface/50 flex items-center justify-center mb-4">
                                            <Shield size={32} className="text-dark-text-secondary/40" />
                                        </div>
                                        <p className="text-dark-text-secondary text-center text-sm">No blocked users</p>
                                        <p className="text-dark-text-secondary/60 text-center text-xs mt-2">Users you block will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {blockedUsers.map(user => (
                                            <div key={user.uid} className="flex items-center justify-between bg-dark-surface/40 hover:bg-dark-surface/60 p-4 rounded-xl border border-dark-surface/50 transition-all group">
                                                <div className="flex items-center space-x-4 flex-1 min-w-0">
                                                    {user.avatarUrl ? (
                                                        <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-dark-surface" />
                                                    ) : (
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-dark-surface ${
                                                            ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'][
                                                                user.uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4
                                                            ]
                                                        }`}>
                                                            {user.username.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{user.username}</p>
                                                        <p className="text-xs text-dark-text-secondary">Blocked user</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleUnblock(user.uid)}
                                                    className="px-4 py-2 text-sm font-medium bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg transition-all border border-brand-primary/20 hover:border-brand-primary flex-shrink-0"
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {type === 'settings' && (
                            <div className="max-w-lg mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-primary/10">
                                            <Settings size={20} className="text-brand-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Settings</h3>
                                            <p className="text-xs text-dark-text-secondary">Customize your chat experience</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Interest Search Timeout */}
                                    <div className="bg-dark-surface/40 p-4 rounded-xl border border-dark-surface/50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <Clock size={18} className="text-brand-primary" />
                                                    <h4 className="text-white font-semibold">Interest Search Timeout</h4>
                                                </div>
                                                <p className="text-xs text-dark-text-secondary">How long to wait for a match with shared interests before switching to any match</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="range"
                                                min="15"
                                                max="60"
                                                step="1"
                                                value={interestSearchTimeout}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value);
                                                    setInterestSearchTimeout(value);
                                                    localStorage.setItem('interestSearchTimeout', value.toString());
                                                }}
                                                className="flex-1 h-2 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-brand-primary"
                                            />
                                            <span className="text-white font-semibold text-sm min-w-[60px] text-right">{interestSearchTimeout}s</span>
                                        </div>
                                    </div>

                                    {/* Mute Notifications */}
                                    <div className="bg-dark-surface/40 p-4 rounded-xl border border-dark-surface/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {muteNotifications ? (
                                                        <VolumeX size={18} className="text-brand-primary" />
                                                    ) : (
                                                        <Volume2 size={18} className="text-brand-primary" />
                                                    )}
                                                    <h4 className="text-white font-semibold">Mute Notifications</h4>
                                                </div>
                                                <p className="text-xs text-dark-text-secondary">Disable notification sounds for new messages</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newValue = !muteNotifications;
                                                    setMuteNotifications(newValue);
                                                    localStorage.setItem('muteNotifications', newValue.toString());
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    muteNotifications ? 'bg-brand-primary' : 'bg-dark-surface'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        muteNotifications ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Auto Rematch */}
                                    <div className="bg-dark-surface/40 p-4 rounded-xl border border-dark-surface/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <RefreshCw size={18} className="text-brand-primary" />
                                                    <h4 className="text-white font-semibold">Auto Rematch</h4>
                                                </div>
                                                <p className="text-xs text-dark-text-secondary">Automatically find a new partner after disconnecting from a chat</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newValue = !autoRematch;
                                                    setAutoRematch(newValue);
                                                    localStorage.setItem('autoRematch', newValue.toString());
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    autoRematch ? 'bg-brand-primary' : 'bg-dark-surface'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                        autoRematch ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(panelContent, document.body);
};

// --- Menu Drawer Component ---
const MenuDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    userProfile: UserProfile | null;
    showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}> = ({ isOpen, onClose, userProfile, showAlert }) => {
    const [activePanel, setActivePanel] = useState<PanelType>(null);
    const navigate = useNavigate();

    const menuOptions = [
        { id: 'profile' as PanelType, label: 'Profile', icon: User },
        { id: 'account' as PanelType, label: 'Account', icon: Users },
        { id: 'privacy' as PanelType, label: 'Privacy', icon: Shield },
        { id: 'settings' as PanelType, label: 'Settings', icon: Settings },
    ];

    const handleOptionClick = (panelType: PanelType) => {
        setActivePanel(panelType);
    };

    const handlePanelClose = () => {
        setActivePanel(null);
    };

    const drawerContent = (
        <>
            <div className={`fixed inset-0 z-[200] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black transition-opacity duration-300 ${isOpen ? 'opacity-50' : 'opacity-0'}`}
                    onClick={onClose}
                />
                
                {/* Drawer Panel */}
                <div className={`absolute top-0 right-0 h-full w-[320px] bg-dark-card shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-4 border-b border-dark-surface flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Menu</h2>
                            <button onClick={onClose} className="text-dark-text-secondary hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Menu Options */}
                        <div className="flex-1 p-4 space-y-2">
                            {menuOptions.map((option) => {
                                const IconComponent = option.icon;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionClick(option.id)}
                                        className="w-full flex items-center space-x-3 p-4 bg-dark-surface hover:bg-dark-surface/70 rounded-lg transition-colors group"
                                    >
                                        <IconComponent size={22} className="text-brand-primary group-hover:text-brand-secondary transition-colors" />
                                        <span className="text-white font-medium">{option.label}</span>
                                    </button>
                                );
                            })}
                            
                            {/* Store Navigation Button */}
                            <button
                                onClick={() => {
                                    navigate('/store');
                                    onClose();
                                }}
                                className="w-full flex items-center space-x-3 p-4 bg-dark-surface hover:bg-dark-surface/70 rounded-lg transition-colors group"
                            >
                                <ShoppingCart size={22} className="text-brand-primary group-hover:text-brand-secondary transition-colors" />
                                <span className="text-white font-medium">Store</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-Up Panels */}
            <SlideUpPanel 
                isOpen={activePanel !== null} 
                onClose={handlePanelClose} 
                type={activePanel}
                userProfile={userProfile}
                showAlert={showAlert}
            />
        </>
    );

    return ReactDOM.createPortal(drawerContent, document.body);
};

// --- Header Component ---
const Header: React.FC<{ 
    userProfile: UserProfile | null;
    showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
    onOpenCoinModal: () => void;
}> = ({ userProfile, showAlert, onOpenCoinModal }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    return (
        <>
            <header className="absolute top-0 left-0 right-0 p-4 bg-dark-bg/50 backdrop-blur-sm z-30">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        {/* Logo Image - SVG */}
                        <img 
                            src="/logo.svg" 
                            alt="LynZo Logo" 
                            className="h-12 w-auto mr-3"
                            onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback Icon (hidden by default, shown if image fails) */}
                        <MessageSquare className="mr-2 text-brand-primary hidden" />
                        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Momo Trust Display', sans-serif" }}>
                            LynZo
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Coin Counter in Header */}
                        {userProfile && (
                            <button
                                onClick={onOpenCoinModal}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 rounded-full border border-yellow-500/30 hover:from-yellow-900/60 hover:to-orange-900/60 transition-all duration-200 hover:scale-105"
                            >
                                <Coins className="w-4 h-4 text-yellow-400" />
                                <span className="text-white font-bold text-sm">{userProfile.coins || 0}</span>
                            </button>
                        )}
                        {userProfile && (
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="p-2 rounded-lg text-white hover:bg-dark-surface transition-colors"
                                aria-label="Menu"
                            >
                                <Menu size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </header>
            
            <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} userProfile={userProfile} showAlert={showAlert} />
        </>
    );
};

// --- Chat Dashboard ---
const ChatDashboard: React.FC<{ 
    onStartChat: (preference: GenderPreference, useCoin?: boolean, interests?: string[], searchTimeout?: number) => void;
    onOpenCoinModal: () => void;
    searchTimeout: number;
}> = ({ onStartChat, onOpenCoinModal, searchTimeout }) => {
    const { userProfile } = useAuth();
    const [preference, setPreference] = useState<GenderPreference>('any');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [interestInput, setInterestInput] = useState('');
    const [showChatRules, setShowChatRules] = useState(false);

    const needsGenderFilter = preference !== 'any';
    const hasCoins = (userProfile?.coins ?? 0) > 0;

    const suggestedInterests = ['btech', 'bca', 'cse', 'civil'];

    const addInterest = (interest?: string) => {
        const interestToAdd = interest || interestInput.trim().toLowerCase();
        if (interestToAdd && !selectedInterests.includes(interestToAdd) && selectedInterests.length < 5) {
            setSelectedInterests(prev => [...prev, interestToAdd]);
            setInterestInput('');
        }
    };

    const removeInterest = (interest: string) => {
        setSelectedInterests(prev => prev.filter(i => i !== interest));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addInterest();
        }
    };

    return (
        <div className="flex items-center justify-center h-full p-4 overflow-hidden">
            <div className="w-full max-w-lg text-center bg-dark-card/80 backdrop-blur-sm border border-dark-surface/50 rounded-2xl shadow-2xl p-6 space-y-4 overflow-hidden">
                <h2 className="text-3xl font-bold text-white">Find a Chat Partner</h2>
                <p className="text-dark-text-secondary text-sm">Connect with another student from your university.</p>

                {/* Interests Section */}
                <div className="bg-dark-surface p-3 rounded-lg overflow-hidden">
                    <h3 className="text-base font-semibold mb-2 text-white">Interests (Optional)</h3>
                    
                    {/* Suggested Interests - Wrapped */}
                    {selectedInterests.length < 5 && (
                        <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1.5">Suggestions:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestedInterests
                                    .filter(suggestion => !selectedInterests.includes(suggestion))
                                    .map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => addInterest(suggestion)}
                                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-dark-card text-gray-300 hover:bg-dark-bg border border-dark-surface transition-all whitespace-nowrap"
                                        >
                                            {suggestion.toUpperCase()}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Selected Interests Tags - Wrapped */}
                    {selectedInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-center">
                            {selectedInterests.map(interest => (
                                <div
                                    key={interest}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-primary text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    <span>{interest}</span>
                                    <button
                                        onClick={() => removeInterest(interest)}
                                        className="hover:text-gray-300 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Input Field */}
                    {selectedInterests.length < 5 && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type custom interest..."
                                className="flex-1 min-w-0 px-3 py-1.5 bg-dark-card text-white rounded-lg border border-dark-surface focus:border-brand-primary focus:outline-none text-xs"
                                maxLength={20}
                            />
                            <button
                                onClick={() => addInterest()}
                                disabled={!interestInput.trim()}
                                className="px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs font-medium flex-shrink-0"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Gender Filter */}
                <div className="bg-dark-surface p-3 rounded-lg overflow-hidden">
                    <h3 className="text-base font-semibold mb-2 text-white">Gender Filter</h3>
                    <div className="flex justify-center gap-3">
                        {/* Male Option */}
                        <button
                            onClick={() => setPreference('male')}
                            className={`relative w-20 h-20 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${preference === 'male' ? 'bg-brand-primary text-white shadow-lg' : 'bg-dark-card hover:bg-dark-surface text-white'}`}
                        >
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-dark-bg">
                                <Diamond className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                            <IoMale size={24} />
                            <span className="text-xs">Male</span>
                        </button>

                        {/* Any Option */}
                        <button
                            onClick={() => setPreference('any')}
                            className={`w-20 h-20 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${preference === 'any' ? 'bg-brand-primary text-white shadow-lg' : 'bg-dark-card hover:bg-dark-surface text-white'}`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="text-xs">Any</span>
                        </button>

                        {/* Female Option */}
                        <button
                            onClick={() => setPreference('female')}
                            className={`relative w-20 h-20 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${preference === 'female' ? 'bg-brand-primary text-white shadow-lg' : 'bg-dark-card hover:bg-dark-surface text-white'}`}
                        >
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-dark-bg">
                                <Diamond className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                            <IoFemale size={24} />
                            <span className="text-xs">Female</span>
                        </button>
                    </div>
                </div>

                {needsGenderFilter && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-2.5 rounded-lg text-xs space-y-1">
                        <p>Gender-filtered search requires 1 coin per match.</p>
                        <p className="font-semibold">You have {userProfile?.coins ?? 0} coin(s).</p>
                    </div>
                )}

                {!needsGenderFilter && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-2.5 rounded-lg text-xs space-y-1">
                        <p>Standard search with no filters</p>
                        <p className="font-semibold">Free to use</p>
                    </div>
                )}
                
                {preference === 'any' ? (
                    <button 
                        onClick={() => onStartChat(preference, false, selectedInterests, searchTimeout)} 
                        className="w-full flex items-center justify-center bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-lg"
                    >
                       <Sparkles className="mr-2" size={18}/> Start Chatting
                    </button>
                ) : hasCoins ? (
                    <button 
                        onClick={() => onStartChat(preference, true, selectedInterests, searchTimeout)}
                        className="w-full flex items-center justify-center bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-lg"
                    >
                        <Sparkles className="mr-2" size={18}/> Start Chatting
                    </button>
                ) : (
                    <button 
                        onClick={onOpenCoinModal}
                        className="w-full flex items-center justify-center bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-lg"
                    >
                        <Coins className="mr-2" size={18}/> Buy Coins
                    </button>
                )}

                {/* Chat Rules Reminder */}
                <p className="text-xs text-gray-400 text-center">
                    Be respectful and follow our{' '}
                    <button 
                        onClick={() => setShowChatRules(true)}
                        className="text-brand-primary hover:text-brand-secondary underline cursor-pointer"
                    >
                        chat rules
                    </button>
                </p>
            </div>

            {/* Chat Rules Modal */}
            {showChatRules && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowChatRules(false)}>
                    <div className="bg-dark-card rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-white">Chat Rules</h2>
                            <button
                                onClick={() => setShowChatRules(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-3 text-gray-300">
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">1.</span>
                                <p>Be respectful and courteous to all users</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">2.</span>
                                <p>No harassment, bullying, or hate speech</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">3.</span>
                                <p>No sharing of personal information (phone numbers, addresses, etc.)</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">4.</span>
                                <p>No spam, advertising, or promotional content</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">5.</span>
                                <p>No inappropriate or explicit content</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-brand-primary font-bold">6.</span>
                                <p>Report any violations using the report button</p>
                            </div>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowChatRules(false)}
                                className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Matchmaking Modal ---
const MatchmakingModal: React.FC<{ onCancel: () => void }> = ({ onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card rounded-2xl shadow-2xl p-8 text-center space-y-4 transform transition-all duration-300 animate-pulse">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-primary mx-auto"></div>
            <h2 className="text-2xl font-bold text-white">Searching for a match...</h2>
            <p className="text-dark-text-secondary">Please wait while we connect you with another student.</p>
            <button onClick={onCancel} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Cancel
            </button>
        </div>
    </div>
);

// --- Chat Room ---
const ChatRoom: React.FC<{ 
    chat: Chat;
    onLeave: () => void;
    showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}> = ({ chat, onLeave, showAlert }) => {
    const { currentUser, userProfile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showBlockSuccess, setShowBlockSuccess] = useState(false);
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [isPartnerViewingProfile, setIsPartnerViewingProfile] = useState(false);
    const [isPartnerSelectingGif, setIsPartnerSelectingGif] = useState(false);
    const [isPartnerOnline, setIsPartnerOnline] = useState(true);
    const [chatDuration, setChatDuration] = useState(0);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Fix: In a browser environment, setTimeout returns a number, not NodeJS.Timeout.
    const typingTimeoutRef = useRef<number | null>(null);
    const [localChat, setLocalChat] = useState<Chat>(chat);
    const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
    
    const partnerId = chat.participants.find(p => p !== currentUser?.uid);
    const partnerInfo = partnerId && chat.participantInfo?.[partnerId] 
        ? chat.participantInfo[partnerId] 
        : { username: 'User', isTyping: false, isViewingProfile: false };

    // Listen for chat document updates (to get startedAt when it becomes available)
    useEffect(() => {
        if (!chat.id) return;
        
        const unsubscribe = onSnapshot(doc(db, 'chats', chat.id), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedChat = { id: docSnapshot.id, ...docSnapshot.data() } as Chat;
                setLocalChat(updatedChat);
                
                // Calculate server time offset when we first get startedAt
                if (updatedChat.startedAt && typeof updatedChat.startedAt === 'object' && 'seconds' in updatedChat.startedAt && serverTimeOffset === 0) {
                    // Server time when chat started
                    const serverTime = updatedChat.startedAt.seconds * 1000;
                    // Calculate offset: server time - local time
                    const offset = serverTime - Date.now();
                    setServerTimeOffset(offset);
                    console.log('⏰ Server time offset:', offset, 'ms');
                }
            }
        });
        
        return () => unsubscribe();
    }, [chat.id, serverTimeOffset]);

    // Fetch partner profile
    useEffect(() => {
        if (!partnerId) return;
        const fetchPartnerProfile = async () => {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) {
                setPartnerProfile({ uid: partnerId, ...partnerDoc.data() } as UserProfile);
            }
        };
        fetchPartnerProfile();
    }, [partnerId]);

    useEffect(() => {
        if (!chat.id) return;
        const q = query(collection(db, `chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                setMessages(msgs);
            },
            (error) => {
                console.error('❌ Messages listener error:', error);
                // Chat might have been deleted
                onLeave();
            }
        );
        return () => unsubscribe();
    }, [chat.id, onLeave]);

    useEffect(() => {
        console.log('🔗 Setting up chat document listener for chat:', chat.id);
        
        const chatUnsub = onSnapshot(
            doc(db, 'chats', chat.id),
            (docSnapshot) => {
                console.log('📡 Chat document update - exists:', docSnapshot.exists());
                
                // Check if chat document still exists
                if (!docSnapshot.exists()) {
                    console.log('🚫 Chat document deleted - forcing leave');
                    onLeave();
                    return;
                }
                
                const chatData = docSnapshot.data() as Chat | undefined;
                if (!chatData || !partnerId) {
                    console.log('🚫 Chat data missing - forcing leave');
                    onLeave();
                    return;
                }
                
                console.log('✅ Chat still active, updating status');
                const partnerIsTyping = chatData.participantInfo?.[partnerId]?.isTyping ?? false;
                const partnerIsViewingProfile = chatData.participantInfo?.[partnerId]?.isViewingProfile ?? false;
                const partnerIsSelectingGif = chatData.participantInfo?.[partnerId]?.isSelectingGif ?? false;
                setIsPartnerTyping(partnerIsTyping);
                setIsPartnerViewingProfile(partnerIsViewingProfile);
                setIsPartnerSelectingGif(partnerIsSelectingGif);
            },
            (error) => {
                console.error('❌ Chat listener error:', error);
                // If there's an error (like permission denied after deletion), leave
                onLeave();
            }
        );

        return () => {
            console.log('🔌 Cleaning up chat document listener');
            chatUnsub();
        };
    }, [chat.id, partnerId, onLeave]);

    // Monitor partner's online status and auto-end chat if offline for 10 minutes
    useEffect(() => {
        if (!partnerId) return;

        const partnerRef = doc(db, 'users', partnerId);
        const unsubscribe = onSnapshot(partnerRef, async (docSnapshot) => {
            const partnerData = docSnapshot.data();
            
            if (partnerData) {
                // Update partner online status for UI
                setIsPartnerOnline(partnerData.isOnline || false);
                
                if (partnerData.lastSeen) {
                    const lastSeenTime = typeof partnerData.lastSeen === 'object' && 'seconds' in partnerData.lastSeen
                        ? partnerData.lastSeen.seconds * 1000
                        : new Date(partnerData.lastSeen).getTime();
                    
                    const now = Date.now();
                    const offlineTime = now - lastSeenTime;
                    const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds
                    
                    // If partner has been offline for more than 10 minutes, end the chat
                    if (!partnerData.isOnline && offlineTime > TEN_MINUTES) {
                        try {
                            // Send system message about chat ending
                            await addDoc(collection(db, `chats/${chat.id}/messages`), {
                                senderId: 'system',
                                content: 'Chat ended: Partner was offline for more than 10 minutes.',
                                type: 'system',
                                timestamp: serverTimestamp()
                            });

                            // Delete chat after a short delay
                            setTimeout(async () => {
                                const chatRef = doc(db, 'chats', chat.id);
                                const batch = writeBatch(db);

                                // Delete all messages
                                const messagesQuery = query(collection(db, `chats/${chat.id}/messages`));
                                const messagesSnapshot = await getDocs(messagesQuery);
                                messagesSnapshot.forEach(msgDoc => batch.delete(msgDoc.ref));

                                // Delete chat
                                batch.delete(chatRef);

                                // Update participants
                                chat.participants.forEach(uid => {
                                    batch.update(doc(db, 'users', uid), { currentChatId: null });
                                });

                                await batch.commit();
                                onLeave();
                            }, 3000); // 3 second delay to show the message
                        } catch (error) {
                            console.error('Error auto-ending chat:', error);
                        }
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [partnerId, chat.id, chat.participants, onLeave]);

    // Timer effect - calculate duration from server timestamp
    useEffect(() => {
        // Wait for startedAt to be fully resolved from server
        if (!localChat.startedAt || typeof localChat.startedAt !== 'object' || !('seconds' in localChat.startedAt)) {
            setChatDuration(0);
            return;
        }

        const startTimeMs = localChat.startedAt.seconds * 1000;
        
        const updateDuration = () => {
            // Use local time for display - it will be accurate enough
            // The startedAt timestamp is server-generated, so it's already accurate
            const now = Date.now();
            const durationSeconds = Math.floor((now - startTimeMs) / 1000);
            setChatDuration(Math.max(0, durationSeconds)); // Ensure never negative
        };
        
        // Update immediately
        updateDuration();
        
        // Then update every second
        const timer = setInterval(updateDuration, 1000);
        
        return () => clearInterval(timer);
    }, [localChat.startedAt]); // Remove serverTimeOffset dependency

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatMessageTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // If today, just show time
        if (diff < 86400000) { // 24 hours
            return timeStr;
        }
        // If yesterday
        if (diff < 172800000) { // 48 hours
            return `Yesterday ${timeStr}`;
        }
        // Otherwise show date
        return `${date.toLocaleDateString()} ${timeStr}`;
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const updateTypingStatus = async (isTyping: boolean) => {
      if (!currentUser?.uid) return;
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        [`participantInfo.${currentUser.uid}.isTyping`]: isTyping
      });
    };

    const updateViewingProfileStatus = async (isViewingProfile: boolean) => {
      if (!currentUser?.uid) return;
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        [`participantInfo.${currentUser.uid}.isViewingProfile`]: isViewingProfile
      });
    };

    const updateSelectingGifStatus = async (isSelectingGif: boolean) => {
      if (!currentUser?.uid) return;
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        [`participantInfo.${currentUser.uid}.isSelectingGif`]: isSelectingGif
      });
    };
    
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      if (!typingTimeoutRef.current) {
        updateTypingStatus(true);
      } else {
// Fix: Use window.clearTimeout to avoid type conflicts with NodeJS.Timeout
        window.clearTimeout(typingTimeoutRef.current);
      }
// Fix: Use window.setTimeout to avoid type conflicts with NodeJS.Timeout
      typingTimeoutRef.current = window.setTimeout(() => {
        updateTypingStatus(false);
        typingTimeoutRef.current = null;
      }, 2000);
    };

    const handleSendGif = async (gifUrl: string) => {
        if (!currentUser) return;
        
        const messageData = {
            senderId: currentUser.uid,
            type: 'gif' as const,
            content: gifUrl,
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(db, `chats/${chat.id}/messages`), messageData);
    };

    const handleReport = async (reason: string) => {
        if (!currentUser || !userProfile || !partnerId) {
            showAlert('Missing user information. Please try again.', 'error', 'Report Error');
            return;
        }

        if (messages.length === 0) {
            showAlert('No messages to report. Please wait for messages to load.', 'warning', 'No Messages');
            return;
        }

        try {
            // Get partner profile
            const partnerProfileSnap = await getDoc(doc(db, 'users', partnerId));
            if (!partnerProfileSnap.exists()) {
                showAlert('Unable to find partner profile.', 'error', 'Profile Not Found');
                return;
            }
            const partnerData = partnerProfileSnap.data();

            // Create report with all chat messages and participant info
            const reportData = {
                chatId: chat.id,
                reportedBy: currentUser.uid,
                reportedByName: userProfile.username,
                reportedUser: partnerId,
                reportedUserName: partnerData.username || 'Unknown',
                reason: reason,
                timestamp: serverTimestamp(),
                status: 'pending',
                // Convert messages with Firestore timestamps to plain objects
                messages: messages.map(m => ({
                    id: m.id,
                    senderId: m.senderId,
                    type: m.type,
                    content: m.content,
                    timestamp: m.timestamp || serverTimestamp()
                })),
                participantProfiles: {
                    [currentUser.uid]: {
                        uid: userProfile.uid || currentUser.uid,
                        username: userProfile.username || 'Unknown',
                        email: userProfile.email || 'unknown@email.com',
                        admissionNumber: userProfile.admissionNumber || 'N/A',
                        gender: userProfile.gender || 'other'
                    },
                    [partnerId]: {
                        uid: partnerId,
                        username: partnerData.username || 'Unknown',
                        email: partnerData.email || 'unknown@email.com',
                        admissionNumber: partnerData.admissionNumber || 'N/A',
                        gender: partnerData.gender || 'other'
                    }
                }
            };

            await addDoc(collection(db, 'reports'), reportData);
            setSuccessMessage('Report submitted successfully. An admin will review it soon.');
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Error submitting report:', error);
            showAlert(`Failed to submit report: ${error.message || 'Please try again.'}`, 'error', 'Report Failed');
        }
    };

    const handleOpenProfile = () => {
        setShowProfileModal(true);
        updateViewingProfileStatus(true);
    };

    const handleCloseProfile = () => {
        setShowProfileModal(false);
        updateViewingProfileStatus(false);
    };

    const handleBlockUser = async () => {
        if (!currentUser || !partnerId || !chat) return;
        
        try {
            console.log('🚫 Blocking user and disconnecting both users...');
            
            // Send system message that user was disconnected
            const disconnectMessage = {
                senderId: 'system',
                type: 'system' as const,
                content: 'User disconnected',
                timestamp: serverTimestamp(),
            };
            
            await addDoc(collection(db, `chats/${chat.id}/messages`), disconnectMessage);
            
            // Add partner to blocked list
            const userRef = doc(db, 'users', currentUser.uid);
            const currentBlockedUsers = userProfile?.blockedUsers || [];
            
            await updateDoc(userRef, {
                blockedUsers: [...currentBlockedUsers, partnerId]
            });

            console.log('✅ User blocked successfully');
            
            // Show in-page success notification
            setShowBlockSuccess(true);
            
            // Hide notification after 2 seconds
            setTimeout(() => {
                setShowBlockSuccess(false);
            }, 2000);
            
            // Immediately clear currentChatId for BOTH users to disconnect them instantly
            await Promise.all([
                updateDoc(doc(db, 'users', currentUser.uid), { currentChatId: null }),
                updateDoc(doc(db, 'users', partnerId), { currentChatId: null })
            ]);
            
            console.log('✅ Both users disconnected');
            
            // Trigger local leave to clean up UI after showing notification
            setTimeout(() => {
                onLeave();
            }, 2000);
            
        } catch (error: any) {
            console.error('Error blocking user:', error);
            showAlert('Failed to block user. Please try again.', 'error', 'Block Failed');
        }
    };

    const handleSelectEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;
        
        updateTypingStatus(false);
// Fix: Use window.clearTimeout to avoid type conflicts with NodeJS.Timeout
        if(typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);

        const messageData: any = {
            senderId: currentUser.uid,
            type: 'text' as const,
            content: newMessage,
            timestamp: serverTimestamp(),
        };

        // Add reply info if replying to a message
        if (replyingTo) {
            messageData.replyTo = {
                messageId: replyingTo.id,
                content: replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : ''),
                senderId: replyingTo.senderId
            };
        }

        await addDoc(collection(db, `chats/${chat.id}/messages`), messageData);
        setNewMessage('');
        setReplyingTo(null);
    };

    const handleLeaveClick = () => {
        setShowLeaveConfirmation(true);
    };

    const handleConfirmLeave = async () => {
        if (!currentUser) return;
        
        try {
            // Send disconnect message before leaving
            await addDoc(collection(db, `chats/${chat.id}/messages`), {
                senderId: 'system',
                content: `${userProfile?.username || 'User'} has disconnected from the chat.`,
                type: 'system',
                timestamp: serverTimestamp()
            });

            // Small delay to ensure message is sent
            setTimeout(() => {
                setShowLeaveConfirmation(false);
                onLeave();
            }, 500);
        } catch (error) {
            console.error('Error sending disconnect message:', error);
            // Still leave even if message fails
            setShowLeaveConfirmation(false);
            onLeave();
        }
    };
    
    return (
        <>
            {showProfileModal && partnerProfile && <ProfileModal profile={partnerProfile} onClose={handleCloseProfile} onBlock={handleBlockUser} />}
            <div className="flex flex-col h-full bg-dark-card rounded-2xl shadow-xl overflow-hidden">
                {/* Fixed Header */}
                <div className="p-4 bg-dark-surface flex justify-between items-center border-b border-dark-bg flex-shrink-0">
                <button 
                    onClick={handleOpenProfile}
                    className="flex items-center hover:bg-dark-bg/50 rounded-lg p-2 -ml-2 transition-colors group"
                >
                    {partnerProfile?.avatarUrl ? (
                        <img 
                            src={partnerProfile.avatarUrl} 
                            alt="Partner" 
                            className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover mr-3"
                        />
                    ) : (
                        <div className={`w-10 h-10 ${
                            ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][
                                (partnerId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 8
                            ]
                        } rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-brand-primary mr-3`}>
                            {partnerInfo.username.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div className="text-left">
                        <h2 className="font-bold text-white group-hover:text-brand-primary transition-colors">{partnerInfo.username}</h2>
                         <div className={`flex items-center text-xs ${
                           isPartnerSelectingGif ? 'text-yellow-400' : isPartnerViewingProfile ? 'text-purple-400' : isPartnerOnline ? 'text-green-400' : 'text-gray-500'
                         }`}>
                           <div className={`h-2 w-2 ${
                             isPartnerSelectingGif ? 'bg-yellow-400' : isPartnerViewingProfile ? 'bg-purple-400' : isPartnerOnline ? 'bg-green-400' : 'bg-gray-500'
                           } rounded-full mr-1.5`}></div> 
                           {isPartnerSelectingGif ? 'Selecting GIF...' : isPartnerViewingProfile ? 'Viewing Profile' : isPartnerOnline ? 'Online' : 'Offline'}
                        </div>
                    </div>
                </button>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-sm text-dark-text-secondary"><Clock size={16} className="mr-1.5"/>{formatDuration(chatDuration)}</div>
                  <button 
                    onClick={() => setShowReportModal(true)} 
                    className="bg-dark-bg hover:bg-red-500/20 text-dark-text-secondary hover:text-red-500 p-2 rounded-lg transition-colors"
                    title="Report User"
                  >
                    <Flag size={18} />
                  </button>
                  <button onClick={handleLeaveClick} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">Leave Chat</button>
                </div>
            </div>
            {showLeaveConfirmation && <LeaveConfirmationModal onConfirm={handleConfirmLeave} onCancel={() => setShowLeaveConfirmation(false)} />}
            {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} onSubmit={handleReport} />}
            {showSuccessModal && <SuccessModal message={successMessage} onClose={() => setShowSuccessModal(false)} />}
            
            {/* Scrollable Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
                {messages.map((msg, index) => (
                    msg.type === 'system' ? (
                        <div key={msg.id} className="flex justify-center">
                            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-lg text-sm text-center max-w-md">
                                <AlertTriangle size={14} className="inline mr-1.5" />
                                {msg.content}
                            </div>
                        </div>
                    ) : (
                        <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'} group`}>
                            <div className="relative flex items-end gap-2">
                                {/* Reply Button */}
                                <button
                                    onClick={() => setReplyingTo(msg)}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-dark-bg/80 hover:bg-dark-surface text-dark-text-secondary hover:text-brand-primary ${msg.senderId === currentUser?.uid ? 'order-first' : 'order-last'}`}
                                    title="Reply"
                                >
                                    <CornerDownLeft size={14} />
                                </button>
                                
                                <div>
                                    <div 
                                        className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser?.uid ? 'bg-brand-primary text-white rounded-br-none' : 'bg-dark-surface text-dark-text-primary rounded-bl-none'}`}
                                        title={formatMessageTime(msg.timestamp)}
                                    >
                                        {/* Show replied message if this is a reply */}
                                        {msg.replyTo && (
                                            <div className={`mb-2 pb-2 border-l-2 pl-2 text-xs opacity-70 ${msg.senderId === currentUser?.uid ? 'border-white/50' : 'border-brand-primary'}`}>
                                                <div className="font-semibold">{msg.replyTo.senderId === currentUser?.uid ? 'You' : partnerInfo.username}</div>
                                                <div className="truncate">{msg.replyTo.content}</div>
                                            </div>
                                        )}
                                        
                                        {msg.type === 'image' ? (
                                            <img src={msg.content} alt="chat attachment" className="rounded-lg max-h-64 cursor-pointer" onClick={() => window.open(msg.content, '_blank')} />
                                        ) : msg.type === 'gif' ? (
                                            <img src={msg.content} alt="GIF" className="rounded-lg max-h-48 cursor-pointer" onClick={() => window.open(msg.content, '_blank')} />
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-5 text-[10px] text-dark-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ${msg.senderId === currentUser?.uid ? 'right-0' : 'left-0'}`}>
                                        {formatMessageTime(msg.timestamp)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ))}
                 {isPartnerTyping && (
                    <div className="flex justify-start">
                        <div className="bg-dark-surface text-dark-text-primary rounded-2xl rounded-bl-none p-3">
                            <div className="flex items-center space-x-1">
                               <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                               <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                               <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {/* Fixed Input Area */}
            <div className="bg-dark-surface border-t border-dark-bg relative flex-shrink-0">
                {showGifPicker && <GifPicker onSelectGif={handleSendGif} onClose={() => {setShowGifPicker(false); setShowEmojiPicker(false); updateSelectingGifStatus(false);}} />}
                {showEmojiPicker && <EmojiPicker onSelectEmoji={handleSelectEmoji} onClose={() => {setShowEmojiPicker(false); setShowGifPicker(false);}} />}
                
                {/* Reply Preview */}
                {replyingTo && (
                    <div className="px-4 pt-3 pb-2 bg-dark-bg/50 border-b border-dark-surface flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <CornerDownLeft size={16} className="text-brand-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-brand-primary font-semibold">
                                    Replying to {replyingTo.senderId === currentUser?.uid ? 'yourself' : partnerInfo.username}
                                </div>
                                <div className="text-xs text-dark-text-secondary truncate">
                                    {replyingTo.content}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="text-dark-text-secondary hover:text-white transition-colors p-1"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-2">
                    <button 
                        type="button" 
                        onClick={() => {
                            const newState = !showGifPicker;
                            setShowGifPicker(newState);
                            setShowEmojiPicker(false);
                            updateSelectingGifStatus(newState);
                        }} 
                        className={`px-3 py-2 rounded-lg transition-all font-bold text-xs border flex-shrink-0 ${showGifPicker ? 'bg-brand-primary text-white border-brand-primary' : 'bg-dark-bg hover:bg-brand-primary/20 text-dark-text-secondary hover:text-brand-primary border-dark-surface hover:border-brand-primary'}`}
                        title="Send GIF"
                    >
                        GIF
                    </button>
                    <div className="flex-1 flex items-center bg-dark-bg rounded-full border border-dark-surface focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-transparent min-w-0">
                        <button 
                            type="button" 
                            onClick={() => {setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false);}} 
                            className={`p-2 ml-2 transition-colors flex-shrink-0 ${showEmojiPicker ? 'text-brand-primary' : 'text-dark-text-secondary hover:text-brand-primary'}`}
                            title="Emoji"
                        >
                            <Smile size={20} />
                        </button>
                        <input 
                            type="text" 
                            value={newMessage} 
                            onChange={handleTyping} 
                            placeholder="Type a message..." 
                            className="flex-1 bg-transparent text-white p-3 px-3 focus:outline-none placeholder-dark-text-secondary min-w-0" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="bg-brand-primary text-white p-3 rounded-full hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0" 
                        disabled={!newMessage.trim()}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
            </div>

            {/* Block Success Notification */}
            {showBlockSuccess && ReactDOM.createPortal(
                <div className="fixed inset-0 flex items-center justify-center z-[300] pointer-events-none">
                    <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-fade-in pointer-events-auto border-2 border-green-400">
                        <Shield className="w-6 h-6" />
                        <div>
                            <p className="font-bold text-lg">User Blocked Successfully</p>
                            <p className="text-sm text-green-100">You won't be matched with this user again</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

// --- Main Chat Page Component ---
const ChatPage: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [isMatching, setIsMatching] = useState(false);
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [interestSearchTimeout] = useState<number>(
        parseInt(localStorage.getItem('interestSearchTimeout') || '30')
    );
    const [alertConfig, setAlertConfig] = useState<{
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        title?: string;
    }>({ message: '', type: 'info' });
    const justLeftChatRef = useRef(false);
    
    // � New Match Proposal System
    const [currentProposal, setCurrentProposal] = useState<MatchProposal | null>(null);
    const [showMatchFoundModal, setShowMatchFoundModal] = useState(false);
    const proposalListenerRef = useRef<(() => void) | null>(null);
    const matchmakingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Helper function to show alert modal
    const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
        setAlertConfig({ message, type, title });
        setShowAlertModal(true);
    };

    // Real-time listener for admin warnings
    useEffect(() => {
        if (!currentUser) return;
        
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
            const userData = docSnapshot.data();
            if (userData?.warningMessage) {
                setWarningMessage(userData.warningMessage);
                setShowWarningModal(true);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Handle warning acknowledgment
    const handleAcknowledgeWarning = async () => {
        if (!currentUser) return;
        
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                warningMessage: null,
                warningTimestamp: null
            });
            setShowWarningModal(false);
            setWarningMessage('');
        } catch (error) {
            console.error('Error clearing warning:', error);
        }
    };
    
    // � Real-time match proposal listener
    useEffect(() => {
        if (!currentUser) return;
        
        const proposalsQuery = query(
            collection(db, 'matchProposals'),
            where('status', '==', 'pending')
        );
        
        const unsubscribe = onSnapshot(proposalsQuery, async (snapshot) => {
            for (const doc of snapshot.docs) {
                const proposal = { id: doc.id, ...doc.data() } as MatchProposal;
                
                // Check if this proposal involves current user
                if (proposal.user1Id === currentUser.uid || proposal.user2Id === currentUser.uid) {
                    setCurrentProposal(proposal);
                    setShowMatchFoundModal(true);
                    
                    // If both confirmed, create chat
                    if (proposal.user1Confirmed && proposal.user2Confirmed && !proposal.chatId) {
                        await handleBothConfirmed(proposal);
                    }
                    
                    // Check for expiration
                    const now = Date.now();
                    const expiresAt = proposal.expiresAt.toMillis();
                    if (now > expiresAt && proposal.status === 'pending') {
                        await handleProposalExpired(proposal);
                    }
                    
                    return; // Only handle one proposal at a time
                }
            }
            
            // No active proposal
            setCurrentProposal(null);
            setShowMatchFoundModal(false);
        });
        
        proposalListenerRef.current = unsubscribe;
        return () => unsubscribe();
    }, [currentUser]);
    
    // Cleanup expired proposals
    useEffect(() => {
        if (!currentUser) return;
        
        const cleanupInterval = setInterval(async () => {
            try {
                const now = Timestamp.now();
                const proposalsSnapshot = await getDocs(
                    query(
                        collection(db, 'matchProposals'),
                        where('status', '==', 'pending')
                    )
                );
                
                for (const proposalDoc of proposalsSnapshot.docs) {
                    const proposal = proposalDoc.data() as MatchProposal;
                    if (proposal.expiresAt.seconds < now.seconds) {
                        console.log('🗑️ Deleting expired proposal:', proposalDoc.id);
                        await deleteDoc(doc(db, 'matchProposals', proposalDoc.id));
                    }
                }
            } catch (error) {
                console.error('Error cleaning up proposals:', error);
            }
        }, 30000); // Check every 30 seconds
        
        return () => clearInterval(cleanupInterval);
    }, [currentUser]);

    // Set user presence with heartbeat
    useEffect(() => {
        if (!currentUser) return;
        const userStatusRef = doc(db, 'users', currentUser.uid);
        
        // Set online immediately
        updateDoc(userStatusRef, { 
            isOnline: true,
            lastSeen: serverTimestamp()
        });
        
        // Update lastSeen every 30 seconds as heartbeat
        const heartbeatInterval = setInterval(() => {
            updateDoc(userStatusRef, { 
                isOnline: true,
                lastSeen: serverTimestamp()
            });
        }, 30000); // 30 seconds
        
        // Handle tab close/browser close
        const handleBeforeUnload = () => {
            // Use navigator.sendBeacon for reliable offline status update
            const data = JSON.stringify({ isOnline: false, lastSeen: Date.now() });
            navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/users/${currentUser.uid}`, data);
            
            // Fallback to updateDoc (may not always complete)
            updateDoc(userStatusRef, { 
                isOnline: false, 
                lastSeen: serverTimestamp()
            });
        };
        
        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                updateDoc(userStatusRef, { 
                    isOnline: false,
                    lastSeen: serverTimestamp()
                });
            } else {
                updateDoc(userStatusRef, { 
                    isOnline: true,
                    lastSeen: serverTimestamp()
                });
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(heartbeatInterval);
            updateDoc(userStatusRef, { 
                isOnline: false,
                lastSeen: serverTimestamp()
            });
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [currentUser]);

    // Monitor chat partner's activity and auto-close if offline > 5 minutes
    useEffect(() => {
        if (!currentChat || !currentUser) return;

        console.log('⏰ Setting up partner activity monitor for chat:', currentChat.id);

        // Get partner's ID
        const partnerId = currentChat.participants.find(id => id !== currentUser.uid);
        if (!partnerId) return;

        let offlineSince: number | null = null; // Track when partner went offline
        let timeoutId: NodeJS.Timeout | null = null;

        // Monitor partner's presence in real-time
        const partnerRef = doc(db, 'users', partnerId);
        const unsubscribe = onSnapshot(partnerRef, (partnerDoc) => {
            const partnerData = partnerDoc.data();
            
            if (!partnerData) {
                console.log('⚠️ Partner data not found');
                return;
            }

            const isOnline = partnerData.isOnline;
            console.log(`👤 Partner status changed: ${isOnline ? 'online' : 'offline'}`);

            if (!isOnline) {
                // Partner just went offline or is still offline
                if (offlineSince === null) {
                    // Record the time partner went offline
                    offlineSince = Date.now();
                    console.log(`⏰ Partner went offline at ${new Date(offlineSince).toLocaleTimeString()}`);
                    
                    // Set timeout to close chat after 5 minutes
                    timeoutId = setTimeout(() => {
                        const minutesOffline = (Date.now() - offlineSince!) / (1000 * 60);
                        console.log(`⏱️ Partner offline for ${minutesOffline.toFixed(1)} minutes, auto-closing chat...`);
                        handlePartnerTimeout(partnerData.username || 'Your chat partner');
                    }, 5 * 60 * 1000); // 5 minutes in milliseconds
                }
            } else {
                // Partner came back online - cancel timeout
                if (offlineSince !== null) {
                    const minutesWasOffline = (Date.now() - offlineSince) / (1000 * 60);
                    console.log(`✅ Partner came back online after ${minutesWasOffline.toFixed(1)} minutes`);
                    offlineSince = null;
                    
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                        console.log('🔄 Timeout cancelled - partner reconnected');
                    }
                }
            }
        });

        return () => {
            console.log('🔌 Cleaning up partner activity monitor');
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            unsubscribe();
        };
    }, [currentChat, currentUser]);

    // Handle partner timeout (auto-close chat)
    const handlePartnerTimeout = async (partnerName: string) => {
        if (!currentUser || !currentChat) return;

        console.log('🚪 Auto-closing chat due to partner timeout');

        try {
            // Show notification to user
            showAlert(`${partnerName} has been offline for more than 5 minutes. The chat has been closed automatically.`, 'info', 'Chat Closed');

            // Clear currentChatId for current user
            await updateDoc(doc(db, 'users', currentUser.uid), { currentChatId: null });

            // Clear chat state
            setCurrentChat(null);

            // Optionally: Clean up the chat document
            // Note: We don't delete messages here as the partner might return
            // The chat will be cleaned up when they try to reconnect or by admin
        } catch (error) {
            console.error('❌ Error handling partner timeout:', error);
        }
    };

    // Listen for chat invitations
    useEffect(() => {
        if (!userProfile) return;
        
// Fix: Renamed `doc` to `userDoc` to avoid shadowing the imported `doc` function.
        const unsub = onSnapshot(doc(db, 'users', userProfile.uid), async (userDoc) => {
// Fix: Safely access data, as userDoc.data() can be undefined.
            const data = userDoc.data();
            
            if (data?.currentChatId && data.currentChatId !== currentChat?.id) {
                // Prevent reconnecting if user just left
                if (justLeftChatRef.current) {
                    // Force clear the currentChatId to prevent reconnection
                    await updateDoc(doc(db, 'users', userProfile.uid), { currentChatId: null });
                    justLeftChatRef.current = false;
                    return;
                }
                
                const chatDoc = await getDoc(doc(db, 'chats', data.currentChatId));
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    
                    // Validate chat has required fields
                    if (!chatData.participantInfo || !chatData.participants) {
                        console.log('⚠️ Broken chat detected, clearing...');
                        // Delete broken chat and clear currentChatId
                        await deleteDoc(doc(db, 'chats', data.currentChatId));
                        await updateDoc(doc(db, 'users', userProfile.uid), { currentChatId: null });
                        return;
                    }
                    
// Fix: The spread of chatDoc.data() is now safe.
                    setCurrentChat({ id: chatDoc.id, ...chatData } as Chat);
                    setIsMatching(false);
                } else {
                    // If chat doesn't exist, clear the currentChatId
                    await updateDoc(doc(db, 'users', userProfile.uid), { currentChatId: null });
                }
            } else if (!data?.currentChatId && currentChat) {
                // Only clear current chat if we actually have one
                // Don't interfere if user is just on dashboard (no chat)
                setCurrentChat(null);
                justLeftChatRef.current = false;
            }
        });
        return () => {
            unsub();
        };
    }, [userProfile, currentChat?.id, currentChat]);
    
    // ===== 🎯 NEW MATCHMAKING HELPER FUNCTIONS =====
    
    // Calculate match score between two users
    const calculateMatchScore = (user1: QueueEntry, user2: QueueEntry): number => {
        let score = 0;
        
        // Find shared interests
        const sharedInterests = user1.interests.filter(interest =>
            user2.interests.includes(interest)
        );
        
        // Check if either user has interests
        const user1HasInterests = user1.interests.length > 0;
        const user2HasInterests = user2.interests.length > 0;
        const bothHaveInterests = user1HasInterests && user2HasInterests;
        
        // Check mutual gender compatibility
        const user1WantsUser2 = user1.seeking === user2.userGender || user1.seeking === 'any';
        const user2WantsUser1 = user2.seeking === user1.userGender || user2.seeking === 'any';
        const mutualGenderMatch = user1WantsUser2 && user2WantsUser1;
        
        // NEW PRIORITY SYSTEM:
        // 1. Gender + Has interests (highest) = 100+ points
        // 2. Gender only (medium) = 30 points
        // 3. Any match (lowest) = 10 points
        
        // HIGHEST PRIORITY: Shared interests + Mutual gender match
        if (sharedInterests.length > 0 && mutualGenderMatch) {
            score += 150; // Shared interests is best
            score += sharedInterests.length * 50; // More shared interests = even higher
        }
        // HIGH PRIORITY: Both have interests (even if different) + Gender match
        else if (bothHaveInterests && mutualGenderMatch) {
            score += 100; // Both have interests + gender match
        }
        // MEDIUM PRIORITY: Gender match only (no interests or only one has interests)
        else if (mutualGenderMatch) {
            score += 30; // Gender match alone
        }
        // LOWEST PRIORITY: Compatible but not gender match
        else {
            score += 10; // Any compatible match
        }
        
        // Gender filter users get additional priority
        if (user1.usesGenderFilter || user2.usesGenderFilter) {
            score += 20;
        }
        
        // FIFO: Earlier timestamp = higher priority (1 point per second waited)
        const avgQueueTime = (user1.queuedAt + user2.queuedAt) / 2;
        const waitTime = Date.now() - avgQueueTime;
        score += waitTime / 1000; // +1 point per second
        
        return score;
    };
    
    // Handle when both users confirm the match
    const handleBothConfirmed = async (proposal: MatchProposal) => {
        if (!currentUser || !userProfile) return;
        
        try {
            console.log('✅ Both users confirmed! Creating chat...');
            
            const batch = writeBatch(db);
            const chatRef = doc(collection(db, 'chats'));
            
            // Get both user profiles
            const user1Profile = await getDoc(doc(db, 'users', proposal.user1Id));
            const user2Profile = await getDoc(doc(db, 'users', proposal.user2Id));
            
            if (!user1Profile.exists() || !user2Profile.exists()) {
                throw new Error('User profiles not found');
            }
            
            const user1Data = user1Profile.data() as UserProfile;
            const user2Data = user2Profile.data() as UserProfile;
            
            // Create chat
            batch.set(chatRef, {
                participants: [proposal.user1Id, proposal.user2Id],
                participantInfo: {
                    [proposal.user1Id]: {
                        username: user1Data.username,
                        bio: user1Data.bio || '',
                        interests: user1Data.interests || []
                    },
                    [proposal.user2Id]: {
                        username: user2Data.username,
                        bio: user2Data.bio || '',
                        interests: user2Data.interests || []
                    }
                },
                startedAt: serverTimestamp(),
                lastMessage: null,
                lastMessageTimestamp: null
            });
            
            // Deduct coins for user1 if they used filter
            if (proposal.user1UsedFilter) {
                const user1Coins = user1Data.coins ?? 0;
                const user1Spent = user1Data.lifetimeCoinsSpent ?? 0;
                
                batch.update(doc(db, 'users', proposal.user1Id), {
                    coins: user1Coins - 1,
                    lifetimeCoinsSpent: user1Spent + 1,
                    currentChatId: chatRef.id
                });
                
                // Transaction log
                const transaction1Ref = doc(collection(db, 'coinTransactions'));
                batch.set(transaction1Ref, {
                    userId: proposal.user1Id,
                    amount: -1,
                    type: 'matchmaking_gender_filter',
                    timestamp: serverTimestamp(),
                    balanceAfter: user1Coins - 1,
                    chatId: chatRef.id,
                    proposalId: proposal.id
                });
            } else {
                batch.update(doc(db, 'users', proposal.user1Id), {
                    currentChatId: chatRef.id
                });
            }
            
            // Deduct coins for user2 if they used filter
            if (proposal.user2UsedFilter) {
                const user2Coins = user2Data.coins ?? 0;
                const user2Spent = user2Data.lifetimeCoinsSpent ?? 0;
                
                batch.update(doc(db, 'users', proposal.user2Id), {
                    coins: user2Coins - 1,
                    lifetimeCoinsSpent: user2Spent + 1,
                    currentChatId: chatRef.id
                });
                
                // Transaction log
                const transaction2Ref = doc(collection(db, 'coinTransactions'));
                batch.set(transaction2Ref, {
                    userId: proposal.user2Id,
                    amount: -1,
                    type: 'matchmaking_gender_filter',
                    timestamp: serverTimestamp(),
                    balanceAfter: user2Coins - 1,
                    chatId: chatRef.id,
                    proposalId: proposal.id
                });
            } else {
                batch.update(doc(db, 'users', proposal.user2Id), {
                    currentChatId: chatRef.id
                });
            }
            
            // Update proposal status
            batch.update(doc(db, 'matchProposals', proposal.id!), {
                status: 'accepted',
                chatId: chatRef.id
            });
            
            // Delete both users from queue
            batch.delete(doc(db, 'matchmakingQueue', proposal.user1Id));
            batch.delete(doc(db, 'matchmakingQueue', proposal.user2Id));
            
            await batch.commit();
            
            console.log('🎉 Chat created successfully!', chatRef.id);
            
            // Delete proposal after successful match
            setTimeout(async () => {
                await deleteDoc(doc(db, 'matchProposals', proposal.id!));
                setCurrentProposal(null);
                setShowMatchFoundModal(false);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error creating chat:', error);
            await handleProposalExpired(proposal);
        }
    };
    
    // Handle proposal expiration or decline
    const handleProposalExpired = async (proposal: MatchProposal) => {
        try {
            console.log('⏱️ Proposal expired/declined, returning users to queue');
            
            // Delete proposal
            await deleteDoc(doc(db, 'matchProposals', proposal.id!));
            
            // Users remain in queue and will be matched again
            // They don't need to manually restart - the queue listener will find new matches
            setCurrentProposal(null);
            setShowMatchFoundModal(false);
            setIsMatching(true); // Keep matching indicator on
            
        } catch (error) {
            console.error('Error handling expired proposal:', error);
        }
    };
    
    // Confirm match acceptance
    const handleConfirmMatch = async () => {
        if (!currentProposal || !currentUser) return;
        
        try {
            const isUser1 = currentProposal.user1Id === currentUser.uid;
            const updateField = isUser1 ? 'user1Confirmed' : 'user2Confirmed';
            
            await updateDoc(doc(db, 'matchProposals', currentProposal.id!), {
                [updateField]: true
            });
            
            console.log('✅ Confirmed match');
            
        } catch (error) {
            console.error('Error confirming match:', error);
        }
    };
    
    // Decline match
    const handleDeclineMatch = async () => {
        if (!currentProposal) return;
        
        try {
            await updateDoc(doc(db, 'matchProposals', currentProposal.id!), {
                status: 'declined'
            });
            
            await handleProposalExpired(currentProposal);
            
        } catch (error) {
            console.error('Error declining match:', error);
        }
    };
    
    // ===== 🎯 HELPER: CREATE INSTANT MATCH =====
    
    const createInstantMatch = async (
        bestMatch: { candidate: any; score: number },
        currentUserId: string,
        userProfile: any,
        needsGenderFilter: boolean
    ) => {
        try {
            const chatId = `${currentUserId}_${bestMatch.candidate.userId}_${Date.now()}`;
            console.log('🔗 Creating instant match:', chatId);
            
            // Fetch partner username
            const partnerDoc = await getDoc(doc(db, 'users', bestMatch.candidate.userId));
            const partnerUsername = partnerDoc.exists() ? partnerDoc.data().username : 'User';
            
            // Create chat document with participantInfo
            await setDoc(doc(db, 'chats', chatId), {
                participants: [currentUserId, bestMatch.candidate.userId],
                participantInfo: {
                    [currentUserId]: { 
                        username: userProfile.username, 
                        isTyping: false, 
                        isViewingProfile: false 
                    },
                    [bestMatch.candidate.userId]: { 
                        username: partnerUsername, 
                        isTyping: false, 
                        isViewingProfile: false 
                    }
                },
                createdAt: Timestamp.now(),
                startedAt: Timestamp.now(),
                lastMessage: '',
                lastMessageTime: Timestamp.now()
            });
            
            console.log('✅ Chat created with participantInfo');
            
            // Deduct coins if gender filter was used (for BOTH users)
            if (needsGenderFilter) {
                // Deduct coin from current user
                await updateDoc(doc(db, 'users', currentUserId), {
                    coins: increment(-1)
                });
                console.log('💰 Deducted 1 coin from current user');
                
                // Deduct coin from partner (if they also used filter)
                if (bestMatch.candidate.seeking !== 'any') {
                    await updateDoc(doc(db, 'users', bestMatch.candidate.userId), {
                        coins: increment(-1)
                    });
                    console.log('💰 Deducted 1 coin from partner');
                }
            }
            
            // Update BOTH users with currentChatId (critical for race condition fix)
            await updateDoc(doc(db, 'users', currentUserId), {
                currentChatId: chatId
            });
            await updateDoc(doc(db, 'users', bestMatch.candidate.userId), {
                currentChatId: chatId
            });
            console.log('✅ Both users updated with currentChatId');
            
            // Remove both users from matchmaking queue
            await deleteDoc(doc(db, 'matchmakingQueue', currentUserId));
            await deleteDoc(doc(db, 'matchmakingQueue', bestMatch.candidate.userId));
            console.log('🧹 Removed both users from queue');
            
        } catch (error) {
            console.error('❌ Error creating instant match:', error);
            throw error;
        }
    };
    
    // ===== 🎯 MAIN MATCHMAKING FUNCTION =====
    
    const handleStartChat = async (preference: GenderPreference, useCoin: boolean = false, interests: string[] = [], searchTimeout: number = 30) => {
        // Read FRESH timeout from localStorage (in case user just changed it in Settings)
        const latestTimeout = parseInt(localStorage.getItem('interestSearchTimeout') || '30');
        console.log(`📊 Using timeout: ${latestTimeout}s (localStorage value, ignoring passed ${searchTimeout}s)`);
        
        try {
            if (!currentUser || !userProfile) {
                console.log('❌ No currentUser or userProfile');
                return;
            }
            
            // Clean up old queue entry
            try {
                await deleteDoc(doc(db, 'matchmakingQueue', currentUser.uid));
                console.log('🧹 Cleaned up old queue entry');
            } catch (error) {
                // Ignore if doesn't exist
            }
            
            // Check coin requirement
            const needsGenderFilter = preference !== 'any';
            const hasCoins = (userProfile.coins ?? 0) >= 1;
            
            if (needsGenderFilter && !hasCoins) {
                showAlert('Not enough coins! Please buy coins to use gender filter.', 'error');
                return;
            }
            
            console.log('🎯 Starting smart matchmaking:', {
                userId: currentUser.uid,
                gender: userProfile.gender,
                seeking: preference,
                interests,
                usesFilter: needsGenderFilter
            });
            
            setIsMatching(true);
            
            // Step 1: Find all compatible users in queue
            const queueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
            const candidates: (QueueEntry & { doc: any })[] = [];
            
            console.log(`🔍 Scanning queue... Total entries: ${queueSnapshot.docs.length}`);
            
            for (const queueDoc of queueSnapshot.docs) {
                if (queueDoc.id === currentUser.uid) continue; // Skip self
                
                const candidate = queueDoc.data() as QueueEntry;
                
                console.log(`👤 Checking candidate:`, {
                    userId: candidate.userId,
                    gender: candidate.userGender,
                    seeking: candidate.seeking,
                    interests: candidate.interests
                });
                
                // Check basic compatibility
                const theyWantMe = candidate.seeking === userProfile.gender || candidate.seeking === 'any';
                const iWantThem = preference === candidate.userGender || preference === 'any';
                
                console.log(`🔍 Compatibility check:`, {
                    theyWantMe,
                    iWantThem,
                    myGender: userProfile.gender,
                    mySeeking: preference,
                    theirGender: candidate.userGender,
                    theySeeking: candidate.seeking
                });
                
                if (theyWantMe && iWantThem) {
                    candidates.push({ ...candidate, doc: queueDoc });
                    console.log(`✅ Compatible! Added to candidates`);
                } else {
                    console.log(`❌ Not compatible, skipping`);
                }
            }
            
            console.log(`📊 Found ${candidates.length} compatible candidates`);
            
            // Step 2: Score all candidates
            const myQueueEntry: QueueEntry = {
                userId: currentUser.uid,
                userGender: userProfile.gender,
                seeking: preference,
                interests: interests.length > 0 ? interests : (userProfile.interests || []),
                usesGenderFilter: needsGenderFilter,
                timestamp: Timestamp.now(),
                queuedAt: Date.now()
            };
            
            const scoredCandidates = candidates.map(candidate => ({
                candidate,
                score: calculateMatchScore(myQueueEntry, candidate)
            }));
            
            // Sort by score (highest first)
            scoredCandidates.sort((a, b) => b.score - a.score);
            
            // Step 3: Smart delayed matching - wait for better matches
            // ONLY use the configured searchTimeout if user has interests selected
            // If no interests, use longer default (60 seconds) to find any compatible match
            const hasInterests = interests.length > 0 || (userProfile.interests && userProfile.interests.length > 0);
            const MATCH_WAIT_TIME = hasInterests ? latestTimeout : 60; // User-configured time if interests, otherwise 60s default
            
            console.log(`⏱️ Match wait time: ${MATCH_WAIT_TIME}s (hasInterests: ${hasInterests}, latestTimeout: ${latestTimeout})`);
            
            if (scoredCandidates.length > 0) {
                const bestMatch = scoredCandidates[0];
                console.log(`✨ Best match found! Score: ${bestMatch.score.toFixed(2)}`, bestMatch.candidate);
                
                // SPECIAL CASE: If BOTH users have NO interests, check if we should connect immediately
                // Connect immediately ONLY if no priority users (with interests) would get a GOOD match with us
                // This allows no-interest users to connect quickly without blocking interest-based matches
                const myHasInterests = myQueueEntry.interests.length > 0;
                const theirHasInterests = bestMatch.candidate.interests.length > 0;
                
                if (!myHasInterests && !theirHasInterests) {
                    console.log(`⚡ Both users have no interests - checking if any priority user would prefer us...`);
                    
                    // Check if any users WITH interests would get a high-priority match with us
                    const queueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
                    let shouldWaitForPriorityUsers = false;
                    
                    for (const queueDoc of queueSnapshot.docs) {
                        if (queueDoc.id === currentUser.uid || queueDoc.id === bestMatch.candidate.userId) {
                            continue; // Skip ourselves and our match
                        }
                        const queueUser = queueDoc.data() as QueueEntry;
                        
                        // Only check users WITH interests (priority users)
                        if (queueUser.interests && queueUser.interests.length > 0) {
                            // Calculate what score they would get with us
                            const potentialScore = calculateMatchScore(queueUser, myQueueEntry);
                            
                            // If they would get a score > 50 with us, we should wait for them
                            // (50 = shared interests or mutual gender + filters)
                            // Since we have no interests, score will only be ~30 (gender match)
                            // So they won't prefer us - we can connect!
                            if (potentialScore > 50) {
                                console.log(`⏳ Found priority user who would get good score (${potentialScore}) with us`);
                                shouldWaitForPriorityUsers = true;
                                break;
                            }
                        }
                    }
                    
                    if (shouldWaitForPriorityUsers) {
                        console.log(`⏳ Waiting for priority users who could get good matches with us...`);
                        // Fall through to normal queue logic
                    } else {
                        console.log(`✅ No priority users would prefer us - connecting immediately!`);
                        
                        // Use queue priority to avoid race condition
                        const myQueuedAt = Date.now();
                        const theirQueuedAt = bestMatch.candidate.queuedAt || 0;
                        
                        let shouldConnect = false;
                        if (myQueuedAt < theirQueuedAt) {
                            shouldConnect = true;
                        } else if (myQueuedAt > theirQueuedAt) {
                            shouldConnect = false;
                        } else {
                            shouldConnect = currentUser.uid < bestMatch.candidate.userId;
                        }
                        
                        if (shouldConnect) {
                            console.log(`⚡ Connecting immediately (no-interest match, no priority conflict)!`);
                            try {
                                await createInstantMatch(bestMatch, currentUser.uid, userProfile, needsGenderFilter);
                                console.log('✅ Successfully connected!');
                                setIsMatching(false);
                            } catch (error) {
                                console.error('❌ Failed to create match:', error);
                                setIsMatching(false);
                                showAlert('Failed to connect. Please try again.', 'error');
                            }
                            return;
                        } else {
                            console.log(`⏳ Partner joined first, waiting for them to connect us...`);
                            // Fall through to queue
                        }
                    }
                }
                
                // Store our queue join time BEFORE adding to queue
                const myQueuedAt = Date.now();
                
                // Add to queue first (so others can find us while we wait)
                await setDoc(doc(db, 'matchmakingQueue', currentUser.uid), {
                    userId: currentUser.uid,
                    userGender: userProfile.gender,
                    seeking: preference,
                    interests: interests.length > 0 ? interests : (userProfile.interests || []),
                    usesGenderFilter: needsGenderFilter,
                    timestamp: serverTimestamp(),
                    queuedAt: myQueuedAt
                });
                
                // Wait for configured time to see if better match appears
                let waitTimeRemaining = MATCH_WAIT_TIME;
                let currentBestMatch = bestMatch;
                let timeoutHandled = false; // Flag to prevent re-entering timeout logic
                let postTimeoutWaitCount = 0; // Track how long we wait after timeout for available match
                const MAX_POST_TIMEOUT_WAIT = 10; // Wait max 10 more seconds after timeout
                
                const waitInterval = setInterval(async () => {
                    waitTimeRemaining--;
                    console.log(`⏳ Waiting for better match... ${waitTimeRemaining}s remaining`);
                    
                    // Check if someone already matched with us
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists() && userDoc.data()?.currentChatId) {
                        console.log('✅ Matched by another user during wait!');
                        clearInterval(waitInterval);
                        matchmakingIntervalRef.current = null;
                        setIsMatching(false);
                        return;
                    }
                    
                    // Re-check queue for better matches
                    const newQueueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
                    const newCandidates: (QueueEntry & { doc: any })[] = [];
                    
                    for (const queueDoc of newQueueSnapshot.docs) {
                        if (queueDoc.id === currentUser.uid) continue;
                        const candidate = queueDoc.data() as QueueEntry;
                        const theyWantMe = candidate.seeking === userProfile.gender || candidate.seeking === 'any';
                        const iWantThem = preference === candidate.userGender || preference === 'any';
                        if (theyWantMe && iWantThem) {
                            newCandidates.push({ ...candidate, doc: queueDoc });
                        }
                    }
                    
                    if (newCandidates.length > 0) {
                        const newScored = newCandidates.map(c => ({
                            candidate: c,
                            score: calculateMatchScore(myQueueEntry, c)
                        }));
                        newScored.sort((a, b) => b.score - a.score);
                        
                        // Update if we found a better match
                        if (newScored[0].score > currentBestMatch.score) {
                            currentBestMatch = newScored[0];
                            console.log(`🎯 Found better match! New score: ${currentBestMatch.score.toFixed(2)}`);
                            
                            // If we found an EXCELLENT match (score > 80), we MIGHT connect immediately
                            // BUT only if we joined the queue AFTER them (they get priority to finish their wait)
                            if (currentBestMatch.score > 80) {
                                const theirQueuedAt = currentBestMatch.candidate.queuedAt || 0;
                                
                                // Only connect immediately if THEY joined AFTER us
                                // If they joined BEFORE us, respect their timeout
                                if (theirQueuedAt > myQueuedAt) {
                                    console.log(`✨ Excellent match found (score > 80)! Connecting immediately (we joined first).`);
                                    clearInterval(waitInterval);
                                    matchmakingIntervalRef.current = null;
                                    try {
                                        await createInstantMatch(currentBestMatch, currentUser.uid, userProfile, needsGenderFilter);
                                        console.log('✅ Successfully connected with excellent match!');
                                        setIsMatching(false);
                                    } catch (error) {
                                        console.error('❌ Failed to create match:', error);
                                        setIsMatching(false);
                                        showAlert('Failed to connect. Please try again.', 'error');
                                    }
                                    return;
                                } else {
                                    console.log(`⏳ Excellent match found, but they joined queue first (${theirQueuedAt} vs ${myQueuedAt}). Respecting their timeout.`);
                                }
                            }
                        }
                    }
                    
                    // Time's up - connect with best match found
                    // BUT only if we joined queue FIRST (we have priority to initiate connection)
                    if (waitTimeRemaining <= 0 && !timeoutHandled) {
                        timeoutHandled = true; // Prevent re-entering this block
                        
                        // First check if WE were already matched by someone else
                        const ourUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (ourUserDoc.exists() && ourUserDoc.data()?.currentChatId) {
                            console.log('✅ Already matched by partner! Chat created.');
                            clearInterval(waitInterval);
                            matchmakingIntervalRef.current = null;
                            setIsMatching(false);
                            return;
                        }
                        
                        // Re-fetch ALL queue to find matches whose timeout has expired
                        const allQueueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
                        const availableMatches: { candidate: QueueEntry & { doc: any }; score: number }[] = [];
                        
                        for (const queueDoc of allQueueSnapshot.docs) {
                            if (queueDoc.id === currentUser.uid) continue;
                            
                            const candidate = queueDoc.data() as QueueEntry;
                            
                            // Check compatibility
                            const theyWantMe = candidate.seeking === userProfile.gender || candidate.seeking === 'any';
                            const iWantThem = preference === candidate.userGender || preference === 'any';
                            if (!theyWantMe || !iWantThem) continue;
                            
                            // Check if we can match with this candidate
                            const candidateHasInterests = candidate.interests && candidate.interests.length > 0;
                            const candidateMinTimeout = candidateHasInterests ? 15 : 60;
                            const candidateWaitTime = (Date.now() - (candidate.queuedAt || 0)) / 1000;
                            const candidateTimeoutExpired = candidateWaitTime >= candidateMinTimeout;
                            
                            // Check for shared interests (must have same specific interest like BCA+BCA or BTECH+BTECH)
                            const sharedInterests = myQueueEntry.interests.filter(interest =>
                                candidate.interests.includes(interest)
                            );
                            const hasSharedInterests = sharedInterests.length > 0;
                            
                            // Calculate score
                            const score = calculateMatchScore(myQueueEntry, candidate);
                            
                            // Can match if:
                            // 1. Candidate has NO interests → They accept anyone (no need to wait for their timeout)
                            // 2. Candidate's timeout expired → They're ready to connect
                            // 3. SHARED interests & we joined first → Both benefit from immediate connection (must have same specific interest)
                            const canMatch = !candidateHasInterests || candidateTimeoutExpired || (hasSharedInterests && myQueuedAt < (candidate.queuedAt || 0));
                            
                            if (canMatch) {
                                availableMatches.push({
                                    candidate: { ...candidate, doc: queueDoc },
                                    score
                                });
                            } else {
                                console.log(`⏳ Skipping ${queueDoc.id} - has interests & timeout not expired (${candidateWaitTime.toFixed(1)}s / ${candidateMinTimeout}s)`);
                            }
                        }
                        
                        if (availableMatches.length === 0) {
                            console.log('⚠️ No available matches. Continuing to wait...');
                            postTimeoutWaitCount++;
                            
                            // If waited too long after timeout with no available matches, show error
                            if (postTimeoutWaitCount >= MAX_POST_TIMEOUT_WAIT) {
                                console.log('❌ No available matches found after extended wait.');
                                clearInterval(waitInterval);
                                matchmakingIntervalRef.current = null;
                                setIsMatching(false);
                                showAlert('No match found. Try again or adjust your preferences.', 'info');
                                try {
                                    await deleteDoc(doc(db, 'matchmakingQueue', currentUser.uid));
                                } catch (error) {
                                    // Ignore
                                }
                            }
                            return; // Keep interval running
                        }
                        
                        // Sort by score and pick best available match
                        availableMatches.sort((a, b) => b.score - a.score);
                        const bestAvailableMatch = availableMatches[0];
                        
                        console.log(`🎯 Best available match (timeout expired): score ${bestAvailableMatch.score.toFixed(2)}`);
                        
                        const partnerData = bestAvailableMatch.candidate;
                        const theirQueuedAt = partnerData.queuedAt || 0;
                        
                        // Determine who should initiate connection
                        // If same timestamp, use userId as tiebreaker (alphabetically first user initiates)
                        let shouldInitiateConnection = false;
                        if (myQueuedAt < theirQueuedAt) {
                            shouldInitiateConnection = true; // We joined first
                        } else if (myQueuedAt > theirQueuedAt) {
                            shouldInitiateConnection = false; // They joined first
                        } else {
                            // Same timestamp - use userId as tiebreaker
                            shouldInitiateConnection = currentUser.uid < bestAvailableMatch.candidate.userId;
                        }
                        
                        console.log(`⏰ Timeout reached. Decision: ${shouldInitiateConnection ? 'WE initiate' : 'THEY initiate'} (myQueue: ${myQueuedAt}, theirQueue: ${theirQueuedAt}, myId: ${currentUser.uid}, theirId: ${bestAvailableMatch.candidate.userId})`);
                        
                        // Only initiate connection if we won the tiebreaker
                        if (shouldInitiateConnection) {
                            console.log(`⏰ Connecting with best available match (score: ${bestAvailableMatch.score.toFixed(2)}) - We won tiebreaker`);
                            clearInterval(waitInterval);
                            matchmakingIntervalRef.current = null;
                            try {
                                await createInstantMatch(bestAvailableMatch, currentUser.uid, userProfile, needsGenderFilter);
                                console.log('✅ Successfully connected after wait! (We joined first)');
                                setIsMatching(false);
                            } catch (error) {
                                console.error('❌ Failed to create match after wait:', error);
                                clearInterval(waitInterval);
                                matchmakingIntervalRef.current = null;
                                setIsMatching(false);
                                showAlert('Failed to connect. Please try again.', 'error');
                            }
                        } else {
                            // They won tiebreaker, so they control the connection
                            // Keep interval running - it will detect when they create the match
                            console.log(`⏳ Partner won tiebreaker. They will initiate match. Continuing to wait...`);
                            // Don't clear interval - let it keep checking for match
                            // Don't show any error - partner is connecting us
                        }
                    }
                }, 1000);
                matchmakingIntervalRef.current = waitInterval;
                
                return; // Exit - wait interval handles the rest
            }
            
            // Step 4: No immediate match found - add to queue and wait for configured time
            console.log('⏳ No immediate match found, joining queue and waiting...');
            
            // Store our queue join time BEFORE adding to queue
            const myQueuedAt = Date.now();
            
            await setDoc(doc(db, 'matchmakingQueue', currentUser.uid), {
                userId: currentUser.uid,
                userGender: userProfile.gender,
                seeking: preference,
                interests: interests.length > 0 ? interests : (userProfile.interests || []),
                usesGenderFilter: needsGenderFilter,
                timestamp: serverTimestamp(),
                queuedAt: myQueuedAt
            });
            
            // Wait for user's configured timeout, checking for matches every second
            let waitTimeRemaining = MATCH_WAIT_TIME;
            let foundMatch = false;
            let currentBestMatch: { candidate: any; score: number } | null = null;
            let timeoutHandled = false; // Flag to prevent re-entering timeout logic
            let postTimeoutWaitCount = 0; // Track how long we wait after timeout for available match
            const MAX_POST_TIMEOUT_WAIT = 10; // Wait max 10 more seconds after timeout
            
            const retryInterval = setInterval(async () => {
                waitTimeRemaining--;
                console.log(`⏳ Waiting for match... ${waitTimeRemaining}s remaining (${MATCH_WAIT_TIME - waitTimeRemaining}/${MATCH_WAIT_TIME})`);
                
                // Check if we got matched (currentChatId was set by another user)
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists() && userDoc.data()?.currentChatId) {
                    console.log('✅ Matched by another user!');
                    clearInterval(retryInterval);
                    matchmakingIntervalRef.current = null;
                    setIsMatching(false);
                    foundMatch = true;
                    // Real-time listener will handle showing the chat
                    return;
                }
                
                // Check if new candidates appeared in queue
                const newQueueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
                const newCandidates: (QueueEntry & { doc: any })[] = [];
                
                for (const queueDoc of newQueueSnapshot.docs) {
                    if (queueDoc.id === currentUser.uid) continue;
                    const candidate = queueDoc.data() as QueueEntry;
                    const theyWantMe = candidate.seeking === userProfile.gender || candidate.seeking === 'any';
                    const iWantThem = preference === candidate.userGender || preference === 'any';
                    if (theyWantMe && iWantThem) {
                        newCandidates.push({ ...candidate, doc: queueDoc });
                    }
                }
                
                // Score candidates and track best match
                if (newCandidates.length > 0) {
                    const myQueueEntry: QueueEntry = {
                        userId: currentUser.uid,
                        userGender: userProfile.gender,
                        seeking: preference,
                        interests: interests.length > 0 ? interests : (userProfile.interests || []),
                        usesGenderFilter: needsGenderFilter,
                        timestamp: Timestamp.now(),
                        queuedAt: Date.now()
                    };
                    
                    const scoredCandidates = newCandidates.map(c => ({
                        candidate: c,
                        score: calculateMatchScore(myQueueEntry, c)
                    }));
                    scoredCandidates.sort((a, b) => b.score - a.score);
                    
                    const bestAvailable = scoredCandidates[0];
                    
                    // Update current best match if this is better
                    if (!currentBestMatch || bestAvailable.score > currentBestMatch.score) {
                        currentBestMatch = bestAvailable;
                        console.log(`🎯 Updated best match! Score: ${currentBestMatch.score.toFixed(2)} (waiting for full timeout to see if better match appears)`);
                    }
                    
                    // ONLY connect immediately if we found an EXCELLENT match (score > 80 = shared interests + gender match)
                    // AND if we joined the queue AFTER them (they get priority to finish their wait)
                    // Otherwise, keep waiting for the full timeout to see if better match appears
                    if (bestAvailable.score > 80 && !foundMatch) {
                        const theirQueuedAt = bestAvailable.candidate.queuedAt || 0;
                        
                        // Only connect immediately if THEY joined AFTER us (we have priority)
                        if (theirQueuedAt > myQueuedAt) {
                            console.log(`✨ Excellent match found (score > 80)! Connecting immediately (we joined first).`);
                            clearInterval(retryInterval);
                            matchmakingIntervalRef.current = null;
                            try {
                                await createInstantMatch(bestAvailable, currentUser.uid, userProfile, needsGenderFilter);
                                console.log('✅ Successfully connected!');
                                setIsMatching(false);
                                foundMatch = true;
                            } catch (error) {
                                console.error('❌ Failed to create match:', error);
                                setIsMatching(false);
                                showAlert('Failed to connect. Please try again.', 'error');
                            }
                            return;
                        } else {
                            console.log(`⏳ Excellent match found, but they joined queue first (${theirQueuedAt} vs ${myQueuedAt}). Respecting their timeout.`);
                        }
                    }
                }
                
                // Time's up - connect with best match found (if any)
                // BUT only if we joined queue FIRST (we have priority to initiate connection)
                if (waitTimeRemaining <= 0 && !timeoutHandled) {
                    timeoutHandled = true; // Prevent re-entering this block
                    
                    if (currentBestMatch && !foundMatch) {
                        // First check if WE were already matched by someone else
                        const ourUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (ourUserDoc.exists() && ourUserDoc.data()?.currentChatId) {
                            console.log('✅ Already matched by partner! Chat created.');
                            clearInterval(retryInterval);
                            matchmakingIntervalRef.current = null;
                            setIsMatching(false);
                            return;
                        }
                        
                        // Re-fetch ALL queue to find matches whose timeout has expired
                        const allQueueSnapshot = await getDocs(collection(db, 'matchmakingQueue'));
                        const availableMatches: { candidate: QueueEntry & { doc: any }; score: number }[] = [];
                        
                        for (const queueDoc of allQueueSnapshot.docs) {
                            if (queueDoc.id === currentUser.uid) continue;
                            
                            const candidate = queueDoc.data() as QueueEntry;
                            
                            // Check compatibility
                            const theyWantMe = candidate.seeking === userProfile.gender || candidate.seeking === 'any';
                            const iWantThem = preference === candidate.userGender || preference === 'any';
                            if (!theyWantMe || !iWantThem) continue;
                            
                            // Check if we can match with this candidate
                            const candidateHasInterests = candidate.interests && candidate.interests.length > 0;
                            const candidateMinTimeout = candidateHasInterests ? 15 : 60;
                            const candidateWaitTime = (Date.now() - (candidate.queuedAt || 0)) / 1000;
                            const candidateTimeoutExpired = candidateWaitTime >= candidateMinTimeout;
                            
                            // Check for shared interests (must have same specific interest like BCA+BCA or BTECH+BTECH)
                            const sharedInterests = myQueueEntry.interests.filter(interest =>
                                candidate.interests.includes(interest)
                            );
                            const hasSharedInterests = sharedInterests.length > 0;
                            
                            // Calculate score
                            const score = calculateMatchScore(myQueueEntry, candidate);
                            
                            // Can match if:
                            // 1. Candidate has NO interests → They accept anyone (no need to wait for their timeout)
                            // 2. Candidate's timeout expired → They're ready to connect
                            // 3. SHARED interests & we joined first → Both benefit from immediate connection (must have same specific interest)
                            const canMatch = !candidateHasInterests || candidateTimeoutExpired || (hasSharedInterests && myQueuedAt < (candidate.queuedAt || 0));
                            
                            if (canMatch) {
                                availableMatches.push({
                                    candidate: { ...candidate, doc: queueDoc },
                                    score
                                });
                            } else {
                                console.log(`⏳ Skipping ${queueDoc.id} - has interests & timeout not expired (${candidateWaitTime.toFixed(1)}s / ${candidateMinTimeout}s)`);
                            }
                        }
                        
                        if (availableMatches.length === 0) {
                            console.log('⚠️ No available matches. Continuing to wait...');
                            postTimeoutWaitCount++;
                            
                            // If waited too long after timeout with no available matches, show error
                            if (postTimeoutWaitCount >= MAX_POST_TIMEOUT_WAIT) {
                                console.log('❌ No available matches found after extended wait.');
                                clearInterval(retryInterval);
                                matchmakingIntervalRef.current = null;
                                setIsMatching(false);
                                showAlert('No match found. Try again or adjust your preferences.', 'info');
                                try {
                                    await deleteDoc(doc(db, 'matchmakingQueue', currentUser.uid));
                                } catch (error) {
                                    // Ignore
                                }
                            }
                            return; // Keep interval running
                        }
                        
                        // Sort by score and pick best available match
                        availableMatches.sort((a, b) => b.score - a.score);
                        const bestAvailableMatch = availableMatches[0];
                        
                        console.log(`🎯 Best available match (timeout expired): score ${bestAvailableMatch.score.toFixed(2)}`);
                        
                        const partnerData = bestAvailableMatch.candidate;
                        const theirQueuedAt = partnerData.queuedAt || 0;
                        
                        // Determine who should initiate connection
                        // If same timestamp, use userId as tiebreaker (alphabetically first user initiates)
                        let shouldInitiateConnection = false;
                        if (myQueuedAt < theirQueuedAt) {
                            shouldInitiateConnection = true; // We joined first
                        } else if (myQueuedAt > theirQueuedAt) {
                            shouldInitiateConnection = false; // They joined first
                        } else {
                            // Same timestamp - use userId as tiebreaker
                            shouldInitiateConnection = currentUser.uid < bestAvailableMatch.candidate.userId;
                        }
                        
                        console.log(`⏰ Timeout reached. Decision: ${shouldInitiateConnection ? 'WE initiate' : 'THEY initiate'} (myQueue: ${myQueuedAt}, theirQueue: ${theirQueuedAt}, myId: ${currentUser.uid}, theirId: ${bestAvailableMatch.candidate.userId})`);
                        
                        // Only initiate connection if we won the tiebreaker
                        if (shouldInitiateConnection) {
                            console.log(`⏰ Connecting with best available match (score: ${bestAvailableMatch.score.toFixed(2)}) - We won tiebreaker`);
                            clearInterval(retryInterval);
                            matchmakingIntervalRef.current = null;
                            try {
                                await createInstantMatch(bestAvailableMatch, currentUser.uid, userProfile, needsGenderFilter);
                                console.log('✅ Successfully connected after full wait!');
                                setIsMatching(false);
                            } catch (error) {
                                console.error('❌ Failed to create match:', error);
                                clearInterval(retryInterval);
                                matchmakingIntervalRef.current = null;
                                setIsMatching(false);
                                showAlert('Failed to connect. Please try again.', 'error');
                            }
                        } else {
                            // They won tiebreaker, so they control the connection
                            // Keep interval running - it will detect when they create the match
                            console.log(`⏳ Partner won tiebreaker. They will initiate match. Continuing to wait...`);
                            // Don't clear interval - let it keep checking for match
                            // Don't show any error - partner is connecting us
                        }
                    } else if (!foundMatch) {
                        clearInterval(retryInterval);
                        matchmakingIntervalRef.current = null;
                        setIsMatching(false);
                        showAlert('No match found. Try again or adjust your preferences.', 'info');
                        
                        // Clean up queue
                        try {
                            await deleteDoc(doc(db, 'matchmakingQueue', currentUser.uid));
                        } catch (error) {
                            // Ignore
                        }
                    }
                    
                    return;
                }
            }, 1000);
            matchmakingIntervalRef.current = retryInterval;
            
        } catch (error: any) {
            console.error('❌ ERROR in handleStartChat:', error);
            setIsMatching(false);
            showAlert(`Matchmaking failed: ${error?.message || 'Unknown error'}`, 'error');
        }
    };
    
    const handleCancelMatchmaking = async () => {
        if (!currentUser) return;
        
        // Clear any running matchmaking interval
        if (matchmakingIntervalRef.current) {
            clearInterval(matchmakingIntervalRef.current);
            matchmakingIntervalRef.current = null;
        }
        
        setIsMatching(false);
        try {
            await deleteDoc(doc(db, 'matchmakingQueue', currentUser.uid));
        } catch (error) {
            // Ignore if doesn't exist
        }
    };

    const handleLeaveChat = async () => {
        if (!currentUser || !currentChat) return;

        console.log('🚪 Leaving chat...', currentChat.id);
        justLeftChatRef.current = true;
        
        // Immediately clear the local state
        setCurrentChat(null);

        try {
            // FIRST: Clear currentChatId for both users to prevent reconnection
            console.log('1️⃣ Clearing currentChatId for all participants...');
            const clearPromises = currentChat.participants.map(uid => 
                updateDoc(doc(db, 'users', uid), { currentChatId: null })
            );
            await Promise.all(clearPromises);
            console.log('✅ All currentChatId fields cleared');

            // SECOND: Delete messages and chat document
            console.log('2️⃣ Deleting messages and chat document...');
            const batch = writeBatch(db);
            
            const messagesQuery = query(collection(db, `chats/${currentChat.id}/messages`));
            const messagesSnapshot = await getDocs(messagesQuery);
            messagesSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete the chat document
            batch.delete(doc(db, 'chats', currentChat.id));

            await batch.commit();
            console.log('✅ Chat document and messages deleted');
            
        } catch (error) {
            console.error('❌ Error leaving chat:', error);
            // Still clear local state even if there's an error
        } finally {
            // Reset the flag after a delay to prevent any race conditions
            setTimeout(() => {
                justLeftChatRef.current = false;
                console.log('🔓 justLeftChatRef reset');
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-dark-bg bg-grid-dark-surface/[0.2] flex flex-col overflow-hidden">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-dark-bg [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <Header userProfile={userProfile} showAlert={showAlert} onOpenCoinModal={() => navigate('/store')} />
            {showWarningModal && <WarningNotificationModal message={warningMessage} onClose={handleAcknowledgeWarning} />}
            {showAlertModal && (
                <AlertModal 
                    message={alertConfig.message} 
                    type={alertConfig.type}
                    title={alertConfig.title}
                    onClose={() => setShowAlertModal(false)} 
                />
            )}
            <main className="flex-1 w-full z-10 flex items-center justify-center px-4 py-4 overflow-hidden" style={{ marginTop: '80px' }}>
                {isMatching && <MatchmakingModal onCancel={handleCancelMatchmaking} />}
                
                {!currentChat ? (
                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                        <ChatDashboard onStartChat={handleStartChat} onOpenCoinModal={() => navigate('/store')} searchTimeout={interestSearchTimeout} />
                    </div>
                ) : (
                    <div className="w-full max-w-4xl h-full flex flex-col">
                      <ChatRoom chat={currentChat} onLeave={handleLeaveChat} showAlert={showAlert} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChatPage;