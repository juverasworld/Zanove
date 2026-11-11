'use client';

import { useMemo, useState } from 'react';

const blank = { slug: '', title: '', category: 'Zanove Journal', description: '', body: '' };

export default function BlogEditor() {
  const [token, setToken] = useState('');
  const [post, setPost] = useState(blank);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const canPublish = useMemo(() => Boolean(token && post.title.trim() && post.description.trim() && post.body.trim()), [token, post]);

  async function publish(event) {
    event.preventDefault();
    setStatus(''); setBusy(true); setSaved(false);
    try {
      const response = await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(post),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not publish this post.');
      setSaved(true);
      setStatus(`Published “${post.title}”. Vercel will rebuild the journal from the new content.`);
      setPost(blank);
    } catch (error) {
      setStatus(error.message || 'Could not publish this post.');
    } finally { setBusy(false); }
  }

  function update(field, value) {
    setPost((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !current.slug) next.slug = value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return next;
    });
  }

  return <main className="editor-shell">
    <a href="/blog.html" className="back-link">← Visit the journal</a>
    <p className="kicker">ZANOVE TECHNOLOGIES</p>
    <h1>Write and publish a journal post.</h1>
    <p className="intro">Draft a useful article, preview its web address and publish it to the connected site repository. Publishing automatically triggers a Vercel rebuild.</p>
    <form onSubmit={publish}>
      <label>Publishing key<input type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter your blog publishing key" required /></label>
      <div className="form-grid"><label>Article title<input value={post.title} onChange={(e) => update('title', e.target.value)} maxLength={120} required /></label><label>Category<input value={post.category} onChange={(e) => update('category', e.target.value)} maxLength={60} required /></label></div>
      <label>Article URL slug<input value={post.slug} onChange={(e) => update('slug', e.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers and hyphens" required /><small>Preview: /blog/{post.slug || 'your-article'}.html</small></label>
      <label>Search excerpt<textarea rows={3} value={post.description} onChange={(e) => update('description', e.target.value)} maxLength={180} placeholder="A short, clear description for search and sharing." required /></label>
      <label>Article content<textarea className="body-input" rows={16} value={post.body} onChange={(e) => update('body', e.target.value)} placeholder={'Use ## before a section heading. Separate paragraphs with a blank line.\n\n## Start here\nYour paragraph...'} required /></label>
      <p className="hint">Formatting: add section headings with <code>## Heading</code>, then separate paragraphs with a blank line. The site renders article pages and search metadata automatically.</p>
      <button disabled={!canPublish || busy}>{busy ? 'Publishing…' : 'Publish article'}</button>
      <p className={`status ${saved ? 'success' : ''}`} role="status">{status}</p>
    </form>
    <p className="privacy">Your publishing key is kept only in this page until you close it. The GitHub access token stays on the server and is never sent to the browser.</p>
    <style jsx>{`
      :global(body){margin:0;background:#f5f7f6;color:#17202a;font:15px/1.65 Inter,Arial,sans-serif}.editor-shell{width:min(820px,calc(100% - 32px));margin:42px auto 80px;padding:clamp(22px,5vw,54px);border:1px solid #dce2e5;border-radius:22px;background:white;box-shadow:0 18px 55px #00081a14}.back-link{color:#087f87;text-decoration:none;font-size:13px;font-weight:700}.kicker{margin:28px 0 8px;color:#087f87;font-size:11px;font-weight:800;letter-spacing:.14em}.editor-shell h1{max-width:650px;margin:0;color:#061322;font:600 clamp(34px,6vw,54px)/1.04 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.045em}.intro{max-width:650px;margin:18px 0 30px;color:#566271}form{display:grid;gap:17px}label{display:grid;gap:7px;color:#17202a;font-size:13px;font-weight:700}input,textarea{width:100%;padding:12px 13px;border:1px solid #cbd5da;border-radius:9px;background:#fff;color:#17202a;font:400 14px/1.55 Inter,Arial,sans-serif}input:focus,textarea:focus{border-color:#087f87;outline:3px solid #18d7ce33}.body-input{min-height:300px;resize:vertical}.form-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}small,.hint,.privacy{color:#68737a;font-size:12px;font-weight:400}.hint{margin:-8px 0 0}code{padding:2px 5px;border-radius:4px;background:#f0f4f3}button{width:fit-content;min-height:48px;padding:0 22px;border:0;border-radius:9px;background:#18d7ce;color:#061322;font:700 14px Inter,Arial,sans-serif;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.55}.status{min-height:22px;margin:0;color:#9a352b;font-size:13px}.status.success{color:#087444}.privacy{margin:24px 0 0;padding-top:16px;border-top:1px solid #e7ebec}@media(max-width:560px){.editor-shell{margin:16px auto 35px;padding:22px 17px}.form-grid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
