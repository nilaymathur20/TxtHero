"use client";

/** Searchable grouped font picker that lazily imports selected Google Fonts. */
import { useEffect, useMemo, useState } from "react";
import useApi from "../hooks/useApi";
import { getRememberedFont, loadGoogleFont, rememberFont } from "../lib/fonts";

export default function FontSelector({ onChange, value }) {
  const api = useApi();
  const [categories, setCategories] = useState({});
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value || "Inter");

  useEffect(() => {
    api.get("/fonts").then(({ data }) => setCategories(data.categories)).catch(() => setCategories({ "sans-serif": [{ name: "Arial", stack: "Arial, sans-serif", google: false }] }));
    const remembered = getRememberedFont();
    if (!value && remembered) { setSelected(remembered.name); loadGoogleFont(remembered); }
  }, [api, value]);

  useEffect(() => {
    if (value) setSelected(value);
  }, [value]);

  const visible = useMemo(() => Object.fromEntries(Object.entries(categories).map(([category, fonts]) => [category, fonts.filter((font) => font.name.toLowerCase().includes(query.toLowerCase()))])), [categories, query]);
  const selectedFont = useMemo(() => Object.values(categories).flat().find((font) => font.name === selected), [categories, selected]);
  const select = (name) => {
    const font = Object.values(categories).flat().find((item) => item.name === name);
    if (!font) return;
    setSelected(name); loadGoogleFont(font); rememberFont(font); onChange(font);
  };

  return (
    <label className="font-selector">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter fonts" aria-label="Filter fonts" />
      <select value={selected} onChange={(event) => select(event.target.value)} aria-label="Font family">
        {Object.entries(visible).map(([category, fonts]) => fonts.length > 0 && <optgroup label={category} key={category}>{fonts.map((font) => <option value={font.name} key={font.name} style={{ fontFamily: font.stack }}>{font.name}</option>)}</optgroup>)}
      </select>
      <span className="font-preview" style={{ fontFamily: selectedFont?.stack }} aria-hidden="true">Aa</span>
    </label>
  );
}
