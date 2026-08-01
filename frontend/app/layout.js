import "./globals.css";
import "@/src/styles/code-block.css";
import AuthProvider from "@/src/components/AuthProvider";
import CookieConsent from "@/src/components/CookieConsent";
import SiteFooter from "@/src/components/SiteFooter";
import AppHeader from "@/src/components/AppHeader";
import ThemeProvider from "@/src/components/ThemeProvider";

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://127.0.0.1:3210"),
  title: { default: "TxtHero — Your writing workspace", template: "%s | TxtHero" },
  description: "A focused place to write, edit, and organize your documents.",
  openGraph: { title: "TxtHero", description: "Collaborative editing and universal formatting", type: "website" },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || "replace-in-production" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><ThemeProvider><AuthProvider><AppHeader />{children}<SiteFooter /><CookieConsent /></AuthProvider></ThemeProvider></body>
    </html>
  );
}
