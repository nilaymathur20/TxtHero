import Link from "next/link";
import PrivateFiles from "@/src/components/PrivateFiles";
import { authenticatedUserId } from "@/src/lib/server/auth";

export const metadata = {
  title: "Dashboard — TxtHero",
  description: "Open TxtHero workspaces and manage private files.",
};

export default async function Dashboard() {
  const userId = await authenticatedUserId();
  const authEnabled = true;

  return (
    <main className="dashboard-page">
      <header>
        <div>
          <h1>Workspace dashboard</h1>
          <p>Choose how you want to work.</p>
        </div>
        {userId ? (
          <Link href="/sign-out" className="local-badge">Sign out</Link>
        ) : (
          <Link href="/sign-in" className="local-badge">Sign in</Link>
        )}
      </header>
      <section className="workspace-cards">
        <Link href="/"><strong>Documents</strong><span>Write and manage local documents</span></Link>
        <Link href="/format"><strong>Universal formatter</strong><span>Edit source, Office, PDF, and text files</span></Link>
        <Link href="/collab"><strong>TxtHero Live</strong><span>Start or join a collaborative rich-text room</span></Link>
      </section>
      {userId ? (
        <PrivateFiles />
      ) : (
        <section className="private-files">
          <h2>Private cloud files</h2>
          <p>Sign in to enable authenticated private storage. Local documents remain available without an account.</p>
        </section>
      )}
    </main>
  );
}
