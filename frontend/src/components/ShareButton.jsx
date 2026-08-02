"use client";

/** Copy a static-export-safe collaboration URL in browsers and Electron. */
import { Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export default function ShareButton({ documentId }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(new URL(`/collab?room=${documentId}`, window.location.href).toString());
  }, [documentId]);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea"); input.value = url; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
    }
    toast.success("Secure session link copied");
  };
  return <div className="live-share">
    <button className="collab-share" onClick={() => setOpen(!open)}><Link2 size={16} /> Share</button>
    {open && url && <div className="live-share-card">
      <QRCodeSVG value={url} size={176} level="M" />
      <strong>{documentId.match(/.{1,3}/g)?.join(" ")}</strong>
      <small>Short-lived, permission-controlled session</small>
      <button onClick={share}>Copy join link</button>
    </div>}
  </div>;
}
