import Link from "next/link";
export default function SiteFooter() { return <footer className="site-footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><Link href="/contact?subject=Bug%20Report">Report a bug</Link></footer>; }
