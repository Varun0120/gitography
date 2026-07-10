export const metadata = {
  title: "Gitography",
  description: "Google Maps for a codebase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f1520", color: "#e6edf3" }}>
        {children}
      </body>
    </html>
  );
}
