export const metadata = {
  title: "3D Model Viewer",
  description: "Upload an OBJ file and view it instantly in 3D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
