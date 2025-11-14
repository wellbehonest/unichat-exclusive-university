import React, { useState, FormEvent, FC } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../services/firebase';
import { X, Eye, EyeOff, AlertCircle, LogOut, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UNIVERSITY_DOMAIN = '@university.edu';

// --- Terms and Conditions Modal ---
const TermsModal: FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full border border-dark-surface transform transition-all duration-300 scale-95 hover:scale-100">
      <div className="p-6 relative">
        <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Terms and Conditions</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-dark-text-secondary hover:text-white transition-colors">
          <X size={24} />
        </button>
        <div className="space-y-4 text-dark-text-secondary max-h-[60vh] overflow-y-auto pr-2">
          <p><strong>1. Age Requirement:</strong> You must be 18 years or older to use this service.</p>
          <p><strong>2. User Conduct:</strong> You agree not to engage in harassment, hate speech, or share any explicit, illegal, or harmful content. Treat all users with respect.</p>
          <p><strong>3. Content Moderation:</strong> To ensure community safety, you acknowledge and agree that administrators may monitor active chats for moderation purposes. Violations of these terms may result in chat termination or a permanent ban.</p>
          <p><strong>4. Account Responsibility:</strong> You are responsible for all activities that occur under your account. Keep your login credentials secure.</p>
          <p><strong>5. Data Privacy:</strong> We are committed to protecting your privacy. Your ID card is used for verification only and is not shared. Chat messages are ephemeral and are deleted when a chat ends.</p>
        </div>
      </div>
    </div>
  </div>
);


// --- Auth Layout ---
const AuthLayout: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-dark-bg bg-grid-dark-surface/[0.2] relative">
     <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-dark-bg [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
    <div className="w-full max-w-md z-10">
      <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-surface/50 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-dark-text-primary mb-6">{title}</h2>
        {children}
      </div>
    </div>
  </div>
);

// --- Sign Up Form ---
const SignUpForm: FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [password, setPassword] = useState('');
  const [idCard, setIdCard] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !admissionNumber || !password || !idCard || !gender) {
      setError('All fields are required.');
      return;
    }
    if (!email.endsWith(UNIVERSITY_DOMAIN)) {
      setError(`Email must be a valid university email (ending in ${UNIVERSITY_DOMAIN}).`);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!agreed) {
      setError('You must agree to the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create user with Firebase Auth.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Create user profile document in Firestore immediately with a placeholder for the ID card URL.
      // This ensures the user exists in our database for admin approval even if the upload fails.
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        username,
        email,
        admissionNumber,
        gender,
        idCardUrl: '', // Placeholder, will be updated after upload.
        status: 'pending',
        isAdmin: false,
        coins: 0,
        currentChatId: null,
        isOnline: false,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Step 3: Upload ID card to storage.
      const storageRef = ref(storage, `id_cards/${user.uid}/${idCard.name}`);
      const snapshot = await uploadBytes(storageRef, idCard);
      const idCardUrl = await getDownloadURL(snapshot.ref);

      // Step 4: Update the user document with the final ID card URL.
      await updateDoc(userDocRef, {
        idCardUrl: idCardUrl,
      });
      
      // The onAuthStateChanged listener in App.tsx will handle redirection to the pending page.

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Please log in.');
      } else if (err.code && err.code.startsWith('storage/')) {
        console.error("Storage upload error:", err);
        setError('Account created, but failed to upload ID card. Please contact an administrator.');
      } else {
        console.error("Signup error:", err);
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>{error}</div>}
      <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
      <input type="email" placeholder="University Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
      <input type="text" placeholder="Admission Number" value={admissionNumber} onChange={e => setAdmissionNumber(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
       <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary">
          <option value="" disabled>Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      <div className="relative">
        <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-dark-text-secondary">
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-2">Upload ID Card Photo</label>
        <input type="file" accept="image/*" onChange={e => setIdCard(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-secondary" />
      </div>
      <div className="flex items-start">
        <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 rounded border-dark-surface text-brand-primary focus:ring-brand-primary mt-1" />
        <label htmlFor="terms" className="ml-2 text-sm text-dark-text-secondary">
          I am 18+ and agree to the <button type="button" onClick={() => setTermsModalOpen(true)} className="font-medium text-brand-primary hover:underline">Terms and Conditions</button>.
        </label>
      </div>
      <button type="submit" disabled={loading} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
      <p className="text-center text-sm text-dark-text-secondary">
        Already have an account? <button type="button" onClick={onSwitch} className="font-medium text-brand-primary hover:underline">Log In</button>
      </p>
      {isTermsModalOpen && <TermsModal onClose={() => setTermsModalOpen(false)} />}
    </form>
  );
};

// --- Login Form ---
const LoginForm: FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // App.tsx will handle redirection
    } catch (err: any) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="mr-2 h-4 w-4"/>{error}</div>}
      <input type="email" placeholder="University Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
      <div className="relative">
        <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-dark-surface p-3 rounded-lg border border-dark-surface focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-dark-text-secondary">
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <button type="submit" disabled={loading} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50">
        {loading ? 'Logging In...' : 'Log In'}
      </button>
      <p className="text-center text-sm text-dark-text-secondary">
        Don't have an account? <button type="button" onClick={onSwitch} className="font-medium text-brand-primary hover:underline">Sign Up</button>
      </p>
    </form>
  );
};

// --- Status Pages ---
const PendingPage: FC = () => (
  <div className="text-center space-y-4">
    <CheckCircle className="mx-auto h-16 w-16 text-green-400"/>
    <p className="text-dark-text-secondary">Your account has been created successfully and is now pending approval from an administrator. Please check back later.</p>
    <button onClick={() => signOut(auth)} className="flex items-center justify-center w-full bg-dark-surface hover:bg-red-500/20 text-white font-bold py-3 px-4 rounded-lg transition-colors">
      <LogOut className="mr-2 h-5 w-5"/> Log Out
    </button>
  </div>
);

const BannedPage: FC = () => (
   <div className="text-center space-y-4">
    <AlertCircle className="mx-auto h-16 w-16 text-red-400"/>
    <p className="text-dark-text-secondary">Your account has been rejected or banned due to a violation of our terms of service. If you believe this is an error, please contact support.</p>
    <button onClick={() => signOut(auth)} className="flex items-center justify-center w-full bg-dark-surface hover:bg-red-500/20 text-white font-bold py-3 px-4 rounded-lg transition-colors">
      <LogOut className="mr-2 h-5 w-5"/> Log Out
    </button>
  </div>
);


// --- Main Auth Page Component ---
const AuthPage: FC<{ initialView?: 'login' | 'signup' | 'pending' | 'banned' }> = ({ initialView = 'login' }) => {
  const [view, setView] = useState(initialView);

  switch (view) {
    case 'pending':
        return <AuthLayout title="Pending Approval"><PendingPage /></AuthLayout>;
    case 'banned':
        return <AuthLayout title="Account Suspended"><BannedPage /></AuthLayout>;
    case 'signup':
      return <AuthLayout title="Create Account"><SignUpForm onSwitch={() => setView('login')} /></AuthLayout>;
    default:
      return <AuthLayout title="Login"><LoginForm onSwitch={() => setView('signup')} /></AuthLayout>;
  }
};

export default AuthPage;
