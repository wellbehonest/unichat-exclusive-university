#!/bin/bash

# Ad Video Download Script
# This script downloads a sample video for testing the ad system

echo "🎬 Ad Video Download Script"
echo "============================"
echo ""

cd "$(dirname "$0")/public"

echo "📂 Current directory: $(pwd)"
echo ""

# Check if video already exists
if [ -f "ad-video.mp4" ]; then
    echo "✅ Video already exists!"
    ls -lh ad-video.mp4
    echo ""
    read -p "Do you want to replace it? (y/N): " replace
    if [[ ! $replace =~ ^[Yy]$ ]]; then
        echo "Keeping existing video. Exiting."
        exit 0
    fi
    rm ad-video.mp4
fi

echo "📥 Downloading sample video..."
echo ""

# Try multiple sources
echo "Trying source 1: Google sample video..."
if curl -L --fail --max-time 30 -o ad-video.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 2>/dev/null; then
    echo "✅ Download complete!"
else
    echo "❌ Failed. Trying source 2..."
    if curl -L --fail --max-time 30 -o ad-video.mp4 "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" 2>/dev/null; then
        echo "✅ Download complete!"
    else
        echo "❌ Failed. Creating placeholder..."
        
        # Check if ffmpeg is available
        if command -v ffmpeg &> /dev/null; then
            echo "🎬 Generating 30-second test video with ffmpeg..."
            ffmpeg -f lavfi -i color=c=black:s=1280x720:d=30 \
                -vf "drawtext=text='Test Ad Video - 30 Seconds':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2" \
                -c:v libx264 -pix_fmt yuv420p -t 30 ad-video.mp4 -y 2>/dev/null
            
            if [ -f "ad-video.mp4" ]; then
                echo "✅ Test video created successfully!"
            else
                echo "❌ Failed to create video"
                exit 1
            fi
        else
            echo ""
            echo "⚠️  ffmpeg not found. Install it with:"
            echo "    brew install ffmpeg"
            echo ""
            echo "Or manually download any MP4 video and save it as:"
            echo "    public/ad-video.mp4"
            exit 1
        fi
    fi
fi

echo ""
echo "✅ Setup complete!"
ls -lh ad-video.mp4
echo ""
echo "🚀 Now refresh your browser and try watching an ad!"
