export const metadata = {
  title: "3D Model Viewer",
  description: "Upload an OBJ file and view it instantly in 3D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-mono: 'IBM Plex Mono', monospace;
            --font-sans: 'Inter', -apple-system, sans-serif;
          }
        `}</style>
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
