# 📝 Logo & Font Guide for LynZo

## 🔤 LynZo Logo Font - Badeen Display

**Current Status:** Using **Righteous** font from Google Fonts as a temporary fallback (similar display font style).

### To Use Actual Badeen Display Font:

**If you have Badeen Display font files:**

1. Create fonts folder:
```bash
mkdir -p public/fonts
```

2. Copy your Badeen Display font files (`.woff2` or `.ttf`):
```bash
cp ~/Downloads/BadeenDisplay-*.woff2 public/fonts/
```

3. Update `index.css` (replace the Righteous import):
```css
@font-face {
  font-family: 'Badeen Display';
  src: url('/fonts/BadeenDisplay-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

4. Refresh browser - the logo will automatically use Badeen Display!

**Current font stack:** `'Badeen Display', 'Righteous', sans-serif`

---

## 🎨 Recommended Logo Specifications

### **Image Size:**
- **Width:** 120-200 pixels
- **Height:** 40-50 pixels (height is controlled by CSS at 40px = 2.5rem)
- **Aspect Ratio:** Landscape/horizontal orientation works best (roughly 3:1 or 4:1)
- **File Format:** PNG (with transparent background) or SVG (recommended for scalability)

### **Design Tips:**
- ✅ Use a **transparent background** (PNG with alpha channel)
- ✅ Keep it **simple and readable** at small sizes
- ✅ Works well in **dark mode** (your app uses dark theme)
- ✅ High contrast colors or white logo recommended
- ✅ If using SVG, ensure it's optimized and small in file size

## 📁 How to Add Your Logo

### **Step 1: Prepare Your Logo**
1. Create or export your logo with the recommended dimensions
2. Name it `logo.png` (or `logo.svg` if using SVG)
3. Ensure transparent background for best results

### **Step 2: Place Logo File**
Copy your logo file to the `public` folder:
```
unichat---exclusive-university-chat/
├── public/
│   └── logo.png    ← Place your logo here
├── components/
├── services/
└── ...
```

### **Step 3: Access in Code**
The code is already updated! Your logo will automatically appear at:
- **Location:** Top-left corner
- **Path:** `/logo.png` (relative to public folder)
- **Fallback:** If image fails to load, the MessageSquare icon appears

### **Step 4: Test**
1. Save your logo file in the `public/` folder
2. The dev server should hot-reload automatically
3. Refresh your browser at `http://localhost:3000`
4. Your logo should appear in the top-left corner!

## 🔧 Customization Options

### **Change Logo Height:**
In `ChatPage.tsx`, line ~1018, modify the `h-10` class:
```tsx
className="h-10 w-auto mr-3"
          ↑
    h-8  = 32px (smaller)
    h-10 = 40px (current, recommended)
    h-12 = 48px (larger)
    h-16 = 64px (extra large)
```

### **Change Logo Filename:**
If you want to use a different filename (e.g., `unichat-logo.svg`), update line ~1018:
```tsx
src="/logo.png"
       ↓
src="/unichat-logo.svg"
```

### **Add Logo Link (clickable):**
Wrap the logo in an anchor tag to make it clickable:
```tsx
<a href="/" className="flex items-center">
    <img src="/logo.png" alt="UniChat Logo" className="h-10 w-auto mr-3" />
    <h1 className="text-2xl font-bold text-white">UniChat</h1>
</a>
```

### **Remove Text (Logo Only):**
If you want only the logo without "UniChat" text, remove the `<h1>` tag:
```tsx
<div className="flex items-center">
    <img src="/logo.png" alt="UniChat Logo" className="h-10 w-auto" />
</div>
```

## 🖼️ Example Logo Sizes

| Use Case | Width | Height | Notes |
|----------|-------|--------|-------|
| Icon-style | 40px | 40px | Square, perfect for minimal logos |
| Standard | 120px | 40px | Most common, balanced |
| Wide | 160px | 40px | Landscape logos with text |
| Extra Wide | 200px | 40px | Full company name in logo |

## ⚠️ Troubleshooting

### **Logo Not Showing?**
1. ✅ Check file is in `public/` folder (not `public/assets/` or other subfolder)
2. ✅ Check filename matches exactly: `logo.png` (case-sensitive on some systems)
3. ✅ Try hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
4. ✅ Check browser console for 404 errors
5. ✅ Restart dev server: Stop and run `npm run dev` again

### **Logo Too Large/Small?**
- Adjust the `h-10` class in the code (see Customization Options above)
- Or resize your source image file

### **Logo Quality Poor?**
- Use **SVG format** for perfect scaling at any size
- Or use **2x resolution PNG** (e.g., 240x80px for a 120x40px display size)

## 📦 Current Implementation

**File:** `components/ChatPage.tsx` (lines ~1018-1030)

The logo implementation includes:
- ✅ Automatic image loading from `/logo.png`
- ✅ Fallback to MessageSquare icon if image fails
- ✅ Optimized for 40px height (responsive width)
- ✅ Proper spacing and alignment
- ✅ Alt text for accessibility

## 🎉 Quick Start

**Just want to test quickly?**
1. Download any logo PNG file
2. Rename it to `logo.png`
3. Place it in the `public/` folder
4. Refresh browser!

That's it! Your logo should appear immediately. 🚀
