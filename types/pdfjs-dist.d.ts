declare module "pdfjs-dist/build/pdf.mjs" {
  import type { PDFDocumentProxy } from "pdfjs-dist";
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(options: Record<string, unknown>): {
    destroy(): Promise<void>;
    promise: Promise<PDFDocumentProxy>;
  };
}
