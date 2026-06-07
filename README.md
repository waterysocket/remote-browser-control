# Start Browser App

A minimal Next.js app with a single "Start Browser" page.

## Project Structure

```
start-browser-app/
├── app/
│   ├── globals.css       # Global styles + CSS variables
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page (Start Browser button)
│   └── page.module.css   # Page-scoped styles
├── next.config.js
├── package.json
└── tsconfig.json
```

## Run Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for production
```bash
npm run build
npm run start
```

## Requirements
- Node.js 18.17 or later
- npm (comes with Node.js)
