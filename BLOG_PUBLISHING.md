# Publishing blog posts

The editor lives at `/admin`. It sends article content to the site's server, which commits it to `content/blog-posts.json` through GitHub's Contents API. A new Vercel build then creates the journal card, an individual article page, canonical/Open Graph metadata, structured article data, and sitemap entries.

## One-time setup

1. Push this project to a GitHub repository and connect that repository to the Vercel project.
2. Add these environment variables in Vercel (and to `.env.local` only for local use):
   - `NEXT_PUBLIC_SITE_URL`: `https://zanovetech.vercel.app` (the canonical public site origin).
   - `BLOG_ADMIN_TOKEN`: a long random key used to protect publishing actions. Generate a new value; do not reuse an email, Groq, or other service password.
   - `GITHUB_TOKEN`: a GitHub fine-grained personal access token restricted to this repository, with Contents read/write access.
   - `GITHUB_REPOSITORY`: `OWNER/REPOSITORY`.
   - `GITHUB_BRANCH`: the branch Vercel deploys, usually `main`.
3. Redeploy after adding the variables. Open `/admin`, enter the `BLOG_ADMIN_TOKEN`, and publish an article.

The editor does not store the publishing key in browser storage. The GitHub token is read only by the server route and never sent to the browser. Keep `/admin` private and rotate its publishing key if it is exposed.
