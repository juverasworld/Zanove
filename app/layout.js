export const metadata = {
  title: 'Zanove Technologies',
  description: 'Technology, with purpose.',
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
