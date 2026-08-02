"use client";

/** Compact font-size chooser shared by solo and collaborative editing. */
export default function SizeSelector({ value, onChange }) {
  return <select className="size-selector" value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label="Font size">{[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => <option key={size}>{size}</option>)}</select>;
}
