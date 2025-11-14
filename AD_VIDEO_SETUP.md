# Ad Video Setup Instructions

## Add Your Test Video

You need to add a 30-second MP4 video file to test the ad system.

### Option 1: Use Your Own Video

1. Place your video file in the `public` folder
2. Name it `ad-video.mp4`
3. Make sure it's around 30 seconds long

### Option 2: Download a Sample Video

You can use any of these free sources:

**Pexels Videos (Free, No Attribution Required):**
- https://www.pexels.com/videos/
- Download any 30-second video in MP4 format

**Sample Video URLs (Right-click → Save As):**
- https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4
- Or search "sample 30 second mp4 video" on Google

### Quick Test Video Creation (macOS)

If you just want to test quickly, create a simple video with this command:

```bash
# Navigate to your project's public folder
cd /Users/adarshverma/Downloads/unichat---exclusive-university-chat/public

# Create a 30-second black screen video with text (requires ffmpeg)
# Install ffmpeg first: brew install ffmpeg
ffmpeg -f lavfi -i color=c=black:s=1280x720:d=30 -vf "drawtext=text='Test Ad Video - 30 Seconds':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -t 30 ad-video.mp4
```

### After Adding the Video:

1. Refresh your browser
2. Click "Watch Ad to Unlock" when selecting gender filter
3. Video should auto-play and cannot be skipped
4. After 30 seconds, you'll get 1 credit

### Video Requirements:

- ✅ Format: MP4 (H.264 codec recommended)
- ✅ Duration: ~30 seconds (any length works, but 30s is standard)
- ✅ Location: `public/ad-video.mp4`
- ✅ Size: Keep under 10MB for fast loading

### Testing Checklist:

- [ ] Video file exists at `public/ad-video.mp4`
- [ ] Video auto-plays when "Watch Ad" is clicked
- [ ] Cannot skip, pause, or seek the video
- [ ] Progress bar shows completion percentage
- [ ] Credit is granted only after video completes
- [ ] Close button appears only after completion
- [ ] Credit count increases by 1
- [ ] Gender filter match deducts 1 credit

## Troubleshooting

**Video doesn't play:**
- Check browser console for errors
- Verify file exists in `public/` folder
- Try a different MP4 file (some codecs may not be supported)

**Video can be skipped:**
- This shouldn't happen - all controls are disabled
- Report if you find a way to bypass it

**Credit not granted:**
- Check browser console logs
- Verify Firestore rules allow updating `adsWatched` field
- Make sure you're logged in
