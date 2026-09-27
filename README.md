# ThreadSave MVP 🚀

A small Threads public-video downloader prototype.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

## How it works

1. Browser posts a Threads URL to `/api/analyze`.
2. Server fetches the public page and searches server-rendered content for MP4 media URLs.
3. Browser receives media URLs and previews them.
4. `/api/download` proxies the selected MP4 to the browser as a download.

## Important

Threads page structure can change. This MVP intentionally handles only publicly accessible content and does not implement login/private-post access.
