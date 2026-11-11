export const metadata = {
  title: 'Zanove Technologies',
  description: 'Technology, with purpose.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
