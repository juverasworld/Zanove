# Publishing blog posts

The admin lives at `/admin`. Enter the private blog admin key to open the publishing dashboard. From there, you can write an article, see the published article list, edit an existing post, preview its public page, search the list, and remove a post. The editor includes structured H1, H2 and H3 headings, paragraphs, pull quotes, featured images and in-article images. The Author profiles tab lets you create a byline with a name, role, photo and short bio. Article and author data are committed through GitHub's Contents API; uploaded images are saved in `public/assets/blog/`. A new Vercel build updates the homepage journal preview, `/blog`, `/blog/[article-slug]`, canonical/Open Graph metadata, article and author data, and sitemap entries.

## One-time setup

1. This site is connected to `juverasworld/Zanove`; its publishing route commits new posts to the `main` branch, which should match the Vercel Production branch.
2. Create a GitHub fine-grained personal access token for the `juverasworld` owner, restricted to the `Zanove` repository, with **Contents: Read and write** permission. Set an expiry and rotate it when needed.
3. In Vercel → Project Settings → Environment Variables, add the following for **Production** (and add them to `.env.local` only for local use):
   - `NEXT_PUBLIC_SITE_URL`: `https://zanovetech.vercel.app` (the canonical public site origin).
   - `BLOG_ADMIN_TOKEN`: a random key of at least 32 bytes used to protect publishing. Generate one with `openssl rand -hex 32`; keep it in a password manager and never commit it.
   - `GITHUB_TOKEN`: the fine-grained token created in step 2. It stays server-side.
   - `GITHUB_REPOSITORY`: `juverasworld/Zanove` (the route defaults to this value if omitted).
   - `GITHUB_BRANCH`: `main` (the route defaults to `main` if omitted).
4. Redeploy after adding the variables. Open `https://zanovetech.vercel.app/admin`, enter the `BLOG_ADMIN_TOKEN`, and use the publishing dashboard. The route commits to GitHub; Vercel rebuilds when it sees that commit on the Production branch.

## Writing an article

- Give it a specific, useful headline, a short search excerpt, and a category such as `Websites · Conversion` or `AI · Automation`.
- Use lowercase words and hyphens in the article slug. The editor suggests one from the title.
- Add section headings (H2), subsections (H3), paragraphs, pull quotes and images from the article builder. Add an internal link using `[descriptive text](/service.html)` in a paragraph when it helps the reader.
- Create an author profile before publishing under a personal byline. Use an accurate name, role and bio; the profile appears with articles and in their structured data.
- Add a featured image or in-article images with descriptive alt text. Uploads accept JPEG, PNG, WebP or GIF files under 2.5 MB.
- Publish saves the article to GitHub. Vercel builds clean routes under `/blog`; old `.html` journal URLs redirect to the clean URLs.
- Editing keeps the original publication date and records an updated date. Removing a post removes it from the next sitemap and site build.

The dashboard does not store the publishing key in browser storage. The GitHub token is read only by the server route and never sent to the browser. Keep `/admin` private and rotate its publishing key if it is exposed.
