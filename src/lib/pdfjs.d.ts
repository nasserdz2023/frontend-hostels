// src/lib/pdfjs.d.ts
// Type declarations for the local pdfjs.mjs bundle (pdf.js 6.0.227)
// Re-exports all types from pdfjs-dist so TypeScript understands
// that @/lib/pdfjs provides the same API as the npm package.
declare module "@/lib/pdfjs" {
  export * from "pdfjs-dist";
}
