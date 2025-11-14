
import React, { useReducer, useEffect, createContext, useContext, ReactNode, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { UserProfile } from './types';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import AdminPage from './components/AdminPage';
import ProfilePage from './components/ProfilePage';
import StorePage from './components/StorePage';
import LandingPage from './components/LandingPage';

// --- Auth State and Reducer ---

interface AuthState {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: { user: FirebaseUser; profile: UserProfile | null } }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile | null }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  currentUser: null,
  userProfile: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        currentUser: action.payload.user,
        userProfile: action.payload.profile,
        loading: false,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
      };
    case 'LOGOUT':
      return { currentUser: null, userProfile: null, loading: false };
    default:
      return state;
  }
}

// --- Auth Context ---
const AuthContext = createContext<AuthState>(initialState);
export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isFirstProfileLoad = true;

    // onAuthStateChanged returns an unsubscribe function
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', { user: user ? user.uid : 'No user', email: user?.email });
      
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          console.log('Setting up profile listener for user:', user.uid);
          
          // Set up real-time listener for user profile
          unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
            const profile = docSnap.exists()
              ? ({ uid: docSnap.id, ...docSnap.data() } as UserProfile)
              : null;
            
            console.log('Profile snapshot received:', { 
              exists: docSnap.exists(), 
              isFirstLoad: isFirstProfileLoad,
              profile: profile ? 'Profile data exists' : 'No profile data'
            });
            
            // Update profile in state
            if (isFirstProfileLoad) {
              // First time loading - complete the auth process
              console.log('Initial auth success - setting loading to false');
              dispatch({ type: 'AUTH_SUCCESS', payload: { user, profile } });
              isFirstProfileLoad = false;
            } else {
              // Subsequent updates - just update the profile
              console.log('Profile updated in real-time');
              dispatch({ type: 'UPDATE_PROFILE', payload: profile });
            }
          }, (error) => {
            console.error("Error listening to user profile:", error);
            // Even on error, we should mark loading as complete to avoid infinite loading
            if (isFirstProfileLoad) {
              dispatch({ type: 'AUTH_SUCCESS', payload: { user, profile: null } });
              isFirstProfileLoad = false;
            }
          });
        } catch (error) {
          console.error("Error setting up user profile listener. Signing out.", error);
          // If profile fetch fails, we have an authenticated user but no profile.
          // It's better to log them out to avoid an inconsistent state.
          await signOut(auth);
          // The onAuthStateChanged listener will be called again with user=null, 
          // which will dispatch the LOGOUT action.
        }
      } else {
        // User is signed out or not logged in.
        console.log('No user - logging out');
        // Clean up profile listener if it exists
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        isFirstProfileLoad = true; // Reset for next login
        dispatch({ type: 'LOGOUT' });
      }
    });

    // Cleanup the subscriptions when the component unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount.


  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
};


// --- Landing Page Wrapper ---
const LandingPageWrapper = () => {
  const navigate = useNavigate();
  
  const handleGetStarted = () => {
    navigate('/auth');
  };
  
  return <LandingPage onGetStarted={handleGetStarted} />;
};

// --- App Router ---
const AppRouter = () => {
  const { userProfile, loading } = useAuth();
  
  console.log('AppRouter render:', { loading, hasProfile: !!userProfile });
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-dark-bg">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-brand-primary"></div>
        <p className="text-dark-text-secondary mt-4">Loading...</p>
      </div>
    );
  }
  
  if (userProfile) {
    console.log('AppRouter - User profile loaded:', { 
      isAdmin: userProfile.isAdmin, 
      status: userProfile.status,
      username: userProfile.username 
    });
    
    if (userProfile.isAdmin) {
      console.log('AppRouter - Rendering admin routes');
      return (
        <Routes>
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      );
    }
    
    switch (userProfile.status) {
      case 'approved':
        return (
          <Routes>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="*" element={<Navigate to="/chat" />} />
          </Routes>
        );
      case 'pending':
         return <AuthPage initialView="pending" />;
      case 'rejected':
      case 'banned':
         return <AuthPage initialView="banned" />;
      default:
        // If the user profile has an unknown status, default to the main auth page.
        return <AuthPage />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPageWrapper />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

// --- Main App Component ---
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-dark-bg text-dark-text-primary font-sans">
          <AppRouter />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}
