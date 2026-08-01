"use client";

/** VS Code-inspired title row for the collaborative workspace. */
import ConnectionStatus from "./ConnectionStatus";
import ShareButton from "./ShareButton";

export default function TitleBar({ documentId, expiresAt, connection }) {
  const grouped = documentId.match(/.{1,3}/g)?.join(" ") || documentId;
  return <header className="collab-header"><div><strong>TxtHero Live</strong><small>Session: {grouped}{expiresAt ? " · expires in 1 hour" : ""}</small></div><div className="collab-header-actions"><ConnectionStatus {...connection} /><ShareButton documentId={documentId} /></div></header>;
}
