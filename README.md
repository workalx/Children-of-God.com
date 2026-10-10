# ✝ Children of God — Music Group Website

A multi-page website for **"Children of God"** ("Діти Божі"), a Ukrainian Christian music group. Built as a static, no-build React single-page application — everything runs client-side, no server or database required.

## Features

- **Hash-based routing** (`#feed`, `#about`, `#donate`, `#admin`) with pages loaded on demand — no bundler, no build step
- **Trilingual UI** — Ukrainian / English / Russian, switchable from the nav, with English as the default
- **News feed** — Instagram-style post feed with likes and comments. Posts live in `posts.json` (media in `media/`) in this repository, so every visitor sees the same feed. A post can carry any number of photos/videos: the feed card shows the 1–4 the admin picked, and "View all" opens the post's own page (`#post/<id>`) with the full grid and a lightbox
- **User accounts** — client-side registration/login (stored in `localStorage`/`sessionStorage`)
- **About page** — group bio, photo gallery, embedded videos, and contact info, all lazy-rendered via `IntersectionObserver` as you scroll
- **Donate page** — PayPal and Interac e-Transfer instructions with a thank-you modal
- **Password-protected admin panel** (`#admin`) — drag-and-drop photo/video upload for publishing new feed posts. Publishing commits `posts.json` and the media file to this repository through the GitHub API, so the admin pastes a fine-grained GitHub token once per device (Contents: Read and write on this repo only; kept in that browser's `localStorage`). New posts go live after GitHub Pages redeploys, about 1–2 minutes

> **Note:** the news feed is the home page — opening the site without a hash lands on `#feed`. To temporarily lock it (shows a "coming soon" placeholder, hides it from navigation and makes `#about` the home page), flip `FEED_LOCKED` to `true` near the top of `app.js`.

## Tech stack

- **React 18** + **htm** (JSX-like syntax without a build step), loaded straight from a CDN
- Plain **JavaScript**, **HTML**, **CSS** — no npm install, no bundler, no framework CLI
- Fonts: Playfair Display + Nunito (Google Fonts)
- Accounts, comments and likes live in the browser's `localStorage` / `sessionStorage` — there is no backend; only posts are shared, via `posts.json`

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
