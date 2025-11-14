# How to Test Google IMA SDK

## Quick Test Page

I've created a dedicated test page to diagnose IMA loading issues.

### Access the test page:

**URL:** `http://localhost:3001/ima-test.html`

### What it does:

1. **Test 1: IMA SDK Loading**
   - Checks if `window.google.ima` exists
   - Shows IMA SDK version
   - ✅ Green = SDK loaded successfully
   - ❌ Red = SDK not loaded (ad blocker or network issue)

2. **Test 2: Ad Request**
   - Tests if Google's ad servers are reachable
   - Verifies VAST XML response
   - ✅ Green = Ad servers working
   - ❌ Red = Network or CORS issue

3. **Test 3: Play Test Ad**
   - Actually plays a Google IMA test ad
   - Shows real-time logs
   - ✅ Green = Ad playing successfully
   - ❌ Red = Playback error

### How to use:

1. **Open in browser:** `http://localhost:3001/ima-test.html`

2. **Click buttons in order:**
   - Button 1: Test IMA SDK Loading
   - Button 2: Test Ad Request  
   - Button 3: Play Test Ad

3. **Check the results:**
   - Status box shows success/error
   - Console logs show detailed info

4. **Share results with me:**
   - What color is the status box?
   - What do the logs say?
   - Does the ad play?

## Common Results

### ✅ Success (Everything Works):
```
Status: ✅ IMA SDK Loaded Successfully! Version: 3.x.x
Logs: 
  ✅ window.google exists
  ✅ window.google.ima exists
  ✅ IMA SDK loaded successfully!
  ✅ Ad server responded with status: 200
  ✅ Valid VAST XML response received
  ✅ Ads manager loaded!
  ✅ Ad loaded!
  ✅ Ad started playing!
```

### ❌ Ad Blocker Detected:
```
Status: ❌ Google namespace not found - SDK not loaded
Logs:
  ❌ window.google is undefined
```
**Solution:** Disable ad blocker for localhost

### ⚠️ Network Issue:
```
Status: ✅ IMA SDK Loaded
But later:
Status: ❌ Ad Request Failed: Failed to fetch
```
**Solution:** Check internet connection, or use fallback

### 🔄 CORS Issue (Normal on localhost):
```
Status: ❌ Ad Error: CORS policy...
```
**Solution:** This is expected on some localhost setups. Fallback will work.

## Next Steps

### If Test Page Shows Success:
Your IMA setup is working! The issue might be:
- React component timing
- Ad blocker in main app
- Different browser tab/window

**Solution:** I'll update the component to match the working test page

### If Test Page Shows Error:
Then we know the issue and can fix it:
- Ad blocker → Disable it
- Network → Check connection
- SDK not loading → Check browser console

---

**Try it now:** `http://localhost:3001/ima-test.html`

Then tell me what you see! 🎯
