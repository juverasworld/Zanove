export const metadata = {
  title: 'Zanove Technologies',
  description: 'Technology, with purpose.',
  icons: {
    icon: [
      { url: '/assets/zanove-favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/zanove-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/zanove-favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/assets/zanove-apple-touch-icon.png',
  },
  verification: {
    google: 'Z1rbCX8T_WfYfE_uLcgIFZVqsTPcdF8znA0PuYP5aeY',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
