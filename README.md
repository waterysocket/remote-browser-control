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

## Project Status

- **Branch:** main
- **Remote:** origin (https://github.com/waterysocket/remote-browser-control.git)
- **Last updated:** 2026-06-08
- **Working tree:** clean (no uncommitted changes)
- **Ignored directories confirmed:** `node_modules/`, `.next/` (fixed .gitignore encoding and verified)

Notes:
- I fixed the repository `.gitignore` encoding (was UTF-16 with null bytes), rewrote it as UTF-8 so Git can parse it correctly.
- If you need me to remove large tracked directories from the index (e.g., `node_modules`), I can run:

```bash
git rm -r --cached node_modules .next
git commit -m "Remove node_modules and .next from index; rely on .gitignore"
git push origin main
```

