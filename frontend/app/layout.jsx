import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Gitography",
  description: "AI agents can answer questions about code — Gitography lets you SEE it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ fontSize: 14 }}>
        {children}
      </body>
    </html>
  );
}
