import React, { useRef, useEffect, useState } from 'react';

interface AdVideoPlayerProps {
    onComplete: () => void;
    onClose?: () => void;
    videoUrl: string;
}

const AdVideoPlayer: React.FC<AdVideoPlayerProps> = ({ onComplete, onClose, videoUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = useState(0);
    const [hasCompleted, setHasCompleted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [videoError, setVideoError] = useState<string | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Prevent right-click context menu
        const preventContext = (e: MouseEvent) => e.preventDefault();
        video.addEventListener('contextmenu', preventContext);

        // Prevent keyboard controls (space, arrow keys)
        const preventKeyboard = (e: KeyboardEvent) => {
            if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener('keydown', preventKeyboard);

        // Track video progress
        const handleTimeUpdate = () => {
            if (video.duration) {
                const percent = (video.currentTime / video.duration) * 100;
                setProgress(percent);
                setCurrentTime(video.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleEnded = () => {
            setHasCompleted(true);
            setProgress(100);
            onComplete();
        };

        const handleError = (e: Event) => {
            console.error('Video failed to load:', e);
            setVideoError('Unable to load advertisement');
        };

        // Prevent seeking (if user tries to manipulate the video)
        const handleSeeking = () => {
            if (!hasCompleted && video.currentTime > video.duration * 0.99) {
                return;
            }
            video.currentTime = currentTime;
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('seeking', handleSeeking);
        video.addEventListener('error', handleError);

        // Auto-play the video
        video.play().catch(err => {
            console.error('Autoplay failed:', err);
        });

        return () => {
            video.removeEventListener('contextmenu', preventContext);
            document.removeEventListener('keydown', preventKeyboard);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('seeking', handleSeeking);
            video.removeEventListener('error', handleError);
        };
    }, [onComplete, hasCompleted, currentTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-4xl">
                {/* Error Message */}
                {videoError && (
                    <div className="bg-dark-card border border-red-500/30 text-white p-8 rounded-2xl text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-2xl font-bold mb-3">Unable to Load Ad</h3>
                        <p className="text-gray-400 mb-6">We're having trouble loading the advertisement. Please try again in a moment.</p>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-8 rounded-lg transition-colors"
                            >
                                Go Back
                            </button>
                        )}
                    </div>
                )}

                {/* Video Container */}
                {!videoError && (
                <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
                    {/* Video Element - NO CONTROLS */}
                    <video
                        ref={videoRef}
                        className="w-full h-auto"
                        src={videoUrl}
                        playsInline
                        disablePictureInPicture
                        controlsList="nodownload nofullscreen noremoteplayback"
                        // NO controls attribute - completely disabled
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'none' }} // Disable all mouse interactions
                    />

                    {/* Custom Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                            <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Time Display */}
                        <div className="flex justify-between items-center text-white text-sm">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="font-semibold">Watch full video to earn credit</span>
                            </div>
                            <span className="font-mono">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Completion Status */}
                        {hasCompleted && (
                            <div className="mt-2 text-center text-green-400 font-semibold text-sm">
                                ✅ Video completed! Credit granted!
                            </div>
                        )}
                    </div>

                    {/* Overlay to prevent clicking on video */}
                    <div 
                        className="absolute inset-0 cursor-not-allowed"
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ pointerEvents: 'all' }}
                        onClick={(e) => e.preventDefault()}
                    />
                </div>
                )}

                {/* Close Button (only after completion) */}
                {!videoError && hasCompleted && onClose && (
                    <button
                        onClick={onClose}
                        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center text-lg"
                    >
                        ✓ Continue (Credit Added)
                    </button>
                )}

                {/* Warning if not completed */}
                {!videoError && !hasCompleted && (
                    <div className="mt-4 text-center text-gray-400 text-sm">
                        ⚠️ You must watch the entire video to earn your credit
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdVideoPlayer;
