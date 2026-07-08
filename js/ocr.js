/* =========================================================
   AMIT AI — ocr.js
   Extracts text from an uploaded/captured image using
   Tesseract.js (loaded lazily from CDN on first use).
   Depends on: utils.js
   ========================================================= */

window.OCR = (function () {

  const TESSERACT_CDN = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js";
  let libLoaded = false;
  let libLoading = null;

  /* ---------------------------------------------------------
     loadLibrary — injects the Tesseract.js script tag once,
     reused for every subsequent OCR call.
  --------------------------------------------------------- */
  function loadLibrary() {
    if (libLoaded && window.Tesseract) return Promise.resolve();
    if (libLoading) return libLoading;

    libLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_CDN;
      script.onload = () => {
        libLoaded = true;
        resolve();
      };
      script.onerror = () => {
        libLoading = null;
        reject(new Error("Tesseract.js load nahi ho paya. Internet connection check karein."));
      };
      document.head.appendChild(script);
    });

    return libLoading;
  }

  /* ---------------------------------------------------------
     extractText — runs OCR on a base64 image string or File.
     onProgress(percent) is optional, called during recognition.
     Returns: { success: boolean, text: string, error?: string }
  --------------------------------------------------------- */
  async function extractText(imageSource, onProgress) {
    try {
      await loadLibrary();
    } catch (e) {
      return { success: false, text: "", error: e.message };
    }

    if (!window.Tesseract) {
      return { success: false, text: "", error: "OCR library available nahi hai." };
    }

    try {
      const result = await window.Tesseract.recognize(imageSource, "eng+hin", {
        logger: (info) => {
          if (onProgress && info.status === "recognizing text") {
            onProgress(Math.round(info.progress * 100));
          }
        }
      });

      const text = (result.data.text || "").trim();

      if (!text) {
        return { success: false, text: "", error: "Image me koi readable text nahi mila." };
      }

      return { success: true, text };
    } catch (e) {
      console.error("[OCR.extractText] failed:", e);
      return { success: false, text: "", error: "OCR process fail ho gaya, dobara try karein." };
    }
  }

  /* ---------------------------------------------------------
     isSupported — a lightweight check callers can use before
     showing OCR-related UI hints (doesn't guarantee the CDN
     is reachable, just checks basic browser capability).
  --------------------------------------------------------- */
  function isSupported() {
    return typeof Worker !== "undefined"; // Tesseract.js needs Web Workers
  }

  return {
    extractText,
    isSupported
  };

})();