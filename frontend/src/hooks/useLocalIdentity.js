"use client";

/** Create and persist the no-login guest identity used by awareness. */
import { useEffect, useState } from "react";

const COLORS = ["#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#c026d3", "#db2777", "#0d9488", "#4f46e5", "#9333ea"];

export default function useLocalIdentity() {
  const [identity, setIdentity] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("txthero-guest"));
      if (saved?.id && saved?.name && saved?.color) return setIdentity(saved);
    } catch { /* Invalid local data is safely replaced below. */ }
    const id = window.crypto.randomUUID();
    const next = { id, name: `User ${id.slice(0, 4).toUpperCase()}`, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    window.localStorage.setItem("txthero-guest", JSON.stringify(next));
    setIdentity(next);
  }, []);

  const setDisplayName = (name) => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    setIdentity((current) => {
      const next = { ...current, name: clean };
      window.localStorage.setItem("txthero-guest", JSON.stringify(next));
      return next;
    });
  };

  return { identity, userId: identity?.id, displayName: identity?.name, color: identity?.color, setDisplayName };
}
