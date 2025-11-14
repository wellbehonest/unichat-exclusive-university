import React, { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, RefreshCw, CheckCircle, Gift } from 'lucide-react';

interface GoogleIMAPlayerProps {
  onComplete: () => void;
  onClose: () => void;
}

// Google IMA Test Ad Tag - 30 second non-skippable linear video ad
const AD_TAG_URL = 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

declare global {
  interface Window {
    google: {
      ima: {
        AdDisplayContainer: any;
        AdsLoader: any;
        AdsManagerLoadedEvent: any;
        AdsRequest: any;
        AdsRenderingSettings: any;
        ViewMode: any;
        AdErrorEvent: any;
        AdEvent: any;
        VERSION: string;
      };
    };
  }
}

export default function GoogleIMAPlayer({ onComplete, onClose }: GoogleIMAPlayerProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [adStarted, setAdStarted] = useState(false);
  const [adDuration, setAdDuration] = useState(0);
  const [imaReady, setImaReady] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  
  const adsManagerRef = useRef<any>(null);
  const adDisplayContainerRef = useRef<any>(null);
  const adsLoaderRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Check if IMA SDK is loaded, wait if necessary
  useEffect(() => {
    console.log('🎬 GoogleIMAPlayer mounted - IMA ONLY mode (no fallback)');
    console.log('🔍 Checking IMA SDK availability...');
    
    let checkAttempts = 0;
    const maxAttempts = 30; // Wait up to 3 seconds
    
    const checkIMA = () => {
      checkAttempts++;
      
      if (window.google && window.google.ima) {
        console.log('✅ IMA SDK loaded successfully! (attempt', checkAttempts, ')');
        console.log('📊 IMA SDK Version:', window.google.ima.VERSION);
        setImaReady(true);
        setIsLoading(false);
        return true;
      }
      
      if (checkAttempts >= maxAttempts) {
        console.error('❌ IMA SDK failed to load after', maxAttempts, 'attempts (3 seconds)');
        console.error('💡 Possible reasons:');
        console.error('  1. Ad blocker is blocking imasdk.googleapis.com');
        console.error('  2. Network connectivity issue');
        console.error('  3. Script tag missing from index.html');
        console.error('  4. Browser extension blocking Google scripts');
        setError('Failed to load Google IMA SDK. Please disable ad blocker and refresh.');
        setIsLoading(false);
        return false;
      }
      
      if (checkAttempts % 5 === 0) {
        console.log('⏳ Still waiting for IMA SDK... (attempt', checkAttempts, '/', maxAttempts, ')');
      }
      
      setTimeout(checkIMA, 100);
      return false;
    };
    
    checkIMA();
  }, []);

  // Initialize IMA when SDK is ready
  useEffect(() => {
    if (!imaReady) return;
    
    console.log('🚀 IMA SDK ready, initializing ad player...');
    
    const timer = setTimeout(() => {
      initializeIMA();
    }, 200);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [imaReady]);

  // Handle window resize for responsive ad sizing
  useEffect(() => {
    if (!adsManagerRef.current) return;

    const handleResize = () => {
      if (adsManagerRef.current) {
        try {
          const container = adContainerRef.current;
          const width = container?.clientWidth || window.innerWidth;
          const height = container?.clientHeight || Math.floor(width * 9 / 16);
          
          console.log('📐 Resizing ad to:', width, 'x', height);
          adsManagerRef.current.resize(width, height, window.google.ima.ViewMode.NORMAL);
        } catch (err) {
          console.warn('Could not resize ad:', err);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [adStarted]);

  const initializeIMA = () => {
    try {
      console.log('🎬 Initializing Google IMA...');
      
      const video = videoRef.current;
      const adContainer = adContainerRef.current;
      
      if (!video || !adContainer) {
        console.error('❌ Video or ad container not found');
        setError('Video player initialization failed');
        setIsLoading(false);
        return;
      }

      console.log('✅ Video and container elements ready');

      // Create ad display container
      console.log('📦 Creating AdDisplayContainer...');
      adDisplayContainerRef.current = new window.google.ima.AdDisplayContainer(
        adContainer,
        video
      );
      console.log('✅ AdDisplayContainer created');

      // Create ads loader
      console.log('📦 Creating AdsLoader...');
      adsLoaderRef.current = new window.google.ima.AdsLoader(
        adDisplayContainerRef.current
      );
      console.log('✅ AdsLoader created');

      // Add event listeners
      adsLoaderRef.current.addEventListener(
        window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        onAdsManagerLoaded,
        false
      );

      adsLoaderRef.current.addEventListener(
        window.google.ima.AdErrorEvent.Type.AD_ERROR,
        onAdError,
        false
      );

      console.log('✅ Event listeners attached');

      // Request ads
      requestAds();
    } catch (err: any) {
      console.error('❌ IMA initialization failed:', err);
      setError(`Initialization error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const requestAds = () => {
    try {
      console.log('🎬 Requesting ads from Google IMA...');
      console.log('📡 Ad Tag URL:', AD_TAG_URL);
      
      const adsRequest = new window.google.ima.AdsRequest();
      adsRequest.adTagUrl = AD_TAG_URL;
      
      // Get container dimensions for responsive sizing
      const container = adContainerRef.current;
      const width = container?.clientWidth || window.innerWidth;
      const height = container?.clientHeight || Math.floor(width * 9 / 16); // 16:9 aspect ratio
      
      console.log(`📐 Ad slot size: ${width}x${height}`);
      
      // Specify the linear ad slot size (responsive)
      adsRequest.linearAdSlotWidth = width;
      adsRequest.linearAdSlotHeight = height;
      
      adsRequest.nonLinearAdSlotWidth = width;
      adsRequest.nonLinearAdSlotHeight = 150;
      
      console.log('📤 Sending ad request...');
      adsLoaderRef.current.requestAds(adsRequest);
      console.log('✅ Ad request sent successfully');
      
    } catch (err: any) {
      console.error('❌ Ad request failed:', err);
      setError(`Ad request failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  const onAdsManagerLoaded = (adsManagerLoadedEvent: any) => {
    try {
      console.log('✅ Ads manager loaded successfully!');
      
      const adsRenderingSettings = new window.google.ima.AdsRenderingSettings();
      adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
      
      adsManagerRef.current = adsManagerLoadedEvent.getAdsManager(
        videoRef.current,
        adsRenderingSettings
      );
      
      console.log('✅ Ads manager instance created');
      
      // Add ads manager event listeners
      adsManagerRef.current.addEventListener(
        window.google.ima.AdErrorEvent.Type.AD_ERROR,
        onAdError
      );
      
      adsManagerRef.current.addEventListener(
        window.google.ima.AdEvent.Type.LOADED,
        onAdLoaded
      );
      
      adsManagerRef.current.addEventListener(
        window.google.ima.AdEvent.Type.STARTED,
        onAdStarted
      );
      
      adsManagerRef.current.addEventListener(
        window.google.ima.AdEvent.Type.COMPLETE,
        onAdComplete
      );
      
      adsManagerRef.current.addEventListener(
        window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
        onAdComplete
      );
      
      adsManagerRef.current.addEventListener(
        window.google.ima.AdEvent.Type.SKIPPED,
        () => {
          console.log('⏭️ Ad was skipped');
        }
      );

      console.log('✅ All event listeners attached to ads manager');

      // Initialize the container
      console.log('🎬 Initializing ad display container...');
      adDisplayContainerRef.current.initialize();

      try {
        console.log('🎬 Starting ads manager...');
        
        // Get responsive dimensions
        const container = adContainerRef.current;
        const width = container?.clientWidth || window.innerWidth;
        const height = container?.clientHeight || Math.floor(width * 9 / 16);
        
        console.log(`📐 Initializing with size: ${width}x${height}`);
        
        adsManagerRef.current.init(width, height, window.google.ima.ViewMode.NORMAL);
        adsManagerRef.current.start();
        console.log('✅ Ads manager started');
      } catch (adError: any) {
        console.error('❌ AdsManager start error:', adError);
        setError(`Ad playback error: ${adError.message}`);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('❌ Failed to create ads manager:', err);
      setError(`Ads manager error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const onAdLoaded = (adEvent: any) => {
    console.log('✅ Ad loaded and ready to play');
    const ad = adEvent.getAd();
    const duration = ad.getDuration();
    setAdDuration(duration);
    console.log(`📊 Ad details:`);
    console.log(`  - Duration: ${duration} seconds`);
    console.log(`  - Skippable: ${ad.isSkippable()}`);
    console.log(`  - Linear: ${ad.isLinear()}`);
    setIsLoading(false);
  };

  const onAdStarted = (adEvent: any) => {
    console.log('✅ Ad started playing!');
    setAdStarted(true);
    setIsLoading(false);
    setError(null);
    
    const ad = adEvent.getAd();
    const duration = ad.getDuration();
    console.log(`🎬 Playing ${duration}s ad`);
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Update progress every 100ms
    progressIntervalRef.current = setInterval(() => {
      if (adsManagerRef.current) {
        try {
          const remainingTime = adsManagerRef.current.getRemainingTime();
          const currentTime = duration - remainingTime;
          const percent = (currentTime / duration) * 100;
          setProgress(Math.min(Math.max(percent, 0), 100));
        } catch (err) {
          // Manager might be destroyed, stop interval
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
      }
    }, 100);
  };

  const onAdComplete = () => {
    console.log('✅ Ad completed successfully!');
    setProgress(100);
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Show completion screen
    setShowCompletionScreen(true);
    
    // Call the completion callback (grant credit)
    console.log('🎁 Granting credit to user...');
    onComplete();
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const onAdError = (adErrorEvent: any) => {
    console.error('❌ Ad error occurred');
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Try to extract error details
    try {
      const error = adErrorEvent.getError ? adErrorEvent.getError() : adErrorEvent;
      const errorCode = error?.getErrorCode ? error.getErrorCode() : 'Unknown';
      const errorMessage = error?.getMessage ? error.getMessage() : String(error);
      const errorType = error?.getType ? error.getType() : 'Unknown';
      
      console.error('📋 Error details:');
      console.error('  - Code:', errorCode);
      console.error('  - Message:', errorMessage);
      console.error('  - Type:', errorType);
      
      setError(`Ad error ${errorCode}: ${errorMessage}`);
    } catch (e) {
      console.error('Raw error:', adErrorEvent);
      setError('Ad playback failed. Please try again.');
    }
    
    // Destroy the ads manager
    if (adsManagerRef.current) {
      adsManagerRef.current.destroy();
      adsManagerRef.current = null;
    }
    
    setIsLoading(false);
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up IMA player...');
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (adsManagerRef.current) {
      try {
        adsManagerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying ads manager:', e);
      }
      adsManagerRef.current = null;
    }
    
    if (adsLoaderRef.current) {
      try {
        adsLoaderRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying ads loader:', e);
      }
      adsLoaderRef.current = null;
    }
    
    console.log('✅ Cleanup complete');
  };

  const handleRetry = () => {
    console.log('🔄 Retrying ad load...');
    setError(null);
    setIsLoading(true);
    setProgress(0);
    setAdStarted(false);
    setImaReady(false);
    
    // Re-check IMA SDK
    window.location.reload();
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 md:p-8">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-xl sm:rounded-2xl shadow-2xl w-full h-auto max-w-7xl overflow-hidden border border-purple-500/30" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-3 md:p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl md:text-3xl font-bold text-white">Watch Ad to Continue</h3>
            <p className="text-sm md:text-lg text-purple-100 mt-1">
              Powered by Google IMA
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 md:p-3 hover:bg-white/20 rounded-full transition-colors"
            title="Close"
          >
            <X className="text-white" size={28} />
          </button>
        </div>

        {/* Video Container - Responsive aspect ratio */}
        <div className="relative bg-black w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
          {/* IMA Ad Container */}
          <div
            ref={adContainerRef}
            className="absolute inset-0 z-10"
          />
          
          {/* Video Element (used by IMA) */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
          />

          {/* Loading Overlay */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 md:h-24 w-16 md:w-24 border-4 md:border-6 border-purple-500 border-t-transparent"></div>
                <p className="text-white mt-6 font-semibold text-lg md:text-3xl">
                  Loading Google ad...
                </p>
                <p className="text-gray-400 text-sm md:text-xl mt-3">
                  Please wait, requesting ad from Google IMA
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
              <div className="text-center p-6 md:p-12 max-w-2xl mx-4">
                <AlertCircle className="mx-auto text-red-400 mb-6 md:mb-8" size={80} />
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 md:mb-6">Ad Failed to Load</h3>
                <p className="text-base md:text-2xl text-red-400 mb-8 md:mb-12">{error}</p>
                
                <div className="bg-gray-800 rounded-xl p-6 md:p-8 mb-8 md:mb-12 text-left">
                  <p className="text-base md:text-xl text-gray-300 mb-4 font-semibold">Possible solutions:</p>
                  <ul className="text-sm md:text-lg text-gray-400 space-y-3 ml-6">
                    <li>• Disable ad blocker for this site</li>
                    <li>• Check your internet connection</li>
                    <li>• Try a different browser (Chrome recommended)</li>
                    <li>• Disable browser extensions temporarily</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleRetry}
                  className="px-8 md:px-12 py-4 md:py-5 bg-purple-600 hover:bg-purple-700 text-white text-base md:text-xl rounded-xl font-semibold transition-all flex items-center gap-3 mx-auto shadow-lg hover:shadow-2xl hover:scale-105"
                >
                  <RefreshCw size={24} />
                  Retry Loading Ad
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Completion Screen Overlay */}
        {showCompletionScreen && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-xl bg-black/40 z-30 animate-fadeIn">
            <div className="text-center p-8 max-w-lg">
              {/* Success Animation */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-green-500/20 rounded-full animate-ping"></div>
                </div>
                <CheckCircle className="mx-auto text-green-400 relative z-10 drop-shadow-lg" size={96} />
              </div>
              
              {/* Success Message */}
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 animate-slideUp drop-shadow-lg">
                🎉 Ad Completed!
              </h2>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 shadow-2xl">
                <Gift className="mx-auto text-yellow-400 mb-3 drop-shadow-lg" size={48} />
                <p className="text-xl md:text-2xl text-white font-semibold mb-2 drop-shadow-lg">
                  Credit Granted Successfully!
                </p>
                <p className="text-base md:text-lg text-gray-100 drop-shadow-md">
                  Thank you for watching the ad
                </p>
              </div>
              
              <p className="text-sm md:text-base text-gray-200 animate-pulse drop-shadow-md">
                Closing automatically in a moment...
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {!error && (
          <div className="bg-gray-800 p-4 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base md:text-2xl text-gray-300 font-semibold">
                {adStarted ? '🎬 Ad Playing' : '⏳ Loading...'}
              </span>
              <span className="text-base md:text-3xl text-purple-400 font-bold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 md:h-6 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-4 md:h-6 rounded-full transition-all duration-100 shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
            {adDuration > 0 && (
              <p className="text-sm md:text-lg text-gray-400 mt-4 text-center font-medium">
                {progress >= 100 
                  ? '✅ Ad completed! Credit will be granted.' 
                  : `Watch the complete ${adDuration}s ad to earn credit`
                }
              </p>
            )}
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && !error && (
          <div className="bg-gray-900 p-2 sm:p-4 border-t border-gray-700">
            <p className="text-xs sm:text-sm text-gray-400">
              <strong>Debug:</strong> Google IMA Only | 
              Progress: {progress.toFixed(1)}% | 
              Started: {adStarted ? 'Yes' : 'No'} | 
              Duration: {adDuration}s
            </p>
          </div>
        )}
      </div>
    </div>
  </>
  );
}
