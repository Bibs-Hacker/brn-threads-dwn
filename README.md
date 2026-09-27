# ThreadSave — Vercel-ready MVP 🚀

This version is designed for **Vercel's Node.js serverless runtime**. It intentionally does not use Flask, Python, `pyproject.toml`, or a long-running Express server.

## Deploy

1. Put the contents of this folder at the **root of your GitHub repository**.
2. Remove old Flask/Python files such as `pyproject.toml`, `app.py`, `main.py`, etc. if they belong to the previous project.
3. Commit and push to `main`.
4. In Vercel, redeploy the latest commit. Framework Preset can remain **Other**.

## Structure

- `public/index.html` — UI
- `api/analyze.js` — Threads page analyzer
- `api/download.js` — controlled Meta-CDN media proxy
- `vercel.json` — Vercel settings
- `package.json` — Node project metadata

## Important

Only publicly accessible content is supported. The app does not attempt to access private posts, bypass authentication, or defeat access controls.

Threads can change its HTML/server-rendered data at any time, so extraction may require maintenance.
