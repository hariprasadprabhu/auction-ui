# Logo Setup Instructions

## Overview
The AuctionDeck logo has been integrated into all screens of the application. To complete the setup, follow these steps:

## Installation

### 1. Place the Logo File
Save your AuctionDeck logo image as `logo.png` in the following directory:

```
src/assets/images/logo.png
```

If the `src/assets/images/` directory doesn't exist, create it manually or it will be created when you run the application the first time.

### 2. Logo Specifications
- **Format**: PNG (transparent background recommended)
- **Dimensions**: Recommended 300x300px or higher for high-quality display
- **Aspect Ratio**: 1:1 (square) works best
- **File Size**: Optimize for web (aim for under 100KB)

### 3. Updated Components
The logo is now displayed in the following locations:

#### Home Page (`src/app/home/`)
- Navigation bar (header)
- Footer brand section

#### Authentication Pages
- **Login Page** (`src/app/auth/login/`)
- **Signup Page** (`src/app/auth/signup/`)

#### Player Registration
- **Player Register Page** (`src/app/player/register/`)

### 4. Styling
The logo styling is already configured with:
- Responsive sizing (automatically scales on different screens)
- Hover effects (slight scale animation)
- Proper alignment and spacing
- Fallback support if image fails to load

### 5. Responsive Behavior
The logo sizes are:
- **Home Navigation**: 50px height
- **Home Footer**: 60px height
- **Login/Signup**: 60px height
- **Player Register**: 45px height

All sizes automatically adjust to maintain aspect ratio.

### 6. Verification
Once you've placed the logo file:

1. Run the development server:
   ```bash
   ng serve
   ```

2. Navigate to:
   - Home page (`http://localhost:4200`)
   - Login page (`http://localhost:4200/login`)
   - Signup page (`http://localhost:4200/signup`)

3. Verify the logo appears correctly in all locations

## Troubleshooting

### Logo Not Appearing?

1. **Check file path**: Ensure the file is at `src/assets/images/logo.png`
2. **Check file format**: Ensure it's a valid PNG file
3. **Browser cache**: Clear your browser cache or do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Build error**: Check browser console for any file loading errors

### Image Looks Blurry?

- Use a higher resolution source image (at least 300x300px)
- Ensure the image is properly optimized for web

### Styling Issues?

- Check that CSS classes are properly loaded:
  - `.brand-logo`
  - `.brand-logo-small`
  - `.brand-logo.footer-logo`

## Notes

- The emoji fallback (🏆) is no longer used; it has been completely replaced with the logo image
- All responsive breakpoints and styling automatically adapt to the new logo
- The logo maintains brand consistency across all pages
