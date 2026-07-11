# 3D Model Viewer (OBJ → Three.js)

Upload an `.obj` file (and optional matching `.mtl`) and view it instantly
in 3D in the browser. No AI/API calls are used for the 3D rendering — it's
done entirely client-side using Three.js's built-in `OBJLoader`/`MTLLoader`,
so it's instant and free per use.

Access is gated behind a simple login. The email/password are never stored
in the code — they live only as environment variables on Vercel.

## 1. Push this to GitHub

```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 2. Import into Vercel

1. Go to vercel.com → **Add New... → Project**
2. Import the GitHub repo you just created
3. Framework preset should auto-detect as **Next.js** — leave defaults

## 3. Set environment variables (do this BEFORE first deploy, or redeploy after)

In the Vercel project → **Settings → Environment Variables**, add:

| Name            | Value                          |
|-----------------|---------------------------------|
| `AUTH_EMAIL`    | ************************        |
| `AUTH_PASSWORD` | ******                          |
| `SESSION_SECRET`| any long random string you pick |

Apply to all environments (Production, Preview, Development).

## 4. Deploy

Vercel deploys automatically on every push to `main`. Your live URL will look
like `https://<project-name>.vercel.app`.

## Adding more users later

Currently only one email/password pair is supported (kept intentionally
simple). To support multiple users later, the cleanest upgrade path is
swapping the single env-var check in `app/api/login/route.js` for a small
list (or a proper auth provider like Clerk/Auth0/NextAuth if it grows
beyond a handful of people) — happy to help with that when you're ready.

## Local development

```
cp .env.local.example .env.local   # then fill in real values
npm install
npm run dev
```
