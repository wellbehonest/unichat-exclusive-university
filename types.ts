
import { Timestamp } from 'firebase/firestore';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'banned';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  admissionNumber: string;
  idCardUrl: string;
  gender: 'male' | 'female' | 'other';
  status: UserStatus;
  isAdmin: boolean;
  coins: number;
  lifetimeCoinsEarned?: number;
  lifetimeCoinsSpent?: number;
  currentChatId: string | null;
  isOnline: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  warnings?: number;
  warningMessage?: string;
  warningTimestamp?: Timestamp;
  bannedUntil?: Timestamp | null;
  avatarUrl?: string;
  lastNameChange?: Timestamp;
  nameChangesToday?: number;
  lastAvatarChange?: Timestamp;
  avatarChangesToday?: number;
  bio?: string;
  blockedUsers?: string[];
  interests?: string[]; // User's custom interests
}

export type GenderPreference = 'male' | 'female' | 'any';

export interface MatchmakingData {
  userId: string;
  timestamp: Timestamp;
  gender: 'male' | 'female' | 'other';
  seeking: GenderPreference;
  interests?: string[]; // Custom interests typed by user
}

export interface ChatParticipantInfo {
  username: string;
  isTyping: boolean;
  isViewingProfile?: boolean;
  isSelectingGif?: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantInfo: {
    [key: string]: ChatParticipantInfo;
  };
  createdAt: Timestamp;
  startedAt: Timestamp;
}

export type MessageType = 'text' | 'image' | 'gif' | 'system';

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  content: string;
  timestamp: Timestamp;
  replyTo?: {
    messageId: string;
    content: string;
    senderId: string;
  };
}

export interface Report {
  id: string;
  chatId: string;
  reportedBy: string;
  reportedByName: string;
  reportedUser: string;
  reportedUserName: string;
  reason: string;
  timestamp: Timestamp;
  status: 'pending' | 'reviewed' | 'dismissed';
  messages: Message[];
  participantProfiles: {
    [key: string]: {
      uid: string;
      username: string;
      email: string;
      admissionNumber: string;
      gender: string;
    };
  };
}

export type BanDuration = '1day' | '7days' | '30days' | 'permanent';

export interface AdminLog {
  id?: string;
  adminId: string;
  adminName: string;
  action: 'approved' | 'rejected' | 'banned' | 'warned' | 'unbanned' | 'profile_edited' | 'report_reviewed' | 'report_dismissed' | 'bulk_action';
  targetUserId?: string;
  targetUserName?: string;
  details: string;
  timestamp: Timestamp;
  metadata?: {
    banDuration?: BanDuration;
    reportId?: string;
    bulkCount?: number;
    changes?: Record<string, any>;
  };
}

export interface UserActivity {
  loginHistory: {
    timestamp: Timestamp;
    ipAddress?: string;
  }[];
  reportedCount: number;
  reportsFiledCount: number;
  chatsCount: number;
  flaggedChatsCount: number;
}

export type CoinTransactionType = 'purchase' | 'spent_gender_filter' | 'spent_chat_continue' | 'refund' | 'admin_grant';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface CoinTransaction {
  id: string;
  userId: string;
  type: CoinTransactionType;
  amount: number; // positive for earning, negative for spending
  balanceAfter: number;
  timestamp: Timestamp;
  description: string;
  paymentId?: string; // Razorpay payment ID
  orderId?: string; // Razorpay order ID
  paymentStatus?: PaymentStatus;
  razorpayAmount?: number; // Amount in INR
}

export interface CoinPackage {
  id: string;
  coins: number;
  price: number; // in INR
  bonus: number; // bonus coins
  popular?: boolean;
  label?: string;
  enabled?: boolean; // Can be disabled by admin
  order?: number; // Display order
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Match Proposal System - Confirmation before final match
export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface MatchProposal {
  id?: string;
  user1Id: string;
  user2Id: string;
  user1Confirmed: boolean;
  user2Confirmed: boolean;
  status: ProposalStatus;
  user1UsedFilter: boolean; // Does user1 need to pay?
  user2UsedFilter: boolean; // Does user2 need to pay?
  matchScore: number; // Quality score for analytics
  createdAt: Timestamp;
  expiresAt: Timestamp; // 15 second timeout
  chatId?: string; // Created after both confirm
}

// Enhanced Queue Entry with Scoring
export interface QueueEntry {
  userId: string;
  userGender: 'male' | 'female';
  seeking: GenderPreference;
  interests: string[];
  usesGenderFilter: boolean; // true if seeking != 'any'
  timestamp: Timestamp;
  queuedAt: number; // ms since epoch for FIFO
}

