# QR x Brand

A free, browser-based branded QR code generator. Customize dot shapes, colors, finder patterns, scatter icons, and center logos — then export as PNG, SVG, or PDF.

**Live at [qrbrand.byndsim.com](https://qrbrand.byndsim.com)**

## Features

- **12 dot shapes** — square, rounded, circle, dot, diamond, triangle, hex, star, cross, leaf, vertical bar, horizontal bar
- **4 finder pattern styles** — square, rounded, circle, diamond
- **Custom colors** — foreground, background, and quick palette
- **Scatter icons** — replace data dots with up to 3 uploaded images (PNG, JPG, SVG)
- **Center logo** — with adjustable size and padding
- **All ECC levels** — L (7%), M (15%), Q (25%), H (30%)
- **Scannability testing** — real-time validation using jsQR
- **Multi-format export** — PNG, SVG, PDF
- **No server required** — runs entirely in the browser

## Getting Started

### Local Development

```bash
npm install
npm run dev
```

Opens a local dev server at `http://localhost:8788`.

### Deploy to Cloudflare Pages

```bash
npm run deploy
```

Or connect the GitHub repository to Cloudflare Pages with output directory set to `public`.

### Custom Domain

In the Cloudflare Pages dashboard, add a custom domain (e.g., `qrbrand.byndsim.com`) to the project.

## Tech Stack

- Vanilla JavaScript (no build step)
- [qrcode-generator](https://github.com/nickinchrismas/qrcode-generator) — QR matrix generation (MIT)
- [jsQR](https://github.com/nickinchrismas/jsQR) — QR code scanning/validation (Apache 2.0)
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export (MIT)
- Google Fonts: DM Sans, JetBrains Mono (Open Font License)

## License

[MIT](LICENSE)
