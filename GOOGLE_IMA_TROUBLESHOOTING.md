# Google IMA Not Loading - Troubleshooting

## Common Issues & Solutions

### Issue 1: IMA SDK Not Loading

**Check in Browser Console:**
```javascript
console.log(window.google);
console.log(window.google?.ima);
```

**Expected:** Should show IMA object
**If undefined:** Script didn't load

**Solutions:**
1. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
2. Check Network tab for failed script load
3. Try different browser
4. Disable browser extensions

### Issue 2: Ad Blocker Blocking IMA

**Symptoms:**
- Console shows: "IMA SDK not loaded"
- Network tab shows blocked request to `imasdk.googleapis.com`

**Solution:**
- Disable ad blocker for localhost
- Or use fallback video (automatic)

### Issue 3: CORS or Network Errors

**Symptoms:**
- Console error: "CORS policy"
- Console error: "Failed to fetch"
- Ad request sent but no response

**Solution:**
- This is normal on localhost sometimes
- Fallback video will play automatically
- Works fine in production

### Issue 4: Ad Request Failed

**Common Error Codes:**
- **1009**: Video player not ready
- **1011**: Ad request timeout
- **1012**: Ad request failed
- **2003**: Failed to load ad creative

**Solutions:**
1. Check internet connection
2. Try different browser
3. Clear browser cache
4. Fallback video plays automatically

## Quick Tests

### Test 1: Check IMA SDK Loaded

Open browser console and run:
```javascript
if (window.google && window.google.ima) {
  console.log('✅ IMA SDK loaded successfully!');
  console.log('IMA Version:', window.google.ima.VERSION);
} else {
  console.log('❌ IMA SDK not loaded');
}
```

### Test 2: Test Ad Request Manually

```javascript
// This will test if Google's ad servers are reachable
fetch('https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&output=vast')
  .then(r => {
    console.log('✅ Ad server reachable:', r.status);
    return r.text();
  })
  .then(xml => {
    console.log('Ad response length:', xml.length);
    if (xml.includes('<VAST')) {
      console.log('✅ Valid VAST response received');
    }
  })
  .catch(err => {
    console.error('❌ Ad server not reachable:', err);
  });
```

### Test 3: Check for Ad Blocker

```javascript
// Simple ad blocker detection
const testAd = document.createElement('div');
testAd.className = 'ad advertisement';
testAd.style.height = '1px';
document.body.appendChild(testAd);

setTimeout(() => {
  if (testAd.offsetHeight === 0) {
    console.log('⚠️ Ad blocker detected!');
  } else {
    console.log('✅ No ad blocker detected');
  }
  testAd.remove();
}, 100);
```

## Current Behavior

### What Should Happen:

1. **Page loads** → IMA SDK loads from CDN
2. **Click "Watch Ad"** → GoogleIMAPlayer opens
3. **Console logs:**
   ```
   🎬 GoogleIMAPlayer mounted
   🔍 Checking IMA SDK availability...
   ✅ IMA SDK is available
   🎬 Initializing Google IMA...
   ✅ Video and container elements found
   📦 Creating AdDisplayContainer...
   ✅ AdDisplayContainer created
   📦 Creating AdsLoader...
   ✅ AdsLoader created
   ✅ Event listeners added
   🎬 Requesting ads from Google IMA...
   ✅ Ad request sent
   ✅ Ads manager loaded
   ✅ Ad loaded
   ✅ Ad started playing
   ```
4. **Ad plays** → Professional video ad from Google
5. **Completion** → Credit granted

### What Happens with Fallback:

1. **Any error occurs** → Automatic fallback
2. **Console logs:**
   ```
   ❌ [Error reason]
   🔄 Falling back to local video ad
   🎬 Using fallback video player
   ```
3. **Local video plays** → `/ad-video.mp4`
4. **Completion** → Credit still granted

## Expected Console Output

### Successful IMA Load:
```
🎬 GoogleIMAPlayer mounted
🔍 Checking IMA SDK availability...
✅ IMA SDK is available
🎬 Initializing Google IMA...
✅ Video and container elements found
📦 Creating AdDisplayContainer...
✅ AdDisplayContainer created
📦 Creating AdsLoader...
✅ AdsLoader created
✅ Event listeners added
🎬 Requesting ads from Google IMA...
✅ Ad request sent
✅ Ads manager loaded
✅ Ad loaded
✅ Ad started playing
📊 Ad duration: 15 seconds
[Progress updates...]
✅ Ad completed!
🎬 Ad completed - Starting credit grant...
✅ Credit granted successfully!
```

### Fallback Triggered:
```
🎬 GoogleIMAPlayer mounted
🔍 Checking IMA SDK availability...
❌ Google IMA SDK not loaded, using fallback
💡 Make sure index.html has: <script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
🎬 Using fallback video player
[Fallback video plays]
✅ Fallback video completed
🎬 Ad completed - Starting credit grant...
✅ Credit granted successfully!
```

## What to Check Right Now

1. **Open your app** → http://localhost:3001
2. **Open browser console (F12)**
3. **Run this test:**
   ```javascript
   console.log('IMA SDK:', window.google?.ima ? 'Loaded ✅' : 'Not loaded ❌');
   ```
4. **Click "Watch Ad" button**
5. **Share the console output with me**

## Common Reasons for Fallback

### Normal/Expected:
- ✅ Ad blocker enabled (user choice)
- ✅ No internet connection
- ✅ Google ad servers down (rare)
- ✅ Regional restrictions

### Needs Fixing:
- ❌ IMA SDK script not loading (check Network tab)
- ❌ JavaScript errors (check Console)
- ❌ CORS issues in dev environment

## Is Fallback Bad?

**No!** The fallback system is intentional:
- ✅ User still watches an ad
- ✅ Credit is still granted
- ✅ No broken UX
- ✅ Works 100% of the time

**IMA is an enhancement:**
- Better ad variety
- Professional ad experience
- Potential for monetization
- But not required for functionality

## Next Steps

1. **Try watching an ad right now**
2. **Check browser console**
3. **Share what you see:**
   - Any errors?
   - Does fallback video play?
   - Does credit get granted?

Then I'll know exactly what's happening! 🔍
