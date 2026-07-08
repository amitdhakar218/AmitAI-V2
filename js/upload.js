/* =========================================================
   AMIT AI — upload.js  (UPDATED: auto-OCR on images)
   Owns the "+" plus-menu, hidden file inputs, attachment
   previews, and drag & drop. chat.js reads pending
   attachments from this module when sending a message.
   Depends on: utils.js, pdf.js, ocr.js
   ========================================================= */

window.Upload = (function () {

  let pendingAttachments = [];

  let plusBtn, plusMenu, attachPreviewBox, dropzoneOverlay, appEl;
  let fileInputs = {};

  /* ---------------------------------------------------------
     addAttachment — pushes a new attachment object and
     re-renders the preview strip.
     attachment = { id, name, type, isImage, isPdf, data, extractedText? }
  --------------------------------------------------------- */
  function addAttachment(attachment) {
    pendingAttachments.push(attachment);
    renderPreview();
    Utils.bus.emit("upload:changed", pendingAttachments);
  }

  function removeAttachment(id) {
    pendingAttachments = pendingAttachments.filter(a => a.id !== id);
    renderPreview();
    Utils.bus.emit("upload:changed", pendingAttachments);
  }

  function getPendingAttachments() {
    return pendingAttachments.slice();
  }

  function clearPendingAttachments() {
    pendingAttachments = [];
    renderPreview();
    Utils.bus.emit("upload:changed", pendingAttachments);
  }

  /* ---------------------------------------------------------
     renderPreview — draws .attach-chip elements matching
     the markup/classes already defined in style.css
  --------------------------------------------------------- */
  function renderPreview() {
    if (!attachPreviewBox) return;
    attachPreviewBox.innerHTML = "";

    pendingAttachments.forEach((a) => {
      const chip = document.createElement("div");
      chip.className = "attach-chip";
      chip.innerHTML = a.isImage ? `<img src="${a.data}">` : (a.isPdf ? "📄" : "📎");

      const x = document.createElement("div");
      x.className = "x";
      x.innerText = "×";
      x.addEventListener("click", () => removeAttachment(a.id));

      chip.appendChild(x);
      attachPreviewBox.appendChild(chip);
    });

    Utils.bus.emit("upload:preview-rendered", pendingAttachments.length);
  }

  /* ---------------------------------------------------------
     runOcrOnImage — background OCR pass for an image
     attachment. Non-blocking: the image is already attached
     and visible before this resolves. Silent on failure.
  --------------------------------------------------------- */
  async function runOcrOnImage(attachmentId, imageData) {
    Utils.bus.emit("upload:ocr-progress", { id: attachmentId, percent: 0 });

    const result = await window.OCR.extractText(imageData, (percent) => {
      Utils.bus.emit("upload:ocr-progress", { id: attachmentId, percent });
    });

    const attachment = pendingAttachments.find(a => a.id === attachmentId);
    if (!attachment) return; // user may have removed it before OCR finished

    if (result.success) {
      attachment.extractedText = result.text;
    } else {
      attachment.extractedText = "";
      attachment.ocrError = result.error;
    }

    Utils.bus.emit("upload:ocr-done", { id: attachmentId, success: result.success });
  }

  /* ---------------------------------------------------------
     handleFile — processes a single File object regardless
     of source (gallery, camera, drag-drop, generic file input)
  --------------------------------------------------------- */
  async function handleFile(file) {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      Utils.bus.emit("upload:processing", { name: file.name, stage: "pdf" });
      const data = await Utils.fileToBase64(file);
      const result = await window.PDFReader.extractText(file);
      addAttachment({
        id: Utils.uid("att"),
        name: file.name,
        type: file.type,
        isImage: false,
        isPdf: true,
        data,
        extractedText: result.success ? result.text : "",
        extractError: result.success ? null : result.error
      });
      return;
    }

    const data = await Utils.fileToBase64(file);
    const attachmentId = Utils.uid("att");

    addAttachment({
      id: attachmentId,
      name: file.name,
      type: file.type,
      isImage,
      isPdf: false,
      data,
      extractedText: "" // filled in by OCR below, if it's an image
    });

    // Run OCR in the background for images only — doesn't block
    // the UI or the attachment preview from appearing instantly.
    if (isImage && window.OCR) {
      runOcrOnImage(attachmentId, data);
    }
  }

  /* ---------------------------------------------------------
     Plus-menu wiring
  --------------------------------------------------------- */
  function togglePlusMenu(force) {
    const show = force !== undefined ? force : !plusMenu.classList.contains("show");
    plusMenu.classList.toggle("show", show);
  }

  function setupPlusMenu() {
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlusMenu();
    });

    document.querySelectorAll(".plus-item").forEach(item => {
      item.addEventListener("click", () => {
        const action = item.getAttribute("data-action");
        togglePlusMenu(false);
        if (action === "image") fileInputs.image.click();
        else if (action === "camera") fileInputs.camera.click();
        else if (action === "file") fileInputs.any.click();
        else if (action === "pdf") fileInputs.pdf.click();
      });
    });

    // close plus-menu when clicking anywhere else
    window.addEventListener("click", (e) => {
      if (plusMenu.classList.contains("show") && !plusMenu.contains(e.target) && e.target !== plusBtn) {
        togglePlusMenu(false);
      }
    });
  }

  /* ---------------------------------------------------------
     Hidden file input wiring
  --------------------------------------------------------- */
  function setupFileInputs() {
    fileInputs = {
      image: document.getElementById("file-image"),
      camera: document.getElementById("file-camera"),
      any: document.getElementById("file-any"),
      pdf: document.getElementById("file-pdf")
    };

    Object.values(fileInputs).forEach(input => {
      if (!input) return;
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        e.target.value = ""; // allow re-selecting the same file later
        await handleFile(file);
      });
    });
  }

  /* ---------------------------------------------------------
     Drag & drop wiring over the whole app
  --------------------------------------------------------- */
  function setupDragDrop() {
    let dragCounter = 0;

    appEl.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dragCounter++;
      dropzoneOverlay.classList.add("show");
    });

    appEl.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    appEl.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropzoneOverlay.classList.remove("show");
      }
    });

    appEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropzoneOverlay.classList.remove("show");

      const files = Array.from(e.dataTransfer.files || []);
      for (const file of files) {
        await handleFile(file);
      }
    });
  }

  /* ---------------------------------------------------------
     init
  --------------------------------------------------------- */
  function init() {
    plusBtn = document.getElementById("plus-btn");
    plusMenu = document.getElementById("plus-menu");
    attachPreviewBox = document.getElementById("attach-preview");
    dropzoneOverlay = document.getElementById("dropzone-overlay");
    appEl = document.getElementById("app");

    setupPlusMenu();
    setupFileInputs();
    setupDragDrop();
  }

  return {
    init,
    handleFile,
    getPendingAttachments,
    clearPendingAttachments,
    removeAttachment
  };

})();