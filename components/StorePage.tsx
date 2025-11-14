import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Coins, MessageSquare, Menu, X, User, Users, Shield, ArrowLeft } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, CoinPackage } from '../types';

// Menu Drawer Component
type PanelType = 'profile' | 'account' | 'privacy' | null;

const MenuDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
}> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

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
                            <button
                                onClick={() => {
                                    navigate('/profile');
                                    onClose();
                                }}
                                className="w-full flex items-center space-x-3 p-4 bg-dark-surface hover:bg-dark-surface/70 rounded-lg transition-colors group"
                            >
                                <User size={20} className="text-brand-primary group-hover:text-brand-secondary transition-colors" />
                                <span className="text-white font-medium">Profile</span>
                            </button>
                            
                            <button
                                onClick={() => {
                                    navigate('/chat');
                                    onClose();
                                }}
                                className="w-full flex items-center space-x-3 p-4 bg-dark-surface hover:bg-dark-surface/70 rounded-lg transition-colors group"
                            >
                                <Users size={20} className="text-brand-primary group-hover:text-brand-secondary transition-colors" />
                                <span className="text-white font-medium">Chat</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return ReactDOM.createPortal(drawerContent, document.body);
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [purchasedCoins, setPurchasedCoins] = useState(0);

  // Load coin packages from Firestore
  useEffect(() => {
    const packagesQuery = query(
      collection(db, 'coinPackages'),
      where('enabled', '==', true)
    );
    
    const unsubscribe = onSnapshot(packagesQuery, snapshot => {
      const packages = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CoinPackage));
      // Sort by order field
      packages.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return 0;
      });
      setCoinPackages(packages);
    });

    return () => unsubscribe();
  }, []);

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!currentUser || !userProfile) return;

    setSelectedPackage(pkg);
    setIsProcessing(true);

    try {
      const options = {
        key: 'rzp_test_ReXpK6MQxgeH3R', // Razorpay test key
        amount: pkg.price * 100, // Amount in paise
        currency: 'INR',
        name: 'LynZo Coins',
        description: `${pkg.label} - ${pkg.coins + pkg.bonus} coins`,
        image: '/logo.svg',
        handler: async function (response: any) {
          console.log('💳 Payment successful:', response.razorpay_payment_id);
          
          try {
            // Update user's coin balance
            const userRef = doc(db, 'users', currentUser.uid);
            const totalCoins = pkg.coins + pkg.bonus;
            
            await updateDoc(userRef, {
              coins: increment(totalCoins),
              lifetimeCoinsEarned: increment(totalCoins)
            });

            // Create transaction record
            await addDoc(collection(db, 'coinTransactions'), {
              userId: currentUser.uid,
              type: 'purchase',
              amount: totalCoins,
              paymentId: response.razorpay_payment_id,
              packageId: pkg.id,
              price: pkg.price,
              balanceAfter: (userProfile.coins || 0) + totalCoins,
              timestamp: serverTimestamp(),
              description: `Purchased ${pkg.label}`
            });

            console.log('✅ Coins added successfully!');
            setPurchasedCoins(totalCoins);
            setShowSuccessModal(true);
            setIsProcessing(false);
            setSelectedPackage(null);
          } catch (error) {
            console.error('❌ Error updating coins:', error);
            setModalMessage('Payment successful but failed to add coins. Please contact support with payment ID: ' + response.razorpay_payment_id);
            setShowErrorModal(true);
            setIsProcessing(false);
            setSelectedPackage(null);
          }
        },
        prefill: {
          name: userProfile.username || 'User',
          email: currentUser.email || 'user@example.com'
        },
        theme: {
          color: '#7c3aed'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            setSelectedPackage(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      setModalMessage('Failed to initialize payment. Please try again.');
      setShowErrorModal(true);
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  if (!userProfile) {
    return null;
  }

  const currentCoins = userProfile.coins || 0;

  return (
    <div className="fixed inset-0 bg-dark-bg bg-grid-dark-surface/[0.2] flex flex-col overflow-hidden">
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-dark-bg [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      {/* Header - Same as ChatPage */}
      <header className="absolute top-0 left-0 right-0 p-4 bg-dark-bg/50 backdrop-blur-sm z-30">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="LynZo Logo" 
              className="h-12 w-auto mr-3"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <MessageSquare className="mr-2 text-brand-primary hidden" />
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Momo Trust Display', sans-serif" }}>
              LynZo
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Coin Counter - Same style as ChatPage */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 rounded-full border border-yellow-500/30">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-bold text-sm">{currentCoins}</span>
            </div>
            
            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu Drawer */}
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 w-full z-10 px-4 py-8 overflow-auto" style={{ marginTop: '80px' }}>
        <div className="w-full max-w-4xl mx-auto">
          
          {/* Back Button - Above content */}
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors mb-8 group bg-dark-surface px-4 py-3 rounded-lg border border-dark-surface hover:border-brand-primary"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Chat</span>
          </button>

          {/* Coin Packages - 2 Columns Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {coinPackages.map((pkg) => {
              const totalCoins = pkg.coins + pkg.bonus;
              const isSelected = selectedPackage?.id === pkg.id;
              
              return (
                <div
                  key={pkg.id}
                  className={`relative bg-dark-card rounded-xl border transition-all duration-200 ${
                    pkg.popular
                      ? 'border-brand-primary shadow-lg shadow-brand-primary/20'
                      : 'border-dark-surface hover:border-dark-surface/50'
                  } ${isSelected ? 'ring-2 ring-brand-primary' : ''}`}
                >
                  {/* Popular Badge */}
                  {pkg.popular && (
                    <div className="absolute -top-2 -right-2 bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded-md">
                      POPULAR
                    </div>
                  )}

                  <div className="p-5">
                    {/* Package Name */}
                    <h3 className="text-lg font-bold text-white mb-3">{pkg.label}</h3>

                    {/* Coins Display */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xl font-bold text-white">{pkg.coins}</span>
                        <Coins className="w-6 h-6 text-yellow-400" />
                      </div>
                      {pkg.bonus > 0 && (
                        <p className="text-xs text-green-400 font-medium">+{pkg.bonus} bonus coins</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-white mb-1">₹{pkg.price}</div>
                      <p className="text-xs text-gray-500">
                        {totalCoins} total coins
                      </p>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={isProcessing}
                      className={`w-full py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-600 cursor-wait'
                          : pkg.popular
                          ? 'bg-brand-primary hover:bg-brand-secondary text-white'
                          : 'bg-dark-surface hover:bg-dark-bg text-white border border-dark-surface'
                      }`}
                    >
                      {isSelected ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing
                        </span>
                      ) : (
                        'Buy Now'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="bg-dark-card rounded-xl border border-dark-surface p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">
              Use coins to unlock features
            </h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                <span>Choose gender preference when chatting (1 coin per use)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                <span>Secure payment powered by Razorpay</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                <span>Coins are added to your account instantly</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-green-500/30 p-8 text-center transform animate-scale-in">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="text-green-400" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
            <p className="text-gray-300 mb-1">
              🎉 You've successfully purchased
            </p>
            <p className="text-4xl font-bold text-green-400 mb-6">
              {purchasedCoins} coins
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Your coins have been added to your account and are ready to use!
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-500/30 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-400" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Error</h2>
            <p className="text-gray-300 mb-6">
              {modalMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

export default StorePage;
