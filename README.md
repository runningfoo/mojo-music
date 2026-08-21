# MOJO Music

A website for the Southwest Florida live music duo MOJO. The site uses semantic HTML, modern CSS, vanilla JavaScript, Cloudflare Workers, D1 for structured content, R2 for uploaded media, and Cloudflare Access for the protected admin CMS.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run prepare:images
npm run dev
```

Visit `http://127.0.0.1:5173/`.

## Content management

Frequently updated content is managed through the protected admin interface at `/admin/`.

Content storage:

- Shows — Cloudflare D1
- Gallery metadata — Cloudflare D1
- Gallery uploads — Cloudflare R2
- Videos — Cloudflare D1 with YouTube hosting
- Music metadata — Cloudflare D1
- Audio uploads — Cloudflare R2

The public site reads content through Worker API endpoints:

- `/api/shows`
- `/api/gallery`
- `/api/videos`
- `/api/music`

Administrative create, edit, delete, and upload operations use protected `/api/admin/*` endpoints. Production access to `/admin/*` and `/api/admin/*` is controlled by Cloudflare Access.

## Video and audio

Videos are managed through the Videos section of the admin interface. Standard YouTube URLs, YouTube Shorts URLs, shortened `youtu.be` URLs, and YouTube video IDs are supported.

Audio files are uploaded through the Music section of the admin interface and stored in Cloudflare R2. MP3, M4A, and WAV files are supported. Audio delivery supports HTTP byte-range requests for browser playback and seeking.
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
