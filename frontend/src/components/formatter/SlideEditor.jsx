"use client";

export default function SlideEditor({ model, onChange }) {
  const updateBlock = (slideIndex, blockIndex, text) => {
    const next = structuredClone(model);
    next.data[slideIndex].blocks[blockIndex].text = text;
    onChange(next);
  };

  return (
    <div className="slide-editor">
      {model.data.map((slide, slideIndex) => (
        <section key={slide.path}>
          <span className="slide-number">Slide {slideIndex + 1}</span>
          {slide.blocks.length ? slide.blocks.map((block, blockIndex) => (
            <textarea
              key={block.id}
              aria-label={`Slide ${slideIndex + 1} text block ${blockIndex + 1}`}
              value={block.text}
              onChange={(event) => updateBlock(slideIndex, blockIndex, event.target.value)}
            />
          )) : <p>This slide has no editable text nodes.</p>}
        </section>
      ))}
    </div>
  );
}
