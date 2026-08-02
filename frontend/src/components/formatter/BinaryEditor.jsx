import { ShieldCheck } from "lucide-react";

export default function BinaryEditor() {
  return (
    <div className="binary-editor">
      <ShieldCheck size={32} />
      <strong>Read-only binary</strong>
      <p>The original bytes are retained and will download without modification.</p>
    </div>
  );
}
