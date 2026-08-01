/**
 * Loss-minimizing browser document pipelines.
 *
 * OOXML formats are ZIP packages. We edit only their text/cell XML and keep
 * every untouched package entry byte-for-byte, which preserves relationships,
 * media, themes, charts, metadata, and unsupported features.
 */
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

const OOXML_MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function extensionOf(filename) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function parseXml(source) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("The document XML is invalid");
  return document;
}

function serializeXml(document) {
  return new XMLSerializer().serializeToString(document);
}

function nodesByLocalName(root, name) {
  return Array.from(root.getElementsByTagNameNS("*", name));
}

function textValue(value) {
  if (value == null) return "";
  if (typeof value === "object" && "formula" in value) return `=${value.formula}`;
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return value.text ?? value.result ?? String(value);
}

function isProbablyText(bytes) {
  if (!bytes.byteLength) return true;
  const sample = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8192));
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    return false;
  }
}

async function parseSpreadsheet(bytes) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheets = workbook.worksheets.map((sheet) => {
    const cells = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push({
          address: cell.address,
          value: textValue(cell.value),
          formula: cell.value?.formula || null,
        });
      });
    });
    return {
      name: sheet.name,
      rowCount: Math.max(sheet.rowCount, 1),
      columnCount: Math.max(sheet.columnCount, 1),
      cells,
    };
  });
  return {
    kind: "spreadsheet",
    data: sheets,
    original: bytes,
    warning: "Edits update cell values inside the original workbook; styles, charts, relationships, and untouched formulas are retained.",
  };
}

async function parseWord(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("DOCX document.xml is missing");
  const document = parseXml(await entry.async("string"));
  const paragraphs = nodesByLocalName(document, "p").map((paragraph, index) => ({
    id: index,
    text: nodesByLocalName(paragraph, "t").map((node) => node.textContent || "").join(""),
  }));
  return {
    kind: "document",
    data: paragraphs,
    original: bytes,
    warning: "Text edits are written into the original DOCX package; untouched formatting, media, sections, and relationships are retained.",
  };
}

async function parsePresentation(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  const slides = await Promise.all(slidePaths.map(async (slidePath, slideIndex) => {
    const document = parseXml(await zip.file(slidePath).async("string"));
    return {
      id: slideIndex,
      path: slidePath,
      blocks: nodesByLocalName(document, "t").map((node, blockIndex) => ({
        id: blockIndex,
        text: node.textContent || "",
      })),
    };
  }));
  return {
    kind: "slides",
    data: slides,
    original: bytes,
    warning: "Text edits are patched into the original PPTX slides; layout, themes, images, notes, transitions, and relationships remain intact.",
  };
}

async function parsePdf(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push({
      pageNumber,
      text: content.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim(),
    });
  }
  return {
    kind: "pdf",
    data: pages,
    original: bytes,
    warning: "Original PDF pages are preserved. Edited accessible text is appended as clearly labeled pages because arbitrary positioned PDF content cannot be losslessly reconstructed.",
  };
}

export async function parseDocument(file) {
  const extension = extensionOf(file.name);
  const bytes = await file.arrayBuffer();
  if (extension === "xlsx") return parseSpreadsheet(bytes);
  if (extension === "docx") return parseWord(bytes);
  if (extension === "pptx") return parsePresentation(bytes);
  if (extension === "pdf") return parsePdf(bytes);
  if (isProbablyText(bytes)) {
    return {
      kind: "text",
      data: new TextDecoder().decode(bytes),
      original: bytes,
      warning: "This UTF-8 text format is editable and will be exported with its original filename and extension.",
    };
  }
  return {
    kind: "binary",
    data: null,
    original: bytes,
    warning: "Unknown binary files remain read-only and download byte-identically. Claiming arbitrary binary editing would risk corruption.",
  };
}

async function exportSpreadsheet(model) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(model.original);
  for (const sheetModel of model.data) {
    const sheet = workbook.getWorksheet(sheetModel.name);
    if (!sheet) continue;
    for (const cellModel of sheetModel.cells) {
      const cell = sheet.getCell(cellModel.address);
      if (cellModel.formula && cellModel.value === `=${cellModel.formula}`) continue;
      cell.value = typeof cellModel.value === "string" && cellModel.value.startsWith("=")
        ? { formula: cellModel.value.slice(1) }
        : cellModel.value;
    }
  }
  return new Blob([await workbook.xlsx.writeBuffer()], { type: OOXML_MIME.xlsx });
}

async function exportWord(model) {
  const zip = await JSZip.loadAsync(model.original);
  const entry = zip.file("word/document.xml");
  const document = parseXml(await entry.async("string"));
  nodesByLocalName(document, "p").forEach((paragraph, index) => {
    const textNodes = nodesByLocalName(paragraph, "t");
    if (!textNodes.length) return;
    textNodes[0].textContent = model.data[index]?.text ?? "";
    textNodes.slice(1).forEach((node) => { node.textContent = ""; });
  });
  zip.file("word/document.xml", serializeXml(document));
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })], { type: OOXML_MIME.docx });
}

async function exportPresentation(model) {
  const zip = await JSZip.loadAsync(model.original);
  for (const slideModel of model.data) {
    const entry = zip.file(slideModel.path);
    if (!entry) continue;
    const document = parseXml(await entry.async("string"));
    nodesByLocalName(document, "t").forEach((node, index) => {
      node.textContent = slideModel.blocks[index]?.text ?? "";
    });
    zip.file(slideModel.path, serializeXml(document));
  }
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })], { type: OOXML_MIME.pptx });
}

function wrapText(text, maxCharacters = 90) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function exportPdf(model) {
  const pdf = await PDFDocument.load(model.original);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const pageModel of model.data) {
    const lines = wrapText(pageModel.text);
    for (let offset = 0; offset < lines.length || offset === 0; offset += 45) {
      const page = pdf.addPage();
      const { width, height } = page.getSize();
      page.drawText(`Edited accessible text — original page ${pageModel.pageNumber}`, {
        x: 40, y: height - 45, size: 13, font,
      });
      page.drawText(lines.slice(offset, offset + 45).join("\n"), {
        x: 40, y: height - 75, size: 10, font, lineHeight: 14, maxWidth: width - 80,
      });
    }
  }
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export async function exportDocument(model, filename) {
  const extension = extensionOf(filename);
  if (extension === "xlsx") return exportSpreadsheet(model);
  if (extension === "docx") return exportWord(model);
  if (extension === "pptx") return exportPresentation(model);
  if (extension === "pdf") return exportPdf(model);
  if (model.kind === "text") {
    return new Blob([model.data], { type: "text/plain;charset=utf-8" });
  }
  return new Blob([model.original], { type: "application/octet-stream" });
}
