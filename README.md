# Tryin. — Virtual Try-On App

A luxury fashion virtual try-on website powered by Google Gemini AI.

## Features
- Upload a product/model image (the outfit)
- Upload your own photo
- Click "Try On" — Gemini AI dresses you in the outfit
- Download the result

## Setup & Run

### 1. Prerequisites
- Node.js 18+ installed
- A Google Gemini API key (free at https://aistudio.google.com/app/apikey)

### 2. Install dependencies
```bash
npm install
```

### 3. Add your Gemini API key

**Option A — .env file (recommended):**
```bash
cp .env.example .env
```
Then open `.env` and replace `your_gemini_api_key_here` with your real key:
```
GEMINI_API_KEY=AIza...your_key_here
```

### 4. Start the dev server
```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 5. Build for production
```bash
npm run build
npm run preview
```

## How it works
1. Upload the outfit/product image (Image I)
2. Upload the customer photo (Image II)
3. Click **Try On**
4. Gemini's image generation model analyzes both images and generates a new image of the customer wearing the outfit
5. Download your result

## Tips for best results
- Use clear, well-lit photos
- Front-facing, full-body or upper-body shots work best
- Plain or simple backgrounds help the AI focus on clothing
- The AI preserves your face, hair, skin tone, pose, and background

## Tech Stack
- React 18 + Vite
- @google/generative-ai SDK
- Gemini 2.0 Flash (image generation model)
- Pure CSS (no UI library)
