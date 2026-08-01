"use client";

export default function WordEditor({ model, onChange }) {
  const updateParagraph = (index, text) => {
    const next = structuredClone(model);
    next.data[index].text = text;
    onChange(next);
  };
  return (
    <div className="word-editor" role="document">
      {model.data.map((paragraph, index) => (
        <textarea
          key={paragraph.id}
          aria-label={`Paragraph ${index + 1}`}
          value={paragraph.text}
          onChange={(event) => updateParagraph(index, event.target.value)}
        />
      ))}
    </div>
  );
}
