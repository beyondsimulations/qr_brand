# QR x Brand

Branded QR code generator deployed as a static site on Cloudflare Pages at `qrbrand.byndsim.com`.

## Project Structure

```
public/           Static site root (served by Cloudflare Pages)
  index.html      Page structure and markup
  css/style.css   All styles
  js/app.js       Application logic (vanilla JS, no build step)
```

## Architecture

- Pure vanilla JavaScript — no frameworks, no build step
- External libraries loaded via CDN: qrcode-generator, jsQR, jsPDF
- Canvas API for QR code rendering, with SVG export via string building
- Single-page application with tab-based UI

## Development

```bash
npm install          # Install wrangler
npm run dev          # Local dev server (wrangler pages dev)
npm run deploy       # Deploy to Cloudflare Pages
```

## Key Concepts

- **ECC levels** (L/M/Q/H) control error correction capacity and determine the safe replacement percentage
- **Dot shapes** define how individual QR modules are rendered (canvas + SVG paths)
- **Finder patterns** are the three large corner squares — styled independently
- **Scatter icons** replace random data dots with uploaded images
- **Center logo** clears a zone in the middle for a brand logo
- **Scannability test** uses jsQR to verify the rendered QR code is still readable
