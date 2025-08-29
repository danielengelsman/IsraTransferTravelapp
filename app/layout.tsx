import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Trip AI Starter" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1 style={{ margin: 0, fontSize: 20 }}>Trip AI</h1>
            <nav className="nav">
              <Link href="/">Dashboard</Link>
              <Link href="/ai">Trip AI</Link>
              <Link href="/login">Login</Link>
            </nav>
          </header>
          <div style={{ height: 12 }} />
          {children}
        </div>
      </body>
    </html>
  );
}
