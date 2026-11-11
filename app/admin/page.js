import BlogEditor from './editor';

export const metadata = {
  title: 'Zanove Blog Admin',
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminPage() {
  return <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <BlogEditor />
  </>;
}
