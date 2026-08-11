# ✝ Children of God — Music Group Website

A multi-page website for **"Children of God"** ("Діти Божі"), a Ukrainian Christian music group. Built as a static, no-build React single-page application — everything runs client-side, no server or database required.

## Features

- **Hash-based routing** (`#feed`, `#about`, `#donate`, `#admin`) with pages loaded on demand — no bundler, no build step
- **Trilingual UI** — Ukrainian / English / Russian, switchable from the nav, with English as the default
- **News feed** — Instagram-style post feed with likes and comments (posts stored in `localStorage`)
- **User accounts** — client-side registration/login (stored in `localStorage`/`sessionStorage`)
- **About page** — group bio, photo gallery, embedded videos, and contact info, all lazy-rendered via `IntersectionObserver` as you scroll
- **Donate page** — PayPal and Interac e-Transfer instructions with a thank-you modal
- **Password-protected admin panel** (`#admin`) — drag-and-drop photo/video upload (converted to base64 via the FileReader API) for publishing new feed posts

> **Note:** the news feed is currently locked (shows a "coming soon" placeholder and is hidden from navigation) while content is being prepared. To re-enable it, flip `FEED_LOCKED` to `false` near the top of `app.js`.

## Tech stack

- **React 18** + **htm** (JSX-like syntax without a build step), loaded straight from a CDN
- Plain **JavaScript**, **HTML**, **CSS** — no npm install, no bundler, no framework CLI
- Fonts: Playfair Display + Nunito (Google Fonts)
- All user data (posts, accounts, comments) lives in the browser's `localStorage` / `sessionStorage` — there is no backend

## Project structure

```
index.html        Single HTML shell — loads React (CDN) + app.js
app.js             React app: router, Nav, Footer, auth modal, i18n (uk/en/ru)
auth.js            Client-side registration, login, comments
shared.css         All project styles
pages/
  feed.js          News feed (loaded on #feed)
  about.js         About + Gallery + Videos + Contact (loaded on #about)
  donate.js        Donation page (loaded on #donate)
  admin.js         Password-protected admin panel (loaded on #admin)
  gallery.js        Full photo gallery view
img/               Gallery photos + gallery.json
```

## Running locally

No build step, no dependencies to install — it's static files. Because the app loads page scripts dynamically (`pages/*.js`), open it through a local web server rather than double-clicking `index.html` (the `file://` protocol works in most browsers, but a local server avoids any CORS/script-loading quirks):

```bash
# from the project folder, pick any static server you have available:
python -m http.server 8000
# or
npx serve .
```

Then open **http://localhost:8000** in your browser.

## License

All rights reserved — content and code belong to the "Children of God" music group.
