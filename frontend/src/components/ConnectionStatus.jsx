"use client";

export default function ConnectionStatus({ status, synced, lastSync, latency }) {
  const label = status === "connected"
    ? (synced ? "Connected · synced" : "Connected · syncing")
    : (status === "connecting" ? "Reconnecting…" : "Disconnected");
  const detail = lastSync ? `Last sync ${Math.max(0, Math.round((Date.now() - lastSync) / 1000))}s ago` : "Waiting for initial sync";

  return (
    <div className={`collab-connection ${status}`} title={detail} role="status">
      <span />{label}{latency != null ? ` · ${latency}ms` : ""}
    </div>
  );
}
