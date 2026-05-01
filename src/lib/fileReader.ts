import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

type UploadedFile = Express.Multer.File;

export type FileExtractResult = {
  name: string;
  type: string;
  text: string;
};

const supportedExtensions = new Set([
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpeg",
  ".jpg",
  ".pdf"
]);

export function isSupportedFile(filename: string): boolean {
  const ext = getExtension(filename);
  return supportedExtensions.has(ext);
}

export async function extractTextFromFile(file: UploadedFile): Promise<FileExtractResult> {
  const ext = getExtension(file.originalname);

  try {
    if (ext === ".txt" || ext === ".md") {
      return makeResult(file, file.buffer.toString("utf-8"));
    }

    if (ext === ".docx") {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      return makeResult(file, parsed.value);
    }

    if (ext === ".doc") {
      const text = await extractDocText(file.buffer);
      return makeResult(file, text);
    }

    if (ext === ".xls" || ext === ".xlsx") {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const content = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_csv(sheet);
      }).join("\n");
      return makeResult(file, content);
    }

    if (ext === ".pdf") {
      const parser = new PDFParse({ data: file.buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      return makeResult(file, parsed.text);
    }

    if (ext === ".png" || ext === ".jpeg" || ext === ".jpg") {
      const ocr = await Tesseract.recognize(file.buffer, "rus+eng");
      return makeResult(file, ocr.data.text);
    }
  } catch (error) {
    console.error(`[Files] Extraction failed for ${file.originalname}:`, error);
    return makeResult(file, "");
  }

  return makeResult(file, "");
}

function makeResult(file: UploadedFile, text: string): FileExtractResult {
  return {
    name: file.originalname,
    type: file.mimetype,
    text: (text || "").trim()
  };
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex < 0) {
    return "";
  }
  return filename.slice(dotIndex).toLowerCase();
}

async function extractDocText(buffer: Buffer): Promise<string> {
  let tempPath = "";
  try {
    const WordExtractorModule = await import("word-extractor");
    const WordExtractor = (WordExtractorModule as unknown as { default: new () => any }).default;
    const extractor = new WordExtractor();
    tempPath = path.join(os.tmpdir(), `mvp-doc-${crypto.randomUUID()}.doc`);
    await fs.writeFile(tempPath, buffer);
    const doc = await extractor.extract(tempPath);
    return String(doc.getBody?.() ?? "").trim();
  } catch (error) {
    console.error("[Files] .doc extraction fallback error:", error);
    return "";
  } finally {
    if (tempPath) {
      fs.unlink(tempPath).catch(() => {});
    }
  }
}
