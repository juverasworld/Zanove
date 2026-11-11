'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const defaultAuthorId = 'zanove-technologies';
const key = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const freshPost = (authorId = defaultAuthorId) => ({
  slug: '', title: '', category: 'Websites · Business growth', description: '', authorId,
  coverImage: '', coverAlt: '',
  sections: [{ key: key(), heading: '', blocks: [{ key: key(), type: 'richtext', html: '<p><br></p>' }] }],
});
const blankAuthor = { id: '', name: '', role: '', bio: '', image: '' };

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function editorPost(item, defaultAuthor) {
  return {
    slug: item.slug || '', title: item.title || '', category: item.category || '', description: item.description || '',
    authorId: item.authorId || defaultAuthor || defaultAuthorId,
    coverImage: item.coverImage || '', coverAlt: item.coverAlt || '',
    sections: (item.sections || []).map((section) => ({
      key: key(), heading: section.heading || '',
      blocks: (section.blocks || (section.paragraphs || []).map((text) => ({ type: 'paragraph', text }))).map((block) => ({
        ...block,
        ...(block.type === 'paragraph' ? { type: 'richtext', html: `<p>${escapeHtml(block.text || '')}</p>` } : {}),
        key: key(),
      })),
    })),
  };
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\n', '<br>');
}

function RichTextEditor({ html, onChange }) {
  const editor = useRef(null);
  useEffect(() => { if (editor.current) editor.current.innerHTML = html || '<p><br></p>'; }, []);
  function command(action, value) {
    editor.current?.focus();
    document.execCommand(action, false, value);
    if (editor.current) onChange(editor.current.innerHTML);
  }
  function addLink() {
    const href = window.prompt('Paste a secure https:// link or a site path such as /service.html');
    if (href) command('createLink', href.trim());
  }
  return <div className="rich-editor">
    <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
      <span className="rich-toolbar-label">FORMAT</span>
      <button type="button" title="Bold" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command('bold')}><strong>B</strong></button>
      <button type="button" title="Italic" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command('italic')}><em>I</em></button>
      <button type="button" title="Underline" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => command('underline')}><u>U</u></button>
      <span className="rich-toolbar-divider" />
      <button type="button" title="Subheading" onMouseDown={(event) => event.preventDefault()} onClick={() => command('formatBlock', 'h3')}>H3</button>
      <button type="button" title="Paragraph" onMouseDown={(event) => event.preventDefault()} onClick={() => command('formatBlock', 'p')}>¶</button>
      <button type="button" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertUnorderedList')}>• List</button>
      <button type="button" title="Numbered list" aria-label="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertOrderedList')}>1. List</button>
      <button type="button" title="Add link to selected text" aria-label="Add link" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>↗ Link</button>
    </div>
    <div ref={editor} className="rich-editable" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Article text" data-placeholder="Write your article. Select text to format it, add a subheading, or create a list." onInput={(event) => onChange(event.currentTarget.innerHTML)} />
  </div>;
}

function toFileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function BlogEditor() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [post, setPost] = useState(freshPost());
  const [author, setAuthor] = useState(blankAuthor);
  const [editing, setEditing] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [activeTab, setActiveTab] = useState('articles');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [filter, setFilter] = useState('');
  const [sectionTemplate, setSectionTemplate] = useState('');

  const filteredPosts = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? posts.filter((item) => `${item.title} ${item.category} ${item.slug}`.toLowerCase().includes(query)) : posts;
  }, [filter, posts]);
  const canPublish = Boolean(post.title.trim() && post.slug && post.category.trim() && post.description.trim() && post.authorId && post.sections.length && post.sections.every((section) => section.heading.trim() && section.blocks.length && section.blocks.every((block) => block.type === 'image' ? block.src && block.alt?.trim() : block.type === 'richtext' ? block.html?.replace(/<[^>]*>/g, ' ').trim() : block.text?.trim())));

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
      const nextAuthors = result.authors || [];
      setPosts(result.posts || []); setAuthors(nextAuthors); setPost(freshPost(nextAuthors[0]?.id)); setAuthenticated(true);
      setStatus('You’re signed in. Your articles and author profiles are ready.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  async function uploadImage(file, purpose, onUploaded, slugHint = '') {
    if (!file) return;
    if (file.size > 2_500_000) { setError(true); setStatus('Choose an image smaller than 2.5 MB.'); return; }
    setUploading(purpose); setError(false); setStatus('');
    try {
      const base64 = await toFileData(file);
      const result = await request('/api/blog/media', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type, base64, slug: slugHint || post.slug || slugify(post.title) || 'zanove', purpose }) });
      onUploaded(result.url);
      setStatus('Image added to the Zanove site library.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setUploading(''); }
  }

  async function publish(event) {
    event.preventDefault(); setBusy(true); setStatus(''); setError(false);
    try {
      const payload = { ...post, sections: post.sections.map(({ heading, blocks }) => ({ heading: heading.trim(), blocks: blocks.map(({ type, text, html, src, alt, caption, level }) => ({ type, ...(text !== undefined ? { text: text.trim() } : {}), ...(html !== undefined ? { html } : {}), ...(src ? { src } : {}), ...(alt ? { alt: alt.trim() } : {}), ...(caption?.trim() ? { caption: caption.trim() } : {}), ...(level ? { level } : {}) })) })) };
      const result = await request('/api/blog/publish', { method: 'POST', body: JSON.stringify(payload) });
      setPosts(result.posts || []); setStatus(result.action === 'updated' ? 'Article updated. Vercel will rebuild the site.' : 'Article published. Vercel will rebuild the site.');
      setPost(freshPost(authors[0]?.id)); setEditing(false);
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  async function removePost(item) {
    if (!window.confirm(`Remove “${item.title}” from the journal? This removes it from the next site build.`)) return;
    setBusy(true); setStatus(''); setError(false);
    try {
      const result = await request('/api/blog/publish', { method: 'DELETE', body: JSON.stringify({ slug: item.slug }) });
      setPosts(result.posts || []);
      if (post.slug === item.slug) { setPost(freshPost(authors[0]?.id)); setEditing(false); }
      setStatus('Article removed. Vercel will rebuild the journal.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  function editPost(item) {
    setPost(editorPost(item, authors[0]?.id)); setEditing(true); setActiveTab('articles'); setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePost(field, value) {
    setPost((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && (!current.slug || !editing)) next.slug = slugify(value);
      return next;
    });
  }

  function updateSection(sectionIndex, field, value) {
    setPost((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, [field]: value } : section) }));
  }

  function updateBlock(sectionIndex, blockIndex, values) {
    setPost((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, blocks: section.blocks.map((block, blockPosition) => blockPosition === blockIndex ? { ...block, ...values } : block) } : section) }));
  }

  function addSection(heading = '') { setPost((current) => ({ ...current, sections: [...current.sections, { key: key(), heading, blocks: [{ key: key(), type: 'richtext', html: '<p><br></p>' }] }] })); }
  function addBlock(sectionIndex, type) {
    const block = { key: key(), type, ...(type === 'image' ? { src: '', alt: '', caption: '' } : type === 'richtext' ? { html: '<p><br></p>' } : { text: '' }) };
    setPost((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, blocks: [...section.blocks, block] } : section) }));
  }
  function removeBlock(sectionIndex, blockIndex) {
    setPost((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, blocks: section.blocks.filter((_, position) => position !== blockIndex) } : section) }));
  }
  function resetPost() { setPost(freshPost(authors[0]?.id)); setEditing(false); setStatus(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function saveAuthor(event) {
    event.preventDefault(); setBusy(true); setStatus(''); setError(false);
    try {
      const profile = { ...author, id: author.id || slugify(author.name) };
      const result = await request('/api/blog/publish', { method: 'POST', body: JSON.stringify({ kind: 'author', profile }) });
      setAuthors(result.authors || []); setAuthor(blankAuthor); setEditingAuthor(false); setStatus('Author profile saved. You can now select it on any article.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  async function removeAuthor(profile) {
    if (!window.confirm(`Remove the author profile “${profile.name}”?`)) return;
    setBusy(true); setStatus(''); setError(false);
    try {
      const result = await request('/api/blog/publish', { method: 'DELETE', body: JSON.stringify({ kind: 'author', id: profile.id }) });
      setAuthors(result.authors || []); setStatus('Author profile removed.');
    } catch (cause) { setError(true); setStatus(cause.message); }
    finally { setBusy(false); }
  }

  function newAuthor() { setAuthor(blankAuthor); setEditingAuthor(false); setStatus(''); }

  return <main className="admin-wrap">
    <div className="admin-top"><a href="/" className="admin-brand"><img src="/assets/zanove-logo.png" alt="Zanove Technologies" /></a><a href="/blog" className="admin-public-link">View the journal ↗</a></div>
    {!authenticated ? <section className="login-card">
      <p className="admin-kicker">ZANOVE JOURNAL · ADMIN</p><h1>Your publishing desk.</h1>
      <p className="admin-intro">Sign in with your private publishing key to write articles, manage images and create author profiles on the Zanove website.</p>
      <form onSubmit={signIn} className="admin-form"><label>Publishing key<input type="password" autoComplete="current-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your blog admin key" required /></label><button className="admin-primary" disabled={!token || busy}>{busy ? 'Checking key…' : 'Open the blog dashboard'} <span aria-hidden="true">↗</span></button><p className={`admin-status ${error ? 'is-error' : ''}`} role="status">{status}</p></form>
      <p className="admin-footnote">The key stays in this browser tab. GitHub access stays on the server.</p>
    </section> : <>
      <section className="admin-hero"><div className="admin-hero-copy"><p className="admin-kicker">ZANOVE JOURNAL · ADMIN</p><h1>Make your ideas readable.</h1><p>Build useful articles with clear structure, strong imagery and an author people can recognise.</p><a className="admin-primary hero-view" href="/blog">View published journal ↗</a></div><div className="admin-hero-visual"><img src="/assets/zanove-workspace-freepik.jpg" alt="Bright creative workspace with a laptop and notebook" /><span>Ideas become useful stories.</span></div></section>
      <div className="admin-tabs" role="tablist" aria-label="Publishing desk sections"><button type="button" role="tab" aria-selected={activeTab === 'articles'} className={activeTab === 'articles' ? 'is-active' : ''} onClick={() => setActiveTab('articles')}>Articles <span>{posts.length}</span></button><button type="button" role="tab" aria-selected={activeTab === 'authors'} className={activeTab === 'authors' ? 'is-active' : ''} onClick={() => setActiveTab('authors')}>Author profiles <span>{authors.length}</span></button></div>
      {activeTab === 'articles' ? <>
        <section className="admin-workspace">
          <div className="editor-card" id="article-editor"><div className="editor-heading"><div><p className="admin-kicker">{editing ? 'EDIT ARTICLE' : 'ARTICLE BUILDER'}</p><h2>{editing ? 'Refine your article' : 'Start with the story.'}</h2></div>{editing && <button className="text-button" type="button" onClick={resetPost}>New article</button>}</div>
            <form onSubmit={publish} className="admin-form">
              <label>Article title <span className="field-hint">This is your page’s H1.</span><input value={post.title} onChange={(event) => updatePost('title', event.target.value)} maxLength={120} placeholder="A clear, useful headline" required /></label>
              <div className="admin-grid"><label>Category<input value={post.category} onChange={(event) => updatePost('category', event.target.value)} maxLength={60} placeholder="Websites · Conversion" required /></label><label>URL slug<input value={post.slug} onChange={(event) => updatePost('slug', event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use lowercase letters, numbers and hyphens" maxLength={90} disabled={editing} required /><small>{editing ? 'The live URL stays fixed when editing.' : `zanovetech.vercel.app/blog/${post.slug || 'article-slug'}`}</small></label></div>
              <label>Search excerpt<textarea rows={3} value={post.description} onChange={(event) => updatePost('description', event.target.value)} maxLength={180} placeholder="Tell readers what they will learn." required /></label>
              <label>Author profile<select value={post.authorId} onChange={(event) => updatePost('authorId', event.target.value)} required>{authors.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}{profile.role ? ` · ${profile.role}` : ''}</option>)}</select><small>Manage names, bios and photos in Author profiles.</small></label>

              <section className="cover-builder"><div className="cover-heading"><div><p className="admin-kicker">FEATURED IMAGE</p><h3>Set the visual tone.</h3></div><label className="upload-button">{uploading === 'cover' ? 'Uploading…' : post.coverImage ? 'Replace image' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], 'cover', (url) => setPost((current) => ({ ...current, coverImage: url })))} disabled={Boolean(uploading)} /></label></div>
                {post.coverImage ? <div className="cover-preview"><img src={post.coverImage} alt={post.coverAlt || ''} /><button type="button" className="remove-image" onClick={() => setPost((current) => ({ ...current, coverImage: '', coverAlt: '' }))}>Remove image</button></div> : <div className="cover-placeholder"><span aria-hidden="true">▧</span><div><strong>Add a cover image</strong><small>JPEG, PNG, WebP or GIF · max 2.5 MB</small></div></div>}
                {post.coverImage && <label>Image description<input value={post.coverAlt} onChange={(event) => updatePost('coverAlt', event.target.value)} maxLength={240} placeholder="Describe what this image shows" required /></label>}
              </section>

              <div className="content-builder-head"><div><p className="admin-kicker">ARTICLE CONTENT</p><h3>Shape the reading experience.</h3><p>Your title is the H1. Build sections with H2s, then format text, add H3s, lists, links, quotes and images as readers move through the story.</p></div><div className="section-tools"><select aria-label="Section starter" value={sectionTemplate} onChange={(event) => setSectionTemplate(event.target.value)}><option value="">Choose a section starter</option><option>Why this matters</option><option>Common problems to avoid</option><option>A practical step-by-step guide</option><option>Frequently asked questions</option><option>What to do next</option></select><button type="button" className="outline-button" onClick={() => { addSection(sectionTemplate); setSectionTemplate(''); }}>＋ Add section</button></div></div>
              <div className="sections-builder">{post.sections.map((section, sectionIndex) => <section className="section-builder" key={section.key}><div className="section-builder-head"><span className="section-number">{String(sectionIndex + 1).padStart(2, '0')}</span><label>Section heading · H2<input value={section.heading} onChange={(event) => updateSection(sectionIndex, 'heading', event.target.value)} maxLength={180} placeholder="What should this section explain?" required /></label>{post.sections.length > 1 && <button type="button" className="icon-button danger" aria-label="Remove section" title="Remove section" onClick={() => setPost((current) => ({ ...current, sections: current.sections.filter((_, index) => index !== sectionIndex) }))}>×</button>}</div>
                <div className="block-stack">{section.blocks.map((block, blockIndex) => <div className={`content-block block-${block.type}`} key={block.key}>
                  <div className="block-top"><span>{block.type === 'richtext' || block.type === 'paragraph' ? 'RICH TEXT' : block.type === 'subheading' ? 'SUBHEADING · H3' : block.type === 'quote' ? 'PULL QUOTE' : 'IMAGE'}</span><button type="button" className="icon-button" aria-label="Remove content block" title="Remove block" onClick={() => removeBlock(sectionIndex, blockIndex)}>×</button></div>
                  {block.type === 'image' ? <><div className="inline-image-row">{block.src ? <img src={block.src} alt={block.alt || ''} /> : <div className="inline-image-placeholder">Image block</div>}<label className="upload-button">{uploading === block.key ? 'Uploading…' : block.src ? 'Replace image' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], 'inline', (url) => updateBlock(sectionIndex, blockIndex, { src: url }))} disabled={Boolean(uploading)} /></label></div><label>Image description<input value={block.alt || ''} onChange={(event) => updateBlock(sectionIndex, blockIndex, { alt: event.target.value })} maxLength={240} placeholder="Describe the image for screen readers and search engines" required /></label><label>Caption <span className="field-hint">Optional</span><input value={block.caption || ''} onChange={(event) => updateBlock(sectionIndex, blockIndex, { caption: event.target.value })} maxLength={300} placeholder="Add a short caption" /></label></> : block.type === 'richtext' ? <RichTextEditor html={block.html} onChange={(html) => updateBlock(sectionIndex, blockIndex, { html })} /> : block.type === 'subheading' ? <input className="subheading-input" value={block.text} onChange={(event) => updateBlock(sectionIndex, blockIndex, { text: event.target.value })} maxLength={180} placeholder="A useful subsection heading" required /> : <textarea rows={block.type === 'quote' ? 3 : 5} value={block.text} onChange={(event) => updateBlock(sectionIndex, blockIndex, { text: event.target.value })} maxLength={block.type === 'quote' ? 2000 : 12000} placeholder={block.type === 'quote' ? 'A concise line worth highlighting' : 'Write a useful paragraph. Explain the idea, give a concrete example, or point to a next step.'} required />}
                </div>)}</div>
                <div className="add-block-row"><button type="button" onClick={() => addBlock(sectionIndex, 'richtext')}>＋ Rich text</button><button type="button" onClick={() => addBlock(sectionIndex, 'subheading')}>＋ H3 subheading</button><button type="button" onClick={() => addBlock(sectionIndex, 'image')}>＋ Image</button><button type="button" onClick={() => addBlock(sectionIndex, 'quote')}>＋ Pull quote</button></div>
              </section>)}</div>
              <div className="editor-actions"><button className="admin-primary" disabled={!canPublish || busy || Boolean(uploading)}>{busy ? 'Saving…' : editing ? 'Save article' : 'Publish article'} <span aria-hidden="true">↗</span></button>{editing && <button className="text-button" type="button" onClick={resetPost}>Cancel edits</button>}</div>
              <p className={`admin-status ${error ? 'is-error' : ''}`} role="status">{status}</p>
            </form>
          </div>
          <aside className="editor-sidebar"><div className="tip-card"><p className="admin-kicker">A GOOD ZANOVE ARTICLE</p><h3>Help first. Connect the solution.</h3><p>Answer a real question for a Nigerian business owner, then link to a relevant service or project when it helps the reader take the next step.</p><a href="/service.html">Explore Zanove services ↗</a></div><div className="tip-card tip-card-soft"><p className="admin-kicker">STRUCTURE GUIDE</p><ul><li>One clear H1 title</li><li>H2 headings for main sections</li><li>H3 headings for supporting ideas</li><li>Descriptive image text and captions</li><li>One author profile with a useful bio</li></ul></div></aside>
        </section>
        <section className="post-manager"><div className="post-manager-head"><div><p className="admin-kicker">YOUR JOURNAL</p><h2>Published articles <span>{posts.length}</span></h2></div><label className="search-posts"><span className="sr-only">Filter articles</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find an article" /></label></div>
          {filteredPosts.length ? <div className="post-list">{filteredPosts.map((item) => <article className="post-row" key={item.slug}>{item.coverImage && <img className="post-row-image" src={item.coverImage} alt="" />}<div className="post-row-copy"><p className="post-category">{item.category || 'Zanove Journal'}</p><h3>{item.title}</h3><p className="post-slug">/blog/{item.slug} · {authors.find((profile) => profile.id === item.authorId)?.name || 'Zanove Technologies'}</p></div><div className="post-actions"><a href={`/blog/${item.slug}`} target="_blank" rel="noreferrer">Preview ↗</a><button type="button" onClick={() => editPost(item)} disabled={busy}>Edit</button><button type="button" className="delete-button" onClick={() => removePost(item)} disabled={busy}>Remove</button></div></article>)}</div> : <div className="empty-posts"><p>{posts.length ? 'No articles match that search.' : 'No published articles yet.'}</p><button className="text-button" onClick={resetPost}>Write your first article ↗</button></div>}
        </section>
      </> : <>
        <section className="author-workspace"><div className="editor-card"><div className="editor-heading"><div><p className="admin-kicker">{editingAuthor ? 'EDIT PROFILE' : 'AUTHOR PROFILES'}</p><h2>{editingAuthor ? 'Update an author' : 'Create an author profile.'}</h2></div>{editingAuthor && <button type="button" className="text-button" onClick={newAuthor}>New profile</button>}</div>
          <form onSubmit={saveAuthor} className="admin-form"><div className="author-photo-editor">{author.image ? <img src={author.image} alt="Author profile preview" /> : <div className="author-avatar-placeholder">{author.name ? author.name.trim().charAt(0).toUpperCase() : 'A'}</div>}<div><p className="admin-kicker">PROFILE PHOTO</p><p>Give readers a face or brand mark to recognise.</p><label className="upload-button">{uploading === 'profile' ? 'Uploading…' : author.image ? 'Replace photo' : 'Upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => uploadImage(event.target.files?.[0], 'profile', (url) => setAuthor((current) => ({ ...current, image: url })), author.id || slugify(author.name))} disabled={Boolean(uploading)} /></label></div></div>
            <div className="admin-grid"><label>Name<input value={author.name} onChange={(event) => setAuthor((current) => ({ ...current, name: event.target.value, ...(!editingAuthor ? { id: slugify(event.target.value) } : {}) }))} maxLength={100} placeholder="Author name or organisation" required /></label><label>Role or title<input value={author.role} onChange={(event) => setAuthor((current) => ({ ...current, role: event.target.value }))} maxLength={100} placeholder="Founder · Product designer" /></label></div>
            <label>Profile URL ID<input value={author.id} onChange={(event) => setAuthor((current) => ({ ...current, id: event.target.value }))} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" disabled={editingAuthor} maxLength={70} placeholder="author-name" required /><small>Used as the profile identity in article data. It does not create a separate public profile page.</small></label>
            <label>Short author bio<textarea rows={5} value={author.bio} onChange={(event) => setAuthor((current) => ({ ...current, bio: event.target.value }))} maxLength={400} placeholder="Tell readers what this person or team works on. Keep it accurate and specific." required /></label>
            <div className="editor-actions"><button className="admin-primary" disabled={busy || Boolean(uploading)}>{busy ? 'Saving…' : editingAuthor ? 'Save profile' : 'Create author profile'} <span aria-hidden="true">↗</span></button>{editingAuthor && <button type="button" className="text-button" onClick={newAuthor}>Cancel</button>}</div>
          </form>
        </div><aside className="editor-sidebar"><div className="tip-card tip-card-soft"><p className="admin-kicker">AUTHOR GUIDANCE</p><h3>Make authorship clear.</h3><p>Use the real author name, role and a short factual bio. Avoid adding credentials, results or client claims unless they are verified.</p></div></aside></section>
        <section className="post-manager"><div className="post-manager-head"><div><p className="admin-kicker">PEOPLE BEHIND THE WRITING</p><h2>Author profiles <span>{authors.length}</span></h2></div><button className="outline-button" type="button" onClick={newAuthor}>＋ New profile</button></div>
          <div className="author-list">{authors.map((profile) => <article className="author-row" key={profile.id}><div className="author-avatar">{profile.image ? <img src={profile.image} alt="" /> : <span>{profile.name.slice(0, 1)}</span>}</div><div className="author-row-copy"><h3>{profile.name}</h3><p>{profile.role || 'Author'} · {profile.bio}</p><small>{posts.filter((item) => item.authorId === profile.id).length} assigned articles</small></div><div className="post-actions"><button type="button" onClick={() => { setAuthor(profile); setEditingAuthor(true); setStatus(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>{profile.id !== defaultAuthorId && <button type="button" className="delete-button" onClick={() => removeAuthor(profile)} disabled={busy}>Remove</button>}</div></article>)}</div>
        </section>
      </>}
      <div className="admin-footer"><span>{uploading ? 'Uploading an image…' : 'Changes are saved to the Zanove site repository.'}</span><button className="text-button" onClick={() => { setAuthenticated(false); setToken(''); setPosts([]); setAuthors([]); setStatus(''); }}>Sign out</button></div>
    </>}
    <style jsx>{`
      :global(body){margin:0;background:#f3f5f4;color:#182522;font:400 15px/1.65 Poppins,Inter,Arial,sans-serif}.admin-wrap{width:min(1240px,calc(100% - 36px));margin:0 auto;padding:22px 0 64px}.admin-top{display:flex;align-items:center;justify-content:space-between;margin:0 auto 34px}.admin-brand img{width:178px;height:42px;object-fit:contain;object-position:left}.admin-public-link,.tip-card a{color:#087f87;font-size:13px;font-weight:700;text-decoration:none}.login-card{max-width:650px;margin:8vh auto;padding:clamp(26px,5vw,52px);border:1px solid #dce2df;border-radius:22px;background:#fff;box-shadow:0 22px 60px #18252212}.admin-kicker{margin:0 0 8px;color:#087f87;font-size:10px;font-weight:800;letter-spacing:.14em}.login-card h1,.admin-hero h1{margin:0;color:#182522;font:600 clamp(36px,6vw,58px)/1.02 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.05em}.admin-intro{max-width:490px;margin:15px 0 26px;color:#596660}.admin-form{display:grid;gap:15px}.admin-form label{display:grid;gap:7px;color:#27332f;font-size:12px;font-weight:700}.field-hint{color:#77827d;font-size:11px;font-weight:400}.admin-form input,.admin-form textarea,.admin-form select,.search-posts input{width:100%;min-width:0;padding:11px 13px;border:1px solid #ccd5d1;border-radius:9px;background:#fff;color:#182522;font:400 13px/1.55 Poppins,Inter,Arial,sans-serif}.admin-form select{min-height:46px}.admin-form input:focus,.admin-form textarea:focus,.admin-form select:focus,.search-posts input:focus{border-color:#087f87;outline:3px solid #087f8724}.admin-form input:disabled{background:#f1f3f2;color:#68746f}.admin-form small{color:#68746f;font-size:10px;font-weight:400}.admin-primary{display:inline-flex;min-height:46px;width:fit-content;align-items:center;justify-content:center;gap:12px;padding:0 18px;border:0;border-radius:9px;background:#18d7ce;color:#061322;font:700 12px Poppins,Inter,sans-serif;text-decoration:none;cursor:pointer}.admin-primary:hover{background:#12c6bd}.admin-primary:disabled{cursor:wait;opacity:.55}.admin-footnote,.editor-help{color:#68746f;font-size:11px}.admin-footnote{margin:22px 0 0;padding-top:16px;border-top:1px solid #e8ecea}.admin-status{min-height:20px;margin:0;color:#087444;font-size:12px}.admin-status.is-error{color:#a33731}.admin-hero{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px;padding:clamp(24px,4vw,38px);border-radius:20px;background:linear-gradient(125deg,#182522,#29433b);color:white}.admin-hero h1{color:#fff}.admin-hero>div>p:last-child{max-width:620px;margin:12px 0 0;color:#e2e9e5;font-size:13px}.admin-hero .admin-kicker{color:#8ef0e7}.hero-view{flex:0 0 auto}.admin-tabs{display:flex;gap:8px;margin:0 0 20px;padding:5px;border:1px solid #dce2df;border-radius:12px;background:#fff;width:fit-content}.admin-tabs button{display:flex;align-items:center;gap:9px;padding:9px 13px;border:0;border-radius:8px;background:transparent;color:#596660;font:600 12px Poppins,Inter,sans-serif;cursor:pointer}.admin-tabs button.is-active{background:#182522;color:white}.admin-tabs button span{display:grid;min-width:21px;height:21px;place-items:center;border-radius:99px;background:#e9e3d7;color:#182522;font-size:10px}.admin-workspace{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(245px,.62fr);align-items:start;gap:18px}.editor-card,.tip-card,.post-manager{padding:clamp(20px,3vw,30px);border:1px solid #dce2df;border-radius:17px;background:#fff;box-shadow:0 8px 26px #18252208}.editor-heading,.post-manager-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px}.editor-heading h2,.post-manager-head h2{margin:0;color:#182522;font:600 clamp(23px,3.2vw,31px)/1.1 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.04em}.admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.editor-actions{display:flex;align-items:center;gap:14px;margin-top:5px}.text-button{padding:6px 0;border:0;background:transparent;color:#087f87;font:700 12px Poppins,Inter,sans-serif;cursor:pointer}.outline-button{padding:9px 12px;border:1px solid #c9d7d1;border-radius:8px;background:#fff;color:#087f87;font:700 11px Poppins,Inter,sans-serif;cursor:pointer}.cover-builder{display:grid;gap:13px;padding:16px;border:1px solid #e3e8e5;border-radius:13px;background:#fafbf9}.cover-heading{display:flex;align-items:center;justify-content:space-between;gap:14px}.cover-heading h3,.content-builder-head h3{margin:0;color:#182522;font:600 21px/1.15 'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.03em}.upload-button{display:inline-flex!important;min-height:36px;align-items:center;justify-content:center;padding:0 12px;border:1px solid #cbd8d2;border-radius:8px;background:white;color:#087f87!important;font-size:11px!important;font-weight:700!important;cursor:pointer}.upload-button input{display:none}.cover-placeholder{display:flex;align-items:center;gap:13px;padding:18px;border:1px dashed #cbd6d1;border-radius:10px;color:#64716b}.cover-placeholder>span{display:grid;width:40px;height:40px;place-items:center;border-radius:10px;background:#e9e3d7;font-size:20px}.cover-placeholder strong,.cover-placeholder small{display:block}.cover-placeholder small{margin-top:3px}.cover-preview{position:relative;overflow:hidden;max-height:240px;border-radius:10px;background:#e9e3d7}.cover-preview img{width:100%;height:240px;object-fit:cover}.remove-image{position:absolute;right:9px;top:9px;padding:6px 9px;border:0;border-radius:7px;background:#182522dc;color:white;font:600 10px Poppins,sans-serif;cursor:pointer}.content-builder-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:9px 0 4px}.content-builder-head p:not(.admin-kicker){max-width:600px;margin:8px 0 0;color:#68746f;font-size:11px}.sections-builder{display:grid;gap:14px}.section-builder{padding:15px;border:1px solid #dce3df;border-radius:13px;background:#f9faf8}.section-builder-head{display:grid;grid-template-columns:36px minmax(0,1fr) 30px;align-items:start;gap:10px}.section-number{display:grid;width:32px;height:32px;place-items:center;border-radius:9px;background:#e9e3d7;color:#182522;font:700 11px Poppins,sans-serif}.section-builder-head label{display:grid;gap:6px;color:#45514b;font-size:10px;font-weight:700}.block-stack{display:grid;gap:10px;margin:12px 0 0 46px}.content-block{padding:11px;border:1px solid #e0e6e2;border-radius:10px;background:#fff}.block-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;color:#89948e;font-size:9px;font-weight:800;letter-spacing:.12em}.content-block textarea,.content-block input{width:100%;padding:9px 10px;border:1px solid #dce3df;border-radius:7px;background:#fff;color:#182522;font:400 12px/1.6 Poppins,Inter,sans-serif;resize:vertical}.content-block textarea:focus,.content-block input:focus{border-color:#087f87;outline:2px solid #087f871c}.content-block textarea{min-height:100px}.block-quote textarea{min-height:75px;border-left:3px solid #b66d48;background:#fcfaf8;font-size:14px}.subheading-input{font:600 17px 'Bricolage Grotesque',Inter,sans-serif!important}.icon-button{display:grid;width:26px;height:26px;place-items:center;border:0;border-radius:6px;background:#eef1ef;color:#65716b;font:400 19px/1 Arial,sans-serif;cursor:pointer}.icon-button:hover{background:#e4e9e6;color:#182522}.icon-button.danger:hover{background:#fff0eb;color:#a33731}.add-block-row{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0 46px}.add-block-row button{padding:6px 8px;border:1px solid #dce3df;border-radius:7px;background:#fff;color:#52605a;font:600 10px Poppins,sans-serif;cursor:pointer}.add-block-row button:hover{border-color:#a2c9be;color:#087f87}.inline-image-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}.inline-image-row img,.inline-image-placeholder{width:112px;height:72px;object-fit:cover;border-radius:7px;background:#edf1ee}.inline-image-placeholder{display:grid;place-items:center;color:#849089;font-size:10px}.section-builder .admin-form label{display:grid}.content-block>label{display:grid;gap:5px;margin-top:9px;color:#68746f;font-size:10px;font-weight:700}.author-workspace{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,.7fr);gap:18px;align-items:start}.author-photo-editor{display:flex;align-items:center;gap:16px;margin-bottom:4px;padding:15px;border-radius:12px;background:#f8f9f7}.author-photo-editor>img,.author-avatar-placeholder{width:84px;height:84px;flex:0 0 auto;border-radius:50%;object-fit:cover}.author-avatar-placeholder{display:grid;place-items:center;background:#182522;color:#d9fff9;font:600 30px 'Bricolage Grotesque',sans-serif}.author-photo-editor p:not(.admin-kicker){margin:0 0 10px;color:#68746f;font-size:11px}.author-list{display:grid}.author-row{display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid #e5eae7}.author-avatar{display:grid;width:56px;height:56px;flex:0 0 auto;overflow:hidden;place-items:center;border-radius:50%;background:#e9e3d7;color:#182522;font:600 22px 'Bricolage Grotesque',sans-serif}.author-avatar img{width:100%;height:100%;object-fit:cover}.author-row-copy{min-width:0;flex:1}.author-row-copy h3{margin:0 0 2px;color:#182522;font:600 17px 'Bricolage Grotesque',sans-serif}.author-row-copy p{display:-webkit-box;overflow:hidden;margin:0;color:#596660;font-size:11px;-webkit-line-clamp:2;-webkit-box-orient:vertical}.author-row-copy small{color:#87928c;font-size:10px}.post-manager{margin-top:22px}.post-manager-head h2 span{display:inline-grid;min-width:28px;height:28px;place-items:center;margin-left:6px;border-radius:99px;background:#e9e3d7;font:700 11px Poppins,sans-serif;vertical-align:middle}.search-posts{width:min(270px,40%)}.post-list{border-top:1px solid #e5eae7}.post-row{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid #e5eae7}.post-row-image{width:82px;height:62px;flex:0 0 auto;border-radius:8px;object-fit:cover}.post-row-copy{min-width:0;flex:1}.post-category,.post-slug{color:#68746f;font-size:10px}.post-row h3{margin:3px 0;color:#182522;font:600 16px/1.2 'Bricolage Grotesque',Inter,sans-serif}.post-actions{display:flex;flex:0 0 auto;align-items:center;gap:12px}.post-actions a,.post-actions button{padding:0;border:0;background:none;color:#087f87;font:700 10px Poppins,Inter,sans-serif;text-decoration:none;cursor:pointer}.post-actions .delete-button{color:#a33731}.post-actions button:disabled{opacity:.5}.empty-posts{padding:30px 0;color:#596660}.empty-posts p{margin-bottom:8px}.author-workspace+.post-manager{margin-top:20px}.admin-footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;color:#68746f;font-size:10px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      .admin-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.72fr);align-items:center}.admin-hero-copy>p:last-of-type{margin-bottom:18px!important}.admin-hero-visual{position:relative;min-height:190px;overflow:hidden;border:1px solid #ffffff30;border-radius:14px;background:#e9e3d7}.admin-hero-visual img{position:absolute;width:100%;height:100%;inset:0;object-fit:cover}.admin-hero-visual:after{position:absolute;inset:35% 0 0;content:"";background:linear-gradient(transparent,#101b18a8)}.admin-hero-visual span{position:absolute;z-index:1;right:14px;bottom:13px;left:14px;color:#fff;font:600 15px 'Bricolage Grotesque',Inter,sans-serif}.section-tools{display:grid;min-width:220px;gap:8px}.section-tools select{width:100%;min-height:38px;padding:8px 10px;border:1px solid #cbd8d2;border-radius:8px;background:#fff;color:#52605a;font:500 11px Poppins,Inter,sans-serif}.rich-editor{overflow:hidden;border:1px solid #dce3df;border-radius:10px;background:#fff}.rich-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:7px;border-bottom:1px solid #e5eae7;background:#f8faf8}.rich-toolbar-label{margin:0 6px;color:#89948e;font-size:8px;font-weight:800;letter-spacing:.12em}.rich-toolbar button{min-width:30px;height:30px;padding:0 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:#405048;font:600 11px Poppins,Inter,sans-serif;cursor:pointer}.rich-toolbar button:hover,.rich-toolbar button.toolbar-selected{border-color:#c9d7d1;background:#fff;color:#087f87}.rich-toolbar-divider{width:1px;height:19px;margin:0 4px;background:#dce3df}.rich-editable{min-height:170px;padding:13px 14px;color:#27332f;font:400 13px/1.75 Poppins,Inter,sans-serif;outline:none}.rich-editable:empty:before{content:attr(data-placeholder);color:#9aa49f}.rich-editable:focus{box-shadow:inset 0 0 0 2px #087f8714}.rich-editable p{margin:0 0 10px}.rich-editable h3{margin:18px 0 7px;color:#182522;font:600 19px/1.25 'Bricolage Grotesque',Inter,sans-serif}.rich-editable ul,.rich-editable ol{padding-left:24px}.rich-editable a{color:#087f87;text-decoration:underline}.rich-hint{margin:0;padding:0 12px 9px;color:#68746f;font-size:10px}.article-richtext h3{margin:22px 0 8px;color:#182522;font:600 clamp(19px,2.5vw,24px)/1.2 'Bricolage Grotesque','Inter',sans-serif;letter-spacing:-.025em}.article-richtext ul,.article-richtext ol{margin:14px 0;padding-left:26px;color:#3f4b53;line-height:1.85}.article-richtext li+li{margin-top:6px}.article-richtext a{color:#087f87;font-weight:600;text-underline-offset:3px}.article-richtext blockquote{margin:20px 0;padding:16px 20px;border-left:4px solid #b66d48;border-radius:0 10px 10px 0;background:#f3eee5;color:#182522}.article-richtext p+p{margin-top:12px}
      @media(max-width:850px){.admin-workspace,.author-workspace{grid-template-columns:1fr}.editor-sidebar{grid-template-columns:1fr 1fr}.admin-hero{align-items:start;flex-direction:row}.hero-view{width:fit-content}.post-row{align-items:start;flex-wrap:wrap}.post-actions{margin-left:auto}.section-builder-head{grid-template-columns:32px minmax(0,1fr) 28px}}
      @media(max-width:580px){.admin-wrap{width:calc(100% - 22px);padding-top:12px}.admin-top{margin-bottom:20px}.admin-brand img{width:145px}.editor-sidebar{grid-template-columns:1fr}.admin-grid{grid-template-columns:1fr}.cover-heading,.content-builder-head,.post-manager-head{align-items:start;flex-direction:column}.content-builder-head .outline-button{width:100%}.block-stack,.add-block-row{margin-left:0}.section-builder{padding:11px}.editor-actions{align-items:stretch;flex-direction:column}.admin-primary,.hero-view{width:100%}.author-row{align-items:flex-start;flex-wrap:wrap}.author-row .post-actions{width:100%;margin-left:70px}.search-posts{width:100%}.admin-tabs{width:100%}.admin-tabs button{flex:1;justify-content:center}.inline-image-row{align-items:flex-start;flex-direction:column}.post-row-image{width:100%;height:135px}.post-actions{width:100%;justify-content:flex-start;margin-left:0}.admin-hero{grid-template-columns:1fr;gap:16px}.admin-hero-visual{min-height:145px}.section-tools{width:100%}.section-tools .outline-button{width:100%}.rich-toolbar{gap:2px;padding:5px}.rich-toolbar-label{display:none}.rich-toolbar button{padding:0 6px}}
    `}</style>
  </main>;
}
