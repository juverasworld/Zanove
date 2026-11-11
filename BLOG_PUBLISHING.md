# Publishing blog posts

The editor lives at `/admin`. It sends article content to the site's server, which commits it to `content/blog-posts.json` through GitHub's Contents API. A new Vercel build then creates the journal card, an individual article page, canonical/Open Graph metadata, structured article data, and sitemap entries.

## One-time setup

1. This site is connected to `juverasworld/Zanove`; its publishing route commits new posts to the `main` branch, which should match the Vercel Production branch.
2. Create a GitHub fine-grained personal access token for the `juverasworld` owner, restricted to the `Zanove` repository, with **Contents: Read and write** permission. Set an expiry and rotate it when needed.
3. In Vercel → Project Settings → Environment Variables, add the following for **Production** (and add them to `.env.local` only for local use):
   - `NEXT_PUBLIC_SITE_URL`: `https://zanovetech.vercel.app` (the canonical public site origin).
   - `BLOG_ADMIN_TOKEN`: a random key of at least 32 bytes used to protect publishing. Generate one with `openssl rand -hex 32`; keep it in a password manager and never commit it.
   - `GITHUB_TOKEN`: the fine-grained token created in step 2. It stays server-side.
   - `GITHUB_REPOSITORY`: `juverasworld/Zanove` (the route defaults to this value if omitted).
   - `GITHUB_BRANCH`: `main` (the route defaults to `main` if omitted).
4. Redeploy after adding the variables. Open `https://zanovetech.vercel.app/admin`, enter the `BLOG_ADMIN_TOKEN`, and publish an article. The route commits to GitHub; Vercel rebuilds when it sees that commit on the Production branch.

The editor does not store the publishing key in browser storage. The GitHub token is read only by the server route and never sent to the browser. Keep `/admin` private and rotate its publishing key if it is exposed.
