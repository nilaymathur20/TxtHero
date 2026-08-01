"use client";

export default function PdfEditor({ model, onChange }) {
  const updatePage = (index, text) => {
    const next = structuredClone(model);
    next.data[index].text = text;
    onChange(next);
  };
  return (
    <div className="pdf-editor">
      {model.data.map((page, index) => (
        <section key={page.pageNumber}>
          <h3>Page {page.pageNumber}</h3>
          <textarea
            value={page.text}
            aria-label={`PDF page ${page.pageNumber} accessible text`}
            onChange={(event) => updatePage(index, event.target.value)}
          />
        </section>
      ))}
    </div>
  );
}
