'use client';

import { useMemo, useState } from 'react';

const blank = { slug: '', title: '', category: 'Websites · Business growth', description: '', body: '' };

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BlogEditor() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredPosts = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? posts.filter((item) => `${item.title} ${item.category} ${item.slug}`.toLowerCase().includes(query)) : posts;
  }, [filter, posts]);

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setStatus(''); setError(false);
    try {
      const result = await request('/api/blog/publish');
      setPosts(result.posts || []); setAuthenticated(true); setStatus('You’re signed in. Your published articles are ready.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  async function publish(event) {
    event.preventDefault(); setBusy(true); setStatus(''); setError(false);
    try {
      const result = await request('/api/blog/publish', { method: 'POST', body: JSON.stringify(post) });
      setPosts(result.posts || []); setStatus(result.action === 'updated' ? 'Article updated. Vercel will rebuild the site.' : 'Article published. Vercel will rebuild the site.');
      setPost(blank); setEditing(false);
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  async function removePost(item) {
    if (!window.confirm(`Remove “${item.title}” from the journal? This will remove its page from the next site build.`)) return;
    setBusy(true); setStatus(''); setError(false);
    try {
      const result = await request('/api/blog/publish', { method: 'DELETE', body: JSON.stringify({ slug: item.slug }) });
      setPosts(result.posts || []);
      if (post.slug === item.slug) { setPost(blank); setEditing(false); }
      setStatus('Article removed. Vercel will rebuild the journal.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  function editPost(item) {
    const body = (item.sections || []).map((section) => `## ${section.heading}\n${section.paragraphs.join('\n\n')}`).join('\n\n');
    setPost({ slug: item.slug, title: item.title, category: item.category || '', description: item.description || '', body });
    setEditing(true); setStatus(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function update(field, value) {
    setPost((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && (!current.slug || !editing)) next.slug = slugify(value);
      return next;
    });
  }

  function newPost() { setPost(blank); setEditing(false); setStatus(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return <main className="admin-wrap">
    <div className="admin-top"><a href="/" className="admin-brand"><img src="/assets/zanove-logo.png" alt="Zanove Technologies" /></a><a href="/blog" className="admin-public-link">View the journal ↗</a></div>
    {!authenticated ? <section className="login-card">
      <p className="admin-kicker">ZANOVE JOURNAL · ADMIN</p><h1>Your publishing desk.</h1>
      <p className="admin-intro">Sign in with your private publishing key to manage articles on the Zanove website.</p>
      <form onSubmit={signIn} className="admin-form">
        <label>Publishing key<input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your blog admin key" required /></label>
        <button className="admin-primary" disabled={!token || busy}>{busy ? 'Checking key…' : 'Open the blog dashboard'} <span aria-hidden="true">↗</span></button>
        <p className={`admin-status ${error ? 'is-error' : ''}`} role="status">{status}</p>
      </form>
      <p className="admin-footnote">The publishing key stays in this browser tab. Your GitHub token never leaves the server.</p>
    </section> : <>
      <section className="admin-hero"><div><p className="admin-kicker">ZANOVE JOURNAL · ADMIN</p><h1>Good ideas, published.</h1><p>Write practical articles for Zanove’s readers. Published posts appear in the public journal after the connected site rebuilds.</p></div><button className="admin-primary" onClick={newPost}>＋ Write an article</button></section>
      <section className="admin-workspace">
        <div className="editor-card" id="article-editor"><div className="editor-heading"><div><p className="admin-kicker">{editing ? 'EDIT ARTICLE' : 'NEW ARTICLE'}</p><h2>{editing ? 'Refine your article' : 'Start with a useful idea.'}</h2></div>{editing && <button className="text-button" type="button" onClick={newPost}>New article</button>}</div>
          <form onSubmit={publish} className="admin-form">
            <label>Article title<input value={post.title} onChange={(event) => update('title', event.target.value)} maxLength={120} placeholder="A clear, useful headline" required /></label>
            <div className="admin-grid"><label>Category<input value={post.category} onChange={(event) => update('category', event.target.value)} maxLength={60} placeholder="Websites · Conversion" required /></label><label>URL slug<input value={post.slug} onChange={(event) => update('slug', event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers and hyphens" maxLength={90} disabled={editing} required /><small>{editing ? 'The live URL stays fixed when editing.' : `zanovetech.vercel.app/blog/${post.slug || 'article-slug'}`}</small></label></div>
            <label>Search excerpt<textarea rows={3} value={post.description} onChange={(event) => update('description', event.target.value)} maxLength={180} placeholder="Explain what readers will learn in one or two sentences." required /></label>
            <label>Article content<textarea className="article-input" rows={18} value={post.body} onChange={(event) => update('body', event.target.value)} placeholder={'## Start with the reader’s problem\nWrite a clear paragraph with a useful point. Separate paragraphs with a blank line.\n\n## Give them a practical next step\nAdd a useful link with [descriptive text](/service.html).'} required /></label>
            <p className="editor-help">Use <code>## Heading</code> for section headings, a blank line between paragraphs, and <code>[link text](/service.html)</code> for a relevant Zanove service link. Keep the article specific, useful and original.</p>
            <div className="editor-actions"><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save article' : 'Publish article'} <span aria-hidden="true">↗</span></button>{editing && <button className="text-button" type="button" onClick={newPost}>Cancel edits</button>}</div>
            <p className={`admin-status ${error ? 'is-error' : ''}`} role="status">{status}</p>
          </form>
        </div>
        <aside className="editor-sidebar"><div className="tip-card"><p className="admin-kicker">A GOOD ZANOVE ARTICLE</p><h3>Help first. Connect the solution.</h3><p>Answer a real question for a Nigerian business owner, then link to a relevant service or project when it helps the reader take the next step.</p><a href="/service.html">Explore Zanove services ↗</a></div><div className="tip-card tip-card-soft"><p className="admin-kicker">EDITORIAL CHECK</p><ul><li>One clear reader and search intent</li><li>A specific, accurate headline</li><li>Practical examples and next steps</li><li>Useful internal links where relevant</li></ul></div></aside>
      </section>
      <section className="post-manager"><div className="post-manager-head"><div><p className="admin-kicker">YOUR JOURNAL</p><h2>Published articles <span>{posts.length}</span></h2></div><label className="search-posts"><span className="sr-only">Filter articles</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find an article" /></label></div>
        {filteredPosts.length ? <div className="post-list">{filteredPosts.map((item) => <article className="post-row" key={item.slug}><div><p className="post-category">{item.category || 'Zanove Journal'}</p><h3>{item.title}</h3><p className="post-slug">/blog/{item.slug}</p></div><div className="post-actions"><a href={`/blog/${item.slug}`} target="_blank" rel="noreferrer">Preview ↗</a><button type="button" onClick={() => editPost(item)} disabled={busy}>Edit</button><button type="button" className="delete-button" onClick={() => removePost(item)} disabled={busy}>Remove</button></div></article>)}</div> : <div className="empty-posts"><p>{posts.length ? 'No articles match that search.' : 'No published articles yet.'}</p><button className="text-button" onClick={newPost}>Write your first article ↗</button></div>}
      </section>
      <div className="admin-footer"><span>Signed in to Zanove Journal</span><button className="text-button" onClick={() => { setAuthenticated(false); setToken(''); setPosts([]); setStatus(''); }}>Sign out</button></div>
    </>}
    <style jsx>{`
      :global(body){margin:0;background:#f3f5f4;color:#182522;font:400 15px/1.65 Poppins,Inter,Arial,sans-serif}.admin-wrap{width:min(1160px,calc(100% - 36px));margin:0 auto;padding:22px 0 64px}.admin-top{display:flex;align-items:center;justify-content:space-between;margin:0 auto 48px}.admin-brand img{width:178px;height:42px;object-fit:contain;object-position:left}.admin-public-link,.tip-card a{color:#087f87;font-size:13px;font-weight:700;text-decoration:none}.login-card{max-width:610px;margin:8vh auto;padding:clamp(26px,5vw,52px);border:1px solid #dce2df;border-radius:22px;background:white;box-shadow:0 22px 60px #18252212}.admin-kicker{margin:0 0 9px;color:#087f87;font-size:11px;font-weight:800;letter-spacing:.14em}.login-card h1,.admin-hero h1{margin:0;color:#182522;font:600 clamp(36px,6vw,58px)/1.02 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.05em}.admin-intro{max-width:470px;margin:15px 0 26px;color:#596660}.admin-form{display:grid;gap:16px}.admin-form label{display:grid;gap:7px;color:#27332f;font-size:13px;font-weight:700}.admin-form input,.admin-form textarea,.search-posts input{width:100%;padding:12px 14px;border:1px solid #ccd5d1;border-radius:10px;background:#fff;color:#182522;font:400 14px/1.55 Poppins,Inter,Arial,sans-serif}.admin-form input:focus,.admin-form textarea:focus,.search-posts input:focus{border-color:#087f87;outline:3px solid #087f8724}.admin-form small{color:#68746f;font-size:11px;font-weight:400}.admin-primary{display:inline-flex;min-height:48px;width:fit-content;align-items:center;justify-content:center;gap:12px;padding:0 19px;border:0;border-radius:10px;background:#18d7ce;color:#061322;font:700 13px Poppins,Inter,sans-serif;cursor:pointer}.admin-primary:hover{background:#12c6bd}.admin-primary:disabled{cursor:wait;opacity:.55}.admin-footnote,.editor-help{color:#68746f;font-size:12px}.admin-footnote{margin:23px 0 0;padding-top:16px;border-top:1px solid #e8ecea}.admin-status{min-height:20px;margin:0;color:#087444;font-size:13px}.admin-status.is-error{color:#a33731}.admin-hero{display:flex;align-items:end;justify-content:space-between;gap:28px;margin-bottom:28px;padding:clamp(24px,4vw,42px);border-radius:20px;background:linear-gradient(125deg,#182522,#223b34);color:white}.admin-hero h1{color:#fff}.admin-hero>div>p:last-child{max-width:620px;margin:12px 0 0;color:#e2e9e5;font-size:14px}.admin-workspace{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);align-items:start;gap:20px}.editor-card,.tip-card,.post-manager{padding:clamp(22px,3vw,32px);border:1px solid #dce2df;border-radius:18px;background:#fff;box-shadow:0 8px 26px #18252208}.editor-heading,.post-manager-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.editor-heading h2,.post-manager-head h2{margin:0;color:#182522;font:600 clamp(24px,3.4vw,34px)/1.1 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.04em}.admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.article-input{min-height:340px;resize:vertical}.editor-help{margin:-7px 0 0}.editor-help code{padding:2px 5px;border-radius:4px;background:#edf2ef;color:#182522}.editor-actions{display:flex;align-items:center;gap:15px}.text-button{padding:6px 0;border:0;background:transparent;color:#087f87;font:700 13px Poppins,Inter,sans-serif;cursor:pointer}.editor-sidebar{display:grid;gap:16px}.tip-card{padding:24px}.tip-card h3{margin:0 0 10px;color:#182522;font:600 23px/1.15 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.03em}.tip-card>p:not(.admin-kicker){margin:0 0 15px;color:#596660;font-size:13px}.tip-card-soft{background:#e9e3d7;border-color:#e0d8c8}.tip-card ul{display:grid;gap:8px;margin:12px 0 0;padding-left:18px;color:#3c4742;font-size:12px}.post-manager{margin-top:24px}.post-manager-head h2 span{display:inline-grid;min-width:30px;height:30px;place-items:center;margin-left:6px;border-radius:999px;background:#e9e3d7;font:700 13px Poppins,Inter,sans-serif;vertical-align:middle}.search-posts{width:min(270px,40%)}.post-list{border-top:1px solid #e5eae7}.post-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:19px 0;border-bottom:1px solid #e5eae7}.post-category,.post-slug{color:#68746f;font-size:11px}.post-row h3{margin:3px 0;color:#182522;font:600 18px/1.25 'Bricolage Grotesque',Inter,sans-serif}.post-actions{display:flex;flex:0 0 auto;align-items:center;gap:12px}.post-actions a,.post-actions button{padding:0;border:0;background:none;color:#087f87;font:700 12px Poppins,Inter,sans-serif;text-decoration:none;cursor:pointer}.post-actions .delete-button{color:#a33731}.post-actions button:disabled{opacity:.5}.empty-posts{padding:35px 0;color:#596660}.empty-posts p{margin-bottom:10px}.admin-footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;color:#68746f;font-size:12px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media(max-width:760px){.admin-wrap{width:min(100% - 24px,680px);padding-top:14px}.admin-top{margin-bottom:26px}.admin-workspace{grid-template-columns:1fr}.editor-sidebar{grid-template-columns:1fr 1fr}.admin-hero{align-items:start;flex-direction:column}.post-row{align-items:start;flex-direction:column}.post-actions{flex-wrap:wrap}.login-card{margin:6vh auto}.admin-grid{grid-template-columns:1fr}}
      @media(max-width:520px){.editor-sidebar{grid-template-columns:1fr}.post-manager-head{align-items:start;flex-direction:column}.search-posts{width:100%}.editor-actions{align-items:flex-start;flex-direction:column}.admin-primary{width:100%}.admin-top{margin-bottom:20px}.admin-brand img{width:148px}.post-actions{gap:10px}}
    `}</style>
  </main>;
}
