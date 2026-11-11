import BlogEditor from './editor';

export const metadata = {
  title: 'Zanove Blog Admin',
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminPage() {
  return <BlogEditor />;
}
