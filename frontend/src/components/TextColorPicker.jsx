"use client";

import { Palette, RotateCcw } from "lucide-react";

const DEFAULT_COLOR = "#1f2937";

export default function TextColorPicker({ editor }) {
  const activeColor = editor?.getAttributes("textStyle").color || DEFAULT_COLOR;

  return (
    <div className="text-color-picker" title="Text color">
      <label aria-label="Choose text color">
        <Palette size={17} />
        <span className="text-color-swatch" style={{ backgroundColor: activeColor }} />
        <input
          type="color"
          value={activeColor}
          onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()}
          aria-label="Text color"
        />
      </label>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetColor().run()}
        aria-label="Reset text color"
        title="Reset text color"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
