/* =========================================================
   AMIT AI — settings.js  (NEW FILE)
   Builds the full-screen Settings UI and wires every control
   to SettingsStore + existing modules (Memory, History,
   Internet, Plugins, Api). Opens via the existing
   "sidebar:settings-requested" bus event — no other file
   needed to change to trigger it.
   Depends on: utils.js, settings-store.js, memory.js,
               internet.js, plugins.js, history.js, api.js
   ========================================================= */

window.Settings = (function () {

  let overlayEl, headerTitleEl, backBtn, bodyEl;
  let currentSection = null;

  const SECTIONS = [
    { id: "account", icon: "account_circle", title: "Account", desc: "Profile, naam, email" },
    { id: "appearance", icon: "palette", title: "Appearance", desc: "Theme, colors, fonts" },
    { id: "ai", icon: "smart_toy", title: "AI Settings", desc: "Response style, creativity" },
    { id: "memory", icon: "memory", title: "Memory", desc: "AI ko yaad rakhi baatein" },
    { id: "internet", icon: "travel_explore", title: "Internet", desc: "Web search settings" },
    { id: "voice", icon: "record_voice_over", title: "Voice", desc: "Speech input/output" },
    { id: "files", icon: "upload_file", title: "Files", desc: "PDF, OCR, image uploads" },
    { id: "privacy", icon: "shield", title: "Privacy", desc: "Chat history & data" },
    { id: "performance", icon: "speed", title: "Performance", desc: "Battery, animations" },
    { id: "extensions", icon: "extension", title: "Extensions", desc: "Plugin manager" },
    { id: "backup", icon: "backup", title: "Backup & Restore", desc: "Export / import data" },
    { id: "developer", icon: "terminal", title: "Developer", desc: "Debug & diagnostics" },
    { id: "about", icon: "info", title: "About", desc: "Version & legal" }
  ];

  /* ---------------- generic row builders ---------------- */
  function icon(name) {
    const s = document.createElement("span");
    s.className = "material-symbols-outlined";
    s.textContent = name;
    return s;
  }

  function baseRow(iconName, title, desc) {
    const row = document.createElement("div");
    row.className = "settings-row";
    const ic = document.createElement("div");
    ic.className = "settings-row-icon";
    ic.appendChild(icon(iconName));
    const text = document.createElement("div");
    text.className = "settings-row-text";
    const t = document.createElement("div");
    t.className = "settings-row-title";
    t.textContent = title;
    text.appendChild(t);
    if (desc) {
      const d = document.createElement("div");
      d.className = "settings-row-desc";
      d.textContent = desc;
      text.appendChild(d);
    }
    row.appendChild(ic);
    row.appendChild(text);
    return { row, text };
  }

  function toggleRow(iconName, title, desc, checked, onChange) {
    const { row } = baseRow(iconName, title, desc);
    const wrap = document.createElement("label");
    wrap.className = "toggle-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checked;
    input.addEventListener("change", () => onChange(input.checked));
    const slider = document.createElement("span");
    slider.className = "toggle-slider";
    wrap.appendChild(input);
    wrap.appendChild(slider);
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(wrap);
    row.appendChild(control);
    return row;
  }

  function selectRow(iconName, title, desc, options, value, onChange) {
    const { row } = baseRow(iconName, title, desc);
    const select = document.createElement("select");
    select.className = "settings-select";
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === value) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener("change", () => onChange(select.value));
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(select);
    row.appendChild(control);
    return row;
  }

  function textRow(iconName, title, desc, value, placeholder, onChange, inputType) {
    const { row } = baseRow(iconName, title, desc);
    const input = document.createElement("input");
    input.type = inputType || "text";
    input.className = "settings-text-input";
    input.placeholder = placeholder || "";
    input.value = value || "";
    input.addEventListener("change", () => onChange(input.value));
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(input);
    row.appendChild(control);
    return row;
  }

  function sliderRow(iconName, title, desc, min, max, step, value, formatFn, onChange) {
    const { row } = baseRow(iconName, title, desc);
    const wrap = document.createElement("div");
    wrap.className = "settings-slider-wrap";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "settings-slider";
    slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    const valLabel = document.createElement("div");
    valLabel.className = "settings-slider-value";
    valLabel.textContent = formatFn(value);
    slider.addEventListener("input", () => {
      valLabel.textContent = formatFn(slider.value);
      onChange(parseFloat(slider.value));
    });
    wrap.appendChild(slider);
    wrap.appendChild(valLabel);
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(wrap);
    row.appendChild(control);
    return row;
  }

  function buttonRow(iconName, title, desc, buttonLabel, variant, onClick) {
    const { row } = baseRow(iconName, title, desc);
    const btn = document.createElement("button");
    btn.className = "settings-btn" + (variant ? " " + variant : "");
    btn.textContent = buttonLabel;
    btn.addEventListener("click", onClick);
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(btn);
    row.appendChild(control);
    return row;
  }

  function infoRow(iconName, title, desc, value) {
    const { row, text } = baseRow(iconName, title, desc);
    const val = document.createElement("div");
    val.className = "settings-info-value";
    val.textContent = value;
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(val);
    row.appendChild(control);
    return row;
  }

  function badgeRow(iconName, title, desc, badgeText, onClick) {
    const { row } = baseRow(iconName, title, desc);
    const badge = document.createElement("span");
    badge.className = "settings-badge";
    badge.textContent = badgeText;
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(badge);
    row.style.cursor = "pointer";
    row.addEventListener("click", onClick);
    row.appendChild(control);
    return row;
  }

  function expandableRow(iconName, title, desc, buildContentFn) {
    const wrap = document.createElement("div");
    const { row } = baseRow(iconName, title, desc);
    const chevron = icon("expand_more");
    chevron.className = "material-symbols-outlined settings-chevron";
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(chevron);
    row.appendChild(control);
    row.style.cursor = "pointer";

    const panel = document.createElement("div");
    panel.className = "settings-expand-panel";
    let built = false;

    row.addEventListener("click", () => {
      const willOpen = !panel.classList.contains("open");
      panel.classList.toggle("open", willOpen);
      chevron.textContent = willOpen ? "expand_less" : "expand_more";
      if (willOpen && !built) {
        buildContentFn(panel);
        built = true;
      } else if (willOpen && built && buildContentFn._refreshable) {
        panel.innerHTML = "";
        buildContentFn(panel);
      }
    });

    wrap.appendChild(row);
    wrap.appendChild(panel);
    return wrap;
  }

  function fileInputButton(labelBtn, accept, onFile) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept || "";
    input.style.display = "none";
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      input.value = "";
      if (file) onFile(file);
    });
    document.body.appendChild(input);
    return () => input.click();
  }

  function showToast(message) {
    let toast = document.getElementById("settings-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "settings-toast";
      toast.className = "settings-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function sectionCard() {
    const card = document.createElement("div");
    card.className = "settings-section-card";
    return card;
  }

  /* ================= SECTION RENDERERS ================= */

  function renderAccount(container) {
    const S = window.SettingsStore;
    const avatarWrap = document.createElement("div");
    avatarWrap.className = "settings-avatar-wrap";
    const avatar = document.createElement("div");
    avatar.className = "settings-avatar";
    const img = document.createElement("img");
    img.src = S.get("profilePhoto") || "assets/logo/logo.png";
    avatar.appendChild(img);
    const openPhoto = fileInputButton("Photo", "image/*", async (file) => {
      const data = await Utils.fileToBase64(file);
      S.set("profilePhoto", data);
      img.src = data;
      showToast("Profile photo update ho gayi");
    });
    avatar.addEventListener("click", openPhoto);
    const hint = document.createElement("div");
    hint.className = "settings-row-desc";
    hint.textContent = "Tap karke photo badlein";
    avatarWrap.appendChild(avatar);
    avatarWrap.appendChild(hint);
    container.appendChild(avatarWrap);

    const card = sectionCard();
    card.appendChild(textRow("badge", "Name", "Aapka naam", S.get("name"), "Aapka naam likhein", v => S.set("name", v)));
    card.appendChild(textRow("mail", "Email", "Aapka email address", S.get("email"), "you@example.com", v => S.set("email", v), "email"));
    card.appendChild(textRow("smart_toy", "AI Nickname", "AI aapko kya bulaye", S.get("aiNickname"), "e.g. Boss", v => S.set("aiNickname", v)));
    card.appendChild(buttonRow("download", "Export Profile", "Profile ko JSON file me save karein", "Export", null, () => {
      S.downloadJSON("amitai-profile.json", { name: S.get("name"), email: S.get("email"), aiNickname: S.get("aiNickname"), profilePhoto: S.get("profilePhoto") });
      showToast("Profile export ho gaya");
    }));
    const importProfile = fileInputButton("Import", "application/json", async (file) => {
      try {
        const data = await S.readJSONFile(file);
        if (data.name !== undefined) S.set("name", data.name);
        if (data.email !== undefined) S.set("email", data.email);
        if (data.aiNickname !== undefined) S.set("aiNickname", data.aiNickname);
        if (data.profilePhoto) { S.set("profilePhoto", data.profilePhoto); img.src = data.profilePhoto; }
        showToast("Profile import ho gaya");
        renderSection("account");
      } catch (e) { showToast(e.message); }
    });
    card.appendChild(buttonRow("upload_file", "Import Profile", "JSON file se profile load karein", "Import", null, importProfile));
    card.appendChild(badgeRow("logout", "Logout", "Account se bahar niklein", "Jald aa raha hai", () => showToast("Yeh feature jald aayega")));
    container.appendChild(card);
  }

  function renderAppearance(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(selectRow("dark_mode", "Theme", "Light, dark ya system ke hisaab se", [
      { value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }
    ], S.get("theme"), v => S.set("theme", v)));

    const { row } = baseRow("format_color_fill", "Accent Color", "App ka main color");
    const swatchWrap = document.createElement("div");
    swatchWrap.className = "settings-color-swatches";
    const colors = ["#10a37f", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#dc2626"];
    colors.forEach(c => {
      const sw = document.createElement("div");
      sw.className = "color-swatch" + (S.get("accentColor") === c ? " active" : "");
      sw.style.background = c;
      sw.addEventListener("click", () => { S.set("accentColor", c); renderSection("appearance"); });
      swatchWrap.appendChild(sw);
    });
    const customInput = document.createElement("input");
    customInput.type = "color";
    customInput.className = "color-swatch-custom";
    customInput.value = S.get("accentColor");
    customInput.addEventListener("change", () => S.set("accentColor", customInput.value));
    swatchWrap.appendChild(customInput);
    const control = document.createElement("div");
    control.className = "settings-row-control";
    control.appendChild(swatchWrap);
    row.appendChild(control);
    card.appendChild(row);

    card.appendChild(selectRow("text_fields", "Font Size", "Chat text ka size", [
      { value: "small", label: "Small" }, { value: "medium", label: "Medium" },
      { value: "large", label: "Large" }, { value: "xlarge", label: "Extra Large" }
    ], S.get("fontSize"), v => S.set("fontSize", v)));

    card.appendChild(selectRow("chat_bubble", "Chat Bubble Size", "Message bubble ka padding", [
      { value: "compact", label: "Compact" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }
    ], S.get("bubbleSize"), v => S.set("bubbleSize", v)));

    card.appendChild(toggleRow("animation", "App Animation", "Smooth transitions aur effects", S.get("appAnimation"), v => S.set("appAnimation", v)));
    container.appendChild(card);
  }

  function renderAI(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(textRow("smart_toy", "AI Name", "AI ka naam jo backend ko bheja jaata hai", S.get("aiName"), "Amit AI", v => S.set("aiName", v)));
    card.appendChild(selectRow("language", "Response Language", "AI kis bhasha me jawaab de", [
      { value: "hindi", label: "Hindi" }, { value: "english", label: "English" }, { value: "hinglish", label: "Hinglish" }
    ], S.get("responseLanguage"), v => S.set("responseLanguage", v)));
    card.appendChild(selectRow("short_text", "Response Length", "Jawaab kitna lamba ho", [
      { value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Long" }
    ], S.get("responseLength"), v => S.set("responseLength", v)));
    card.appendChild(sliderRow("auto_awesome", "Creativity", "0 = precise, 100 = creative", 0, 100, 5, S.get("creativity"), v => v + "%", v => S.set("creativity", v)));
    card.appendChild(toggleRow("description", "Markdown", "Bold, list, headings render karein", S.get("markdown"), v => S.set("markdown", v)));
    card.appendChild(toggleRow("code", "Code Highlight", "Code blocks me syntax color", S.get("codeHighlight"), v => S.set("codeHighlight", v)));
    card.appendChild(toggleRow("bolt", "Streaming", "Jawaab word-by-word aaye", S.get("streaming"), v => S.set("streaming", v)));
    card.appendChild(toggleRow("movie", "Thinking Animation", "Video animation dikhayein jab AI soch raha ho", S.get("thinkingAnimation"), v => S.set("thinkingAnimation", v)));
    container.appendChild(card);
  }

  function renderMemory(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(toggleRow("memory", "Memory ON/OFF", "AI ko yaad rakhi baatein use karein", S.get("memoryEnabled"), v => S.set("memoryEnabled", v)));
    card.appendChild(toggleRow("edit_note", "Auto Remember", "Naye facts khud yaad rakhein", S.get("autoRemember"), v => S.set("autoRemember", v)));
    card.appendChild(buttonRow("download", "Export Memory", "Saari memory JSON me save karein", "Export", null, () => {
      S.downloadJSON("amitai-memory.json", window.Memory.getAll());
      showToast("Memory export ho gayi");
    }));
    const importMemory = fileInputButton("Import", "application/json", async (file) => {
      try {
        const data = await S.readJSONFile(file);
        const arr = Array.isArray(data) ? data : [];
        arr.forEach(m => window.Memory.add(m.text || String(m)));
        showToast("Memory import ho gayi");
      } catch (e) { showToast(e.message); }
    });
    card.appendChild(buttonRow("upload_file", "Import Memory", "JSON file se memory load karein", "Import", null, importMemory));
    card.appendChild(buttonRow("delete_sweep", "Clear Memory", "Saari yaad rakhi baatein hata dein", "Clear", "danger", () => {
      if (confirm("Pakka saari memory clear karni hai?")) {
        window.Memory.clearAll();
        showToast("Memory clear ho gayi");
      }
    }));
    container.appendChild(card);
  }

  function renderInternet(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(toggleRow("travel_explore", "Internet Search", "Zaroorat par web se jaankari layein", S.get("internetEnabled"), v => S.set("internetEnabled", v)));
    card.appendChild(selectRow("search", "Search Engine", "Search ke liye source", [
      { value: "duckduckgo", label: "DuckDuckGo" }
    ], S.get("searchEngine"), v => S.set("searchEngine", v)));
    card.appendChild(toggleRow("shield", "Safe Search", "Explicit results filter karein", S.get("safeSearch"), v => S.set("safeSearch", v)));
    card.appendChild(toggleRow("wifi_off", "Offline Mode", "Internet access poori tarah band karein", S.get("offlineMode"), v => {
      S.set("offlineMode", v);
      if (v) S.set("internetEnabled", false);
      renderSection("internet");
    }));
    container.appendChild(card);
  }

  function renderVoice(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(toggleRow("mic", "Voice Input", "Bolke message likhein", S.get("voiceInput"), v => S.set("voiceInput", v)));
    card.appendChild(toggleRow("volume_up", "Voice Output", "AI ka jawaab sunein", S.get("voiceOutput"), v => S.set("voiceOutput", v)));
    card.appendChild(sliderRow("speed", "Voice Speed", "Awaaz ki raftaar", 0.5, 2, 0.1, S.get("voiceSpeed"), v => parseFloat(v).toFixed(1) + "x", v => S.set("voiceSpeed", v)));
    card.appendChild(sliderRow("tune", "Voice Pitch", "Awaaz ka pitch", 0, 2, 0.1, S.get("voicePitch"), v => parseFloat(v).toFixed(1), v => S.set("voicePitch", v)));
    card.appendChild(toggleRow("record_voice_over", "Auto Speak", "Har AI jawaab khud-ba-khud bole", S.get("autoSpeak"), v => S.set("autoSpeak", v)));
    container.appendChild(card);
  }

  function renderFiles(container) {
    const S = window.SettingsStore;
    const card = sectionCard();
    card.appendChild(toggleRow("picture_as_pdf", "PDF", "PDF upload allow karein", S.get("pdfEnabled"), v => { S.set("pdfEnabled", v); syncUploadMenuVisibility(); }));
    card.appendChild(toggleRow("document_scanner", "OCR", "Image se text nikalein", S.get("ocrEnabled"), v => S.set("ocrEnabled", v)));
    card.appendChild(toggleRow("image", "Image Analysis", "Photos ko AI analyze kare", S.get("imageAnalysis"), v => S.set("imageAnalysis", v)));
    card.appendChild(toggleRow("photo_camera", "Camera Upload", "Camera se photo lena allow karein", S.get("cameraUpload"), v => { S.set("cameraUpload", v); syncUploadMenuVisibility(); }));
    card.appendChild(toggleRow("photo_library",