# MOJO Music

A static-first, six-page website for the Southwest Florida live music duo MOJO. The site uses semantic HTML, modern CSS, vanilla JavaScript, editable JSON content, and one small Cloudflare Worker endpoint for booking inquiries.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run prepare:images
npm run dev
```

Visit `http://127.0.0.1:5173/`.

## Content updates

Frequently edited content lives in `public/data/`:

- `site.json` — brand, booking, and social links
- `shows.json` — event dates and venue details
- `music.json` — track listings and future audio URLs
- `videos.json` — YouTube IDs, categories, and thumbnails
- `gallery.json` — curated gallery images and alt text

Member names and finalized bios should be added in `about/index.html` when supplied. The current role-based profiles avoid inventing personal details.

## Video and audio

Add a YouTube video ID to `youtubeId` in `public/data/videos.json`. The page loads only the thumbnail until a visitor presses play. Add an audio file URL to `audioUrl` in `public/data/music.json` to enable playback; current tracks are clearly marked sample listings.

## Booking email

The `/api/booking` endpoint validates and sanitizes fields, uses a honeypot and timing check, rejects obvious spam, and sends through Cloudflare Email Service. The `EMAIL` binding is restricted to the verified `mojoduomusic@gmail.com` destination, and messages come from `MOJO Website <booking@mojomusic.org>`. No API key or hosted secret is required. Local preview mode returns a successful test response without sending email.

## Cloudflare deployment

Connect `runningfoo/mojo-music` to a Worker named `mojo-music` with these Workers Builds settings:

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production deploy command: `npx wrangler versions upload`
- Root directory: `/`

Onboard `mojomusic.org` for Cloudflare Email Sending, verify `mojoduomusic@gmail.com` as an Email Routing destination, and attach the production hostname under **Domains & Routes** as a Custom Domain.

## Quality checks

```bash
npm test
npm run build
```

The production canonical and sitemap URLs use `https://mojomusic.org`. Social and booking placeholder values should also be replaced before launch.
