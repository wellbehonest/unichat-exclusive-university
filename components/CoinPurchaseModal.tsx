import React, { useState } from 'react';
import { Coins, Sparkles, X, Zap, Gift, Crown, Star, ShoppingCart } from 'lucide-react';
import { CoinPackage } from '../types';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface CoinPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentCoins: number;
  onPurchaseSuccess: () => void;
}

const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'starter',
    coins: 10,
    price: 10,
    bonus: 0,
    label: 'Starter Pack'
  },
  {
    id: 'popular',
    coins: 50,
    price: 40,
    bonus: 10,
    label: 'Popular Pack',
    popular: true
  },
  {
    id: 'value',
    coins: 100,
    price: 70,
    bonus: 30,
    label: 'Value Pack'
  },
  {
    id: 'premium',
    coins: 200,
    price: 120,
    bonus: 80,
    label: 'Premium Pack'
  }
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CoinPurchaseModal({
  isOpen,
  onClose,
  userId,
  currentCoins,
  onPurchaseSuccess
}: CoinPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (pkg: CoinPackage) => {
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
            const userRef = doc(db, 'users', userId);
            const totalCoins = pkg.coins + pkg.bonus;
            
            await updateDoc(userRef, {
              coins: increment(totalCoins),
              lifetimeCoinsEarned: increment(totalCoins)
            });

            // Create transaction record
            await addDoc(collection(db, 'coinTransactions'), {
              userId,
              type: 'purchase',
              amount: totalCoins,
              paymentId: response.razorpay_payment_id,
              packageId: pkg.id,
              price: pkg.price,
              balanceAfter: currentCoins + totalCoins,
              timestamp: serverTimestamp(),
              description: `Purchased ${pkg.label}`
            });

            console.log('✅ Coins added successfully!');
            onPurchaseSuccess();
          } catch (error) {
            console.error('❌ Error updating coins:', error);
            alert('Payment successful but failed to add coins. Please contact support with payment ID: ' + response.razorpay_payment_id);
          }
        },
        prefill: {
          name: 'User',
          email: 'user@example.com'
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
      alert('Failed to initialize payment. Please try again.');
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-400" />
        </button>

        {/* Header */}
        <div className="p-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 animate-pulse">
            <Coins className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 mb-2">
            Buy Coins
          </h2>
          <p className="text-gray-400 text-lg">
            Unlock premium features and skip the wait!
          </p>
          
          {/* Current Balance */}
          <div className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-semibold">Current Balance:</span>
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              {currentCoins}
            </span>
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
        </div>

        {/* Coin Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-8 pb-8">
          {COIN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative group cursor-pointer transition-all duration-300 ${
                pkg.popular
                  ? 'transform hover:scale-105'
                  : 'hover:scale-102'
              }`}
              onClick={() => !isProcessing && handlePurchase(pkg)}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full shadow-lg">
                    <Star className="w-4 h-4 text-white fill-white" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                  pkg.popular
                    ? 'bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-purple-900/40 border-pink-500/50 shadow-lg shadow-pink-500/20'
                    : 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/50 hover:border-purple-500/50'
                } ${
                  selectedPackage?.id === pkg.id && isProcessing
                    ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900'
                    : ''
                }`}
              >
                {/* Package Icon */}
                <div className="flex justify-center mb-4">
                  {pkg.id === 'starter' && (
                    <Gift className="w-12 h-12 text-blue-400" />
                  )}
                  {pkg.id === 'popular' && (
                    <Zap className="w-12 h-12 text-yellow-400" />
                  )}
                  {pkg.id === 'value' && (
                    <Sparkles className="w-12 h-12 text-purple-400" />
                  )}
                  {pkg.id === 'premium' && (
                    <Crown className="w-12 h-12 text-orange-400" />
                  )}
                </div>

                {/* Package Label */}
                <h3 className="text-xl font-bold text-white text-center mb-2">
                  {pkg.label}
                </h3>

                {/* Coins Display */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                      {pkg.coins}
                    </span>
                    <Coins className="w-8 h-8 text-yellow-400" />
                  </div>
                  
                  {/* Bonus Coins */}
                  {pkg.bonus > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                      <Sparkles className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">
                        +{pkg.bonus} Bonus
                      </span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-1">
                    <span className="text-3xl font-bold text-white">₹{pkg.price}</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Total: {pkg.coins + pkg.bonus} coins
                    </p>
                  )}
                </div>

                {/* Value Indicator */}
                {pkg.bonus > 0 && (
                  <div className="text-center mb-4">
                    <span className="text-xs text-purple-400 font-medium">
                      ₹{(pkg.price / (pkg.coins + pkg.bonus)).toFixed(2)} per coin
                    </span>
                  </div>
                )}

                {/* Buy Button */}
                <button
                  disabled={isProcessing}
                  className={`w-full mt-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                  } ${
                    isProcessing && selectedPackage?.id === pkg.id
                      ? 'opacity-75 cursor-not-allowed'
                      : 'hover:scale-105'
                  }`}
                >
                  {isProcessing && selectedPackage?.id === pkg.id ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/30">
            <h4 className="text-lg font-semibold text-white mb-4 text-center">
              What can you do with coins?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Skip ads instantly</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Choose chat gender preference</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Continue chats beyond 5 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Access premium features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center text-xs text-gray-500">
          <p>Secure payment powered by Razorpay</p>
          <p className="mt-1">All transactions are encrypted and secure</p>
        </div>
      </div>
    </div>
  );
}
