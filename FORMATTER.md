# Universal Formatter

## Capability matrix

| Input | Parser | Editor | Export strategy |
| --- | --- | --- | --- |
| JS/JSX/MJS/CJS | Prettier Babel/Estree | Monaco split source/preview | UTF-8 source with original filename |
| Flow | Prettier Flow | Monaco split source/preview | UTF-8 source |
| TS/TSX/MTS/CTS | Prettier TypeScript | Monaco split source/preview | UTF-8 source |
| JSON/JSON5/JSONC | Prettier JSON parsers | Monaco split source/preview | UTF-8 source |
| CSS/SCSS/Less | Prettier PostCSS | Monaco split source/preview | UTF-8 source |
| HTML/Vue/Angular | Prettier HTML/Angular | Monaco split source/preview | UTF-8 source |
| Handlebars | Prettier Glimmer | Monaco split source/preview | UTF-8 source |
| Markdown/MDX | Prettier Markdown | Monaco split source/preview | UTF-8 source |
| YAML | Prettier YAML | Monaco split source/preview | UTF-8 source |
| GraphQL | Prettier GraphQL | Monaco split source/preview | UTF-8 source |
| XLSX | ExcelJS | Addressed spreadsheet grid | Patch cells in original workbook; retain untouched styles, formulas, charts, and relationships |
| DOCX | JSZip + OOXML DOM | Paragraph editor | Patch `word/document.xml` inside original package |
| PPTX | JSZip + OOXML DOM | Slide-by-slide text-block canvas | Patch slide XML inside original package |
| PDF | PDF.js text extraction | Per-page accessible-text editor | Preserve original pages and append edited accessible-text pages with pdf-lib |
| Other UTF-8 text | TextDecoder | Text editor | UTF-8 with original extension |
| Unknown binary | Magic/NUL/UTF-8 detection | Read-only binary panel | Byte-identical original |

## Round-trip guarantees

“Never lose data” cannot honestly mean arbitrary proprietary layout can be reconstructed after free-form editing. TxtHero therefore uses two enforceable guarantees:

1. Untouched OOXML package parts are retained rather than regenerated.
2. Unsupported binary formats are read-only and exported byte-identically.

PDF content streams may encode glyphs without semantic text or use arbitrary drawing operations. TxtHero preserves every original PDF page and appends edited accessible text rather than claiming lossless reconstruction.

## Packages

- `prettier` and built-in plugins: source parsing and formatting
- `@monaco-editor/react`: source and formatted preview editors
- `exceljs`: workbook read/write while preserving workbook structures
- `jszip`: loss-minimizing DOCX/PPTX OOXML package edits
- `pdfjs-dist`: PDF text extraction
- `pdf-lib`: safe PDF page preservation and accessible-text export
- `react-dropzone`: drag-and-drop input
- `react-hot-toast`: operation feedback
- `lucide-react`: interface icons
- `file-type`: server-side upload magic-byte detection

## Limits

- Password-protected Office/PDF files are not editable.
- VBA/macros are retained as untouched package entries but never executed.
- DOCX edits preserve package structure, but merging a paragraph into its first text run can change run-level styling within that edited paragraph.
- PPTX edits preserve the number and position of existing text nodes; TxtHero does not create arbitrary shapes.
- Formula text beginning with `=` is written as a formula. Formula calculation is left to the spreadsheet application.
