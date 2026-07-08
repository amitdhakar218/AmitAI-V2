/* =========================================================
   AMIT AI — pdf.js
   Extracts text from an uploaded PDF using PDF.js
   (loaded lazily from CDN on first use).
   Depends on: utils.js
   ========================================================= */

window.PDFReader = (function () {

  const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const MAX_PAGES = 40;          // safety cap so huge PDFs don't freeze the UI
  const MAX_CHARS = 20000;       // safety cap on total extracted text length

  let libLoaded = false;
  let libLoading = null;

  /* ---------------------------------------------------------
     loadLibrary — injects the PDF.js script tag once and
     points its worker to the matching CDN worker file.
  --------------------------------------------------------- */
  function loadLibrary() {
    if (libLoaded && window.pdfjsLib) return Promise.resolve();
    if (libLoading) return libLoading;

    libLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS_CDN;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        }
        libLoaded = true;
        resolve();
      };
      script.onerror = () => {
        libLoading = null;
        reject(new Error("PDF reader library load nahi ho payi. Internet connection check karein."));
      };
      document.head.appendChild(script);
    });

    return libLoading;
  }

  /* ---------------------------------------------------------
     extractText — reads a PDF File object and returns its
     text content page-by-page.
     onProgress(currentPage, totalPages) is optional.
     Returns: { success, text, pageCount, truncated, error? }
  --------------------------------------------------------- */
  async function extractText(file, onProgress) {
    try {
      await loadLibrary();
    } catch (e) {
      return { success: false, text: "", pageCount: 0, truncated: false, error: e.message };
    }

    if (!window.pdfjsLib) {
      return { success: false, text: "", pageCount: 0, truncated: false, error: "PDF library available nahi hai." };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const totalPages = pdf.numPages;
      const pagesToRead = Math.min(totalPages, MAX_PAGES);
      let fullText = "";
      let truncated = totalPages > MAX_PAGES;

      for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        fullText += pageText + "\n\n";

        if (onProgress) onProgress(pageNum, pagesToRead);

        if (fullText.length > MAX_CHARS) {
          fullText = fullText.slice(0, MAX_CHARS);
          truncated = true;
          break;
        }
      }

      fullText = fullText.trim();

      if (!fullText) {
        return {
          success: false, text: "", pageCount: totalPages, truncated: false,
          error: "PDF se koi text extract nahi ho paya (shayad yeh scanned/image-based PDF hai)."
        };
      }

      return { success: true, text: fullText, pageCount: totalPages, truncated };
    } catch (e) {
      console.error("[PDFReader.extractText] failed:", e);
      return { success: false, text: "", pageCount: 0, truncated: false, error: "Yeh file valid PDF nahi lag rahi ya padhi nahi ja saki." };
    }
  }

  return {
    extractText
  };

})();