/* ═══════════════════════════════════════════════
   QR × Brand — Application Logic
   ═══════════════════════════════════════════════ */

// ─── Constants ────────────────────────────────

const PALETTE = {
  flame: "#FF4008", gothic: "#65888C", porsche: "#E3B068", contessa: "#C26A6A",
  thunder: "#4E4B49", black: "#212123"
};

const ECC = {
  L: { max: 7, desc: "7% · smallest code" },
  M: { max: 15, desc: "15% · medium" },
  Q: { max: 25, desc: "25% · quartile" },
  H: { max: 30, desc: "30% · safest" }
};

const DOT_SHAPES = [
  { id: "square",   label: "Square",   icon: "■" },
  { id: "rounded",  label: "Rounded",  icon: "▢" },
  { id: "circle",   label: "Circle",   icon: "●" },
  { id: "dot",      label: "Dot",      icon: "·" },
  { id: "diamond",  label: "Diamond",  icon: "◆" },
  { id: "triangle", label: "Triangle", icon: "▲" },
  { id: "hex",      label: "Hex",      icon: "⬡" },
  { id: "star",     label: "Star",     icon: "★" },
  { id: "cross",    label: "Cross",    icon: "✚" },
  { id: "leaf",     label: "Leaf",     icon: "♧" },
  { id: "bar-v",    label: "Bar V",    icon: "▏" },
  { id: "bar-h",    label: "Bar H",    icon: "▬" },
];

const FINDER_SHAPES = [
  { id: "square",  label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "circle",  label: "Circle" },
  { id: "diamond", label: "Diamond" },
];

const TABS = ["icons", "logo", "shapes", "colors"];
const MAX_REPLACE = 100;

// ─── State ────────────────────────────────────

const state = {
  eccLevel: "H",
  icons: [null, null, null],
  iconPreviews: [null, null, null],
  centerLogo: null,
  centerLogoPreview: null,
  showCenterLogo: true,
  replacePercent: 15,
  dotStyle: "square",
  finderStyle: "rounded",
  fgColor: "#212123",
  bgColor: "#ffffff",
  iconSize: 1.1,
  logoSize: 0.20,
  logoPad: 2,
  qrMatrix: null,
  activeTab: "icons",
  exportFormat: "png",
  scanResult: null,
  shuffleSeed: Math.floor(Math.random() * 2147483647)
};

// ─── DOM Helpers ──────────────────────────────

function $(id) { return document.getElementById(id); }

function setHTML(id, html) {
  // All HTML set here is built from internal constants and validated state.
  // No untrusted user input flows into these templates.
  $(id).innerHTML = html; // eslint-disable-line no-unsanitized/property
}

// ─── UI Initialization ───────────────────────

function initUI() {
  // ECC grid
  setHTML("eccGrid", Object.entries(ECC).map(([k, v]) =>
    `<button class="opt-btn ${state.eccLevel === k ? 'active' : ''}" onclick="setEcc('${k}')">
      <strong>${k}</strong><span class="sub">${v.desc}</span>
    </button>`
  ).join(""));

  // Tabs
  setHTML("tabBar", TABS.map(t =>
    `<button class="tab-btn ${state.activeTab === t ? 'active' : ''}" onclick="switchTab('${t}')">
      ${{ icons: "Icons", logo: "Logo", shapes: "Shapes", colors: "Colors" }[t]}
    </button>`
  ).join(""));

  // Icon upload slots
  setHTML("iconSlots", [0, 1, 2].map(i => {
    const prev = state.iconPreviews[i];
    return `<label class="upload-slot ${prev ? 'filled' : ''}">
      <input type="file" accept="image/*" style="display:none" onchange="onIconUpload(${i},event)">
      ${prev
        ? `<img src="${prev}"><button class="rm-btn" onclick="event.preventDefault();event.stopPropagation();removeIcon(${i})">×</button>`
        : `<span class="plus">+</span>`}
      <span class="label">${prev ? `Icon ${i + 1}` : 'Upload'}</span>
    </label>`;
  }).join(""));
  $("iconCount").textContent = state.icons.filter(Boolean).length;

  // Logo slot
  const logoSlot = $("logoSlot");
  if (state.centerLogoPreview) {
    logoSlot.innerHTML = `<input type="file" accept="image/*" style="display:none" onchange="onLogoUpload(event)">
      <img src="${state.centerLogoPreview}" style="width:46px;height:46px;object-fit:contain">
      <button class="rm-btn" onclick="event.preventDefault();event.stopPropagation();removeLogo()">×</button>`; // eslint-disable-line no-unsanitized/property
    logoSlot.classList.add("filled");
  } else {
    logoSlot.innerHTML = `<input type="file" accept="image/*" style="display:none" onchange="onLogoUpload(event)">
      <span class="plus">+</span><span class="label">PNG / JPG / SVG</span>`; // eslint-disable-line no-unsanitized/property
    logoSlot.classList.remove("filled");
  }

  // Dot shapes
  setHTML("dotShapeGrid", DOT_SHAPES.map(s =>
    `<button class="opt-btn ${state.dotStyle === s.id ? 'active' : ''}" onclick="setDotStyle('${s.id}')">
      <span class="icon">${s.icon}</span>${s.label}
    </button>`
  ).join(""));

  // Finder shapes
  setHTML("finderShapeGrid", FINDER_SHAPES.map(s =>
    `<button class="opt-btn ${state.finderStyle === s.id ? 'active' : ''}" onclick="setFinderStyle('${s.id}')">
      ${s.label}
    </button>`
  ).join(""));

  // Palette
  setHTML("paletteGrid", Object.entries(PALETTE).map(([name, hex]) =>
    `<div class="palette-item">
      <button class="palette-btn" style="background:${hex};border:1.5px solid ${hex === '#FFFBFA' || hex === '#FAEDE1' ? '#ddd3c8' : hex}" onclick="setFg('${hex}')"></button>
      <span>${name}</span>
    </div>`
  ).join(""));

  // Export row
  setHTML("exportRow", ["png", "svg", "pdf"].map(f =>
    `<button class="export-opt ${state.exportFormat === f ? 'active' : ''}" onclick="setExportFormat('${f}')">${f.toUpperCase()}</button>`
  ).join(""));

  updateDangerBar();
  updateStatus();
  updateLogoToggle();

  const hasContent = state.icons.some(Boolean) || state.centerLogo;
  $("emptyHint").style.display = hasContent ? "none" : "block";
}

// ─── Tab Management ──────────────────────────

function switchTab(tab) {
  state.activeTab = tab;
  TABS.forEach(t => {
    $("tab-" + t).classList.toggle("hidden", t !== tab);
  });
  document.querySelectorAll(".tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", TABS[i] === tab);
  });
}

// ─── ECC ─────────────────────────────────────

function setEcc(level) {
  state.eccLevel = level;
  initUI();
  generateQR();
}

// ─── File Loading ────────────────────────────

function loadImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ img, dataUrl });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function onIconUpload(index, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const result = await loadImageFile(file);
  if (!result) return;
  state.icons[index] = result.img;
  state.iconPreviews[index] = result.dataUrl;
  initUI();
  renderCanvas();
}

function removeIcon(i) {
  state.icons[i] = null;
  state.iconPreviews[i] = null;
  initUI();
  renderCanvas();
}

async function onLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const result = await loadImageFile(file);
  if (!result) return;
  state.centerLogo = result.img;
  state.centerLogoPreview = result.dataUrl;
  initUI();
  renderCanvas();
}

function removeLogo() {
  state.centerLogo = null;
  state.centerLogoPreview = null;
  initUI();
  renderCanvas();
}

// ─── Control Handlers ────────────────────────

function onReplaceChange() {
  state.replacePercent = +$("replaceSlider").value;
  $("replaceLabel").textContent = state.replacePercent;
  updateDangerBar();
  updateStatus();
  renderCanvas();
}

function onScaleChange() {
  state.iconSize = +$("scaleSlider").value;
  $("scaleLabel").textContent = state.iconSize.toFixed(1);
  renderCanvas();
}

function toggleCenterLogo() {
  state.showCenterLogo = !state.showCenterLogo;
  updateLogoToggle();
  renderCanvas();
}

function updateLogoToggle() {
  const btn = $("logoToggle");
  btn.classList.toggle("on", state.showCenterLogo);
  $("logoControls").style.display = state.showCenterLogo ? "block" : "none";
}

function onLogoSizeChange() {
  state.logoSize = +$("logoSizeSlider").value / 100;
  $("logoSizeLabel").textContent = Math.round(state.logoSize * 100);
  renderCanvas();
}

function onLogoPadChange() {
  state.logoPad = +$("logoPadSlider").value;
  $("logoPadLabel").textContent = state.logoPad;
  renderCanvas();
}

function setDotStyle(s) {
  state.dotStyle = s;
  initUI();
  renderCanvas();
}

function setFinderStyle(s) {
  state.finderStyle = s;
  initUI();
  renderCanvas();
}

// ─── Color Handlers ──────────────────────────

function setFg(hex) {
  state.fgColor = hex;
  $("fgPicker").value = hex;
  $("fgHex").value = hex;
  renderCanvas();
}

function onFgPicker() {
  const v = $("fgPicker").value;
  state.fgColor = v;
  $("fgHex").value = v;
  renderCanvas();
}

function onFgHex() {
  const v = $("fgHex").value;
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  if (valid) {
    state.fgColor = v;
    $("fgPicker").value = v;
    renderCanvas();
  }
  $("fgHex").classList.toggle("invalid", !valid);
}

function onBgPicker() {
  const v = $("bgPicker").value;
  state.bgColor = v;
  $("bgHex").value = v;
  renderCanvas();
}

function onBgHex() {
  const v = $("bgHex").value;
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  if (valid) {
    state.bgColor = v;
    $("bgPicker").value = v;
    renderCanvas();
  }
  $("bgHex").classList.toggle("invalid", !valid);
}

function setExportFormat(f) {
  state.exportFormat = f;
  $("exportLabel").textContent = f.toUpperCase();
  document.querySelectorAll(".export-opt").forEach((b, i) =>
    b.classList.toggle("active", ["png", "svg", "pdf"][i] === f)
  );
}

// ─── Danger Bar & Status ─────────────────────

function updateDangerBar() {
  const eccMax = ECC[state.eccLevel].max;
  const pct = state.replacePercent;

  $("safeBar").style.width = (eccMax / MAX_REPLACE * 100) + "%";

  const riskBar = $("riskBar");
  if (pct > eccMax) {
    riskBar.style.display = "block";
    riskBar.style.left = (eccMax / MAX_REPLACE * 100) + "%";
    riskBar.style.width = ((pct - eccMax) / MAX_REPLACE * 100) + "%";
    riskBar.style.background = pct > eccMax * 1.5 ? "var(--contessa)" : "var(--porsche)";
  } else {
    riskBar.style.display = "none";
  }

  $("eccLimitLabel").textContent = `ECC-${state.eccLevel}: ${eccMax}%`;

  const pill = $("dangerPill");
  if (pct > eccMax) {
    pill.style.display = "inline-flex";
    if (pct > eccMax * 1.5) {
      pill.className = "pill pill-danger";
      pill.textContent = "\u2620 Extreme";
    } else {
      pill.className = "pill pill-warn";
      pill.textContent = "\u26A0 Beyond ECC";
    }
  } else {
    pill.style.display = "none";
  }
}

function updateStatus() {
  const eccMax = ECC[state.eccLevel].max;
  const pct = state.replacePercent;
  const isDangerous = pct > eccMax;
  const isExtreme = pct > eccMax * 1.5;

  let html = `<span class="pill pill-neutral">ECC-${state.eccLevel}</span>`;
  if (isDangerous) {
    html += `<span class="pill ${isExtreme ? 'pill-danger' : 'pill-warn'}">${pct}% replaced${isExtreme ? ' \u00b7 \u2620' : ' \u00b7 \u26A0'}</span>`;
  } else {
    html += `<span class="pill pill-ok">${pct}% replaced \u00b7 \u2713</span>`;
  }
  if (state.showCenterLogo && state.centerLogo) {
    html += `<span class="pill pill-neutral">logo +${state.logoPad} pad</span>`;
  }
  $("statusRow").innerHTML = html; // eslint-disable-line no-unsanitized/property
}

// ─── QR Generation ───────────────────────────

function generateQR() {
  if (!window.qrcode) {
    console.warn("QR library not loaded");
    return;
  }
  state.scanResult = null;
  $("scanResult").textContent = "";

  try {
    const url = $("urlInput").value;
    const qr = qrcode(0, state.eccLevel);
    qr.addData(url);
    qr.make();
    const mc = qr.getModuleCount();
    const matrix = [];
    for (let r = 0; r < mc; r++) {
      const row = [];
      for (let c = 0; c < mc; c++) row.push(qr.isDark(r, c));
      matrix.push(row);
    }
    state.qrMatrix = matrix;
    renderCanvas();
    updateStatus();
  } catch (err) {
    console.error("QR error:", err);
  }
}

// ─── Geometry Helpers ────────────────────────

function isFinderModule(r, c, sz) {
  return (r < 7 && c < 7) || (r < 7 && c >= sz - 7) || (r >= sz - 7 && c < 7);
}

function isFinderPadded(r, c, sz) {
  return (r < 9 && c < 9) || (r < 9 && c >= sz - 8) || (r >= sz - 8 && c < 9);
}

function calcCenterZone(sz) {
  const span = Math.max(3, Math.floor(sz * state.logoSize));
  const mid = Math.floor(sz / 2);
  return {
    rMin: mid - Math.floor(span / 2) - state.logoPad,
    rMax: mid + Math.ceil(span / 2) - 1 + state.logoPad,
    cMin: mid - Math.floor(span / 2) - state.logoPad,
    cMax: mid + Math.ceil(span / 2) - 1 + state.logoPad,
    irMin: mid - Math.floor(span / 2),
    irMax: mid + Math.ceil(span / 2) - 1,
    icMin: mid - Math.floor(span / 2),
    icMax: mid + Math.ceil(span / 2) - 1,
  };
}

function inCenter(r, c, sz) {
  if (!state.showCenterLogo || !state.centerLogo) return false;
  const z = calcCenterZone(sz);
  return r >= z.rMin && r <= z.rMax && c >= z.cMin && c <= z.cMax;
}

function seededShuffle(arr) {
  const a = [...arr];
  let s = state.shuffleSeed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Canvas Drawing ──────────────────────────

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDot(ctx, x, y, cs, style, color) {
  ctx.fillStyle = color;

  switch (style) {
    case "square":
      ctx.fillRect(x, y, cs, cs);
      break;

    case "rounded": {
      const r = Math.min(2.5, cs / 3);
      roundRectPath(ctx, x, y, cs, cs, r);
      ctx.fill();
      break;
    }

    case "circle": {
      const g = 0.5, s = cs - g * 2;
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "dot": {
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, cs * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "diamond": {
      const g = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + cs / 2, y + g);
      ctx.lineTo(x + cs - g, y + cs / 2);
      ctx.lineTo(x + cs / 2, y + cs - g);
      ctx.lineTo(x + g, y + cs / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "triangle": {
      const g = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + cs / 2, y + g);
      ctx.lineTo(x + cs - g, y + cs - g);
      ctx.lineTo(x + g, y + cs - g);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "hex": {
      const cx = x + cs / 2, cy = y + cs / 2, hr = (cs - 1) / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        if (i === 0) ctx.moveTo(cx + hr * Math.cos(a), cy + hr * Math.sin(a));
        else ctx.lineTo(cx + hr * Math.cos(a), cy + hr * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "star": {
      const cx = x + cs / 2, cy = y + cs / 2;
      const oR = (cs - 1) / 2, iR = oR * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const aO = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const aI = aO + Math.PI / 5;
        if (i === 0) ctx.moveTo(cx + oR * Math.cos(aO), cy + oR * Math.sin(aO));
        else ctx.lineTo(cx + oR * Math.cos(aO), cy + oR * Math.sin(aO));
        ctx.lineTo(cx + iR * Math.cos(aI), cy + iR * Math.sin(aI));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "cross": {
      const g = 0.5, s = cs - g * 2, t = s * 0.3;
      ctx.fillRect(x + g + (s - t) / 2, y + g, t, s);
      ctx.fillRect(x + g, y + g + (s - t) / 2, s, t);
      break;
    }

    case "leaf": {
      const cx = x + cs / 2, cy = y + cs / 2, r = (cs - 1) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.quadraticCurveTo(cx + r * 1.2, cy - r * 0.2, cx + r * 0.3, cy + r * 0.8);
      ctx.quadraticCurveTo(cx, cy + r * 1.1, cx - r * 0.3, cy + r * 0.8);
      ctx.quadraticCurveTo(cx - r * 1.2, cy - r * 0.2, cx, cy - r);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "bar-v": {
      const gx = cs * 0.2;
      ctx.fillRect(x + gx, y, cs - gx * 2, cs);
      break;
    }

    case "bar-h": {
      const gy = cs * 0.2;
      ctx.fillRect(x, y + gy, cs, cs - gy * 2);
      break;
    }

    default:
      ctx.fillRect(x, y, cs, cs);
  }
}

function drawFinder(ctx, x, y, cs, style, fg, bg) {
  const sz7 = cs * 7, sz5 = cs * 5, sz3 = cs * 3;

  if (style === "circle") {
    const cx = x + sz7 / 2, cy = y + sz7 / 2;
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, sz7 / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, sz5 / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, sz3 / 2, 0, Math.PI * 2); ctx.fill();
  } else if (style === "diamond") {
    const cx = x + sz7 / 2, cy = y + sz7 / 2;
    const dd = (sz, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx, cy - sz / 2);
      ctx.lineTo(cx + sz / 2, cy);
      ctx.lineTo(cx, cy + sz / 2);
      ctx.lineTo(cx - sz / 2, cy);
      ctx.closePath();
      ctx.fill();
    };
    dd(sz7, fg);
    dd(sz5, bg);
    dd(sz3, fg);
  } else {
    const rr = style === "rounded" ? cs : 0;
    ctx.fillStyle = fg; roundRectPath(ctx, x, y, sz7, sz7, rr); ctx.fill();
    ctx.fillStyle = bg; roundRectPath(ctx, x + cs, y + cs, sz5, sz5, rr * 0.7); ctx.fill();
    ctx.fillStyle = fg; roundRectPath(ctx, x + cs * 2, y + cs * 2, sz3, sz3, rr * 0.5); ctx.fill();
  }
}

function renderCanvas() {
  if (!state.qrMatrix) return;
  const canvas = $("qrCanvas");
  const size = state.qrMatrix.length;
  const cs = 14, pad = cs * 2, total = size * cs + pad * 2;
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, total, total);

  const hasCenterLogo = state.showCenterLogo && state.centerLogo;
  const activeIdx = [];
  state.icons.forEach((ic, i) => { if (ic) activeIdx.push(i); });

  // Collect replaceable dark modules
  const darkMods = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (state.qrMatrix[r][c] && !isFinderPadded(r, c, size) && !inCenter(r, c, size))
        darkMods.push([r, c]);

  const shuffled = seededShuffle(darkMods);
  const replaceCount = Math.floor(shuffled.length * (state.replacePercent / 100));
  const replaceMap = new Map();
  if (activeIdx.length > 0)
    for (let i = 0; i < replaceCount; i++) {
      const [r, c] = shuffled[i];
      replaceMap.set(r * 1000 + c, activeIdx[i % activeIdx.length]);
    }

  // Finders
  [[pad, pad], [pad + (size - 7) * cs, pad], [pad, pad + (size - 7) * cs]].forEach(([fx, fy]) =>
    drawFinder(ctx, fx, fy, cs, state.finderStyle, state.fgColor, state.bgColor)
  );

  // Data dots
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (isFinderModule(r, c, size) || inCenter(r, c, size) || !state.qrMatrix[r][c]) continue;
      const x = pad + c * cs, y = pad + r * cs, key = r * 1000 + c;
      if (replaceMap.has(key)) {
        const icon = state.icons[replaceMap.get(key)];
        if (icon) {
          const s = cs * state.iconSize, off = (cs - s) / 2;
          try { ctx.drawImage(icon, x + off, y + off, s, s); continue; } catch (e) { /* skip */ }
        }
      }
      drawDot(ctx, x, y, cs, state.dotStyle, state.fgColor);
    }

  // Center logo
  if (hasCenterLogo) {
    const z = calcCenterZone(size);
    const zx = pad + z.cMin * cs, zy = pad + z.rMin * cs;
    const zw = (z.cMax - z.cMin + 1) * cs, zh = (z.rMax - z.rMin + 1) * cs;
    ctx.fillStyle = state.bgColor;
    roundRectPath(ctx, zx, zy, zw, zh, 10);
    ctx.fill();
    const ix = pad + z.icMin * cs, iy = pad + z.irMin * cs;
    const iw = (z.icMax - z.icMin + 1) * cs, ih = (z.irMax - z.irMin + 1) * cs;
    try { ctx.drawImage(state.centerLogo, ix, iy, iw, ih); } catch (e) { /* skip */ }
  }

  // Update SVG preview
  $("qrPreview").innerHTML = buildSVG(); // eslint-disable-line no-unsanitized/property
}

// ─── Scan Testing ────────────────────────────

function testScan() {
  const resultEl = $("scanResult");
  if (!window.jsQR) {
    resultEl.innerHTML = '<div class="scan-badge scan-fail">jsQR library not loaded</div>'; // eslint-disable-line no-unsanitized/property -- static string
    return;
  }
  resultEl.innerHTML = '<div class="scan-badge scan-wait">Scanning\u2026</div>'; // eslint-disable-line no-unsanitized/property -- static string
  setTimeout(() => {
    try {
      const canvas = $("qrCanvas");

      // Scale up and binarize to help jsQR handle styled/colored QR codes
      const scale = 3;
      const w = canvas.width, h = canvas.height;
      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = w * scale;
      tmpCanvas.height = h * scale;
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.imageSmoothingEnabled = false;
      tmpCtx.drawImage(canvas, 0, 0, w * scale, h * scale);

      const img = tmpCtx.getImageData(0, 0, w * scale, h * scale);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        const v = lum < 128 ? 0 : 255;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }

      const code = jsQR(d, w * scale, h * scale, { inversionAttempts: "attemptBoth" });
      resultEl.innerHTML = code // eslint-disable-line no-unsanitized/property -- static string
        ? '<div class="scan-badge scan-ok">\u2713 Scan OK \u2014 QR is readable</div>'
        : '<div class="scan-badge scan-fail">\u2717 Failed \u2014 reduce replacement % or increase ECC</div>';
    } catch (e) {
      resultEl.innerHTML = '<div class="scan-badge scan-fail">\u2717 Scan error</div>'; // eslint-disable-line no-unsanitized/property -- static string
    }
  }, 200);
}

// ─── SVG Builder ─────────────────────────────

function dotToSVG(x, y, cs, style, color) {
  switch (style) {
    case "square":
      return `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${color}"/>`;

    case "rounded": {
      const r = Math.min(2.5, cs / 3);
      return `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="${r}" fill="${color}"/>`;
    }

    case "circle": {
      const g = 0.5, s = cs - g * 2;
      return `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${s / 2}" fill="${color}"/>`;
    }

    case "dot":
      return `<circle cx="${x + cs / 2}" cy="${y + cs / 2}" r="${cs * 0.28}" fill="${color}"/>`;

    case "diamond": {
      const g = 0.5;
      return `<polygon points="${x + cs / 2},${y + g} ${x + cs - g},${y + cs / 2} ${x + cs / 2},${y + cs - g} ${x + g},${y + cs / 2}" fill="${color}"/>`;
    }

    case "triangle": {
      const g = 0.5;
      return `<polygon points="${x + cs / 2},${y + g} ${x + cs - g},${y + cs - g} ${x + g},${y + cs - g}" fill="${color}"/>`;
    }

    case "hex": {
      const cx = x + cs / 2, cy = y + cs / 2, hr = (cs - 1) / 2;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${cx + hr * Math.cos(a)},${cy + hr * Math.sin(a)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
    }

    case "star": {
      const cx = x + cs / 2, cy = y + cs / 2;
      const oR = (cs - 1) / 2, iR = oR * 0.45;
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const aO = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const aI = aO + Math.PI / 5;
        pts.push(`${cx + oR * Math.cos(aO)},${cy + oR * Math.sin(aO)}`);
        pts.push(`${cx + iR * Math.cos(aI)},${cy + iR * Math.sin(aI)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
    }

    case "cross": {
      const g = 0.5, s = cs - g * 2, t = s * 0.3;
      return `<rect x="${x + g + (s - t) / 2}" y="${y + g}" width="${t}" height="${s}" fill="${color}"/>` +
             `<rect x="${x + g}" y="${y + g + (s - t) / 2}" width="${s}" height="${t}" fill="${color}"/>`;
    }

    case "leaf": {
      const cx = x + cs / 2, cy = y + cs / 2, r = (cs - 1) / 2;
      return `<path d="M${cx},${cy - r} Q${cx + r * 1.2},${cy - r * 0.2} ${cx + r * 0.3},${cy + r * 0.8} Q${cx},${cy + r * 1.1} ${cx - r * 0.3},${cy + r * 0.8} Q${cx - r * 1.2},${cy - r * 0.2} ${cx},${cy - r}Z" fill="${color}"/>`;
    }

    case "bar-v": {
      const gx = cs * 0.2;
      return `<rect x="${x + gx}" y="${y}" width="${cs - gx * 2}" height="${cs}" fill="${color}"/>`;
    }

    case "bar-h": {
      const gy = cs * 0.2;
      return `<rect x="${x}" y="${y + gy}" width="${cs}" height="${cs - gy * 2}" fill="${color}"/>`;
    }

    default:
      return `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${color}"/>`;
  }
}

function finderToSVG(fx, fy, cs, style, fg, bg) {
  const sz7 = cs * 7, sz5 = cs * 5, sz3 = cs * 3;
  const parts = [];

  if (style === "circle") {
    const cx = fx + sz7 / 2, cy = fy + sz7 / 2;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${sz7 / 2}" fill="${fg}"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${sz5 / 2}" fill="${bg}"/>`);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${sz3 / 2}" fill="${fg}"/>`);
  } else if (style === "diamond") {
    const cx = fx + sz7 / 2, cy = fy + sz7 / 2;
    const dd = (sz, col) => `<polygon points="${cx},${cy - sz / 2} ${cx + sz / 2},${cy} ${cx},${cy + sz / 2} ${cx - sz / 2},${cy}" fill="${col}"/>`;
    parts.push(dd(sz7, fg));
    parts.push(dd(sz5, bg));
    parts.push(dd(sz3, fg));
  } else {
    const rr = style === "rounded" ? cs : 0;
    parts.push(`<rect x="${fx}" y="${fy}" width="${sz7}" height="${sz7}" rx="${rr}" fill="${fg}"/>`);
    parts.push(`<rect x="${fx + cs}" y="${fy + cs}" width="${sz5}" height="${sz5}" rx="${rr * 0.7}" fill="${bg}"/>`);
    parts.push(`<rect x="${fx + cs * 2}" y="${fy + cs * 2}" width="${sz3}" height="${sz3}" rx="${rr * 0.5}" fill="${fg}"/>`);
  }

  return parts.join("\n");
}

function buildSVG() {
  if (!state.qrMatrix) return "";
  const size = state.qrMatrix.length;
  const cs = 14, pad = cs * 2, total = size * cs + pad * 2;
  const hasCenterLogo = state.showCenterLogo && state.centerLogo;

  const activeIdx = [];
  state.icons.forEach((ic, i) => { if (ic) activeIdx.push(i); });

  const darkMods = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (state.qrMatrix[r][c] && !isFinderPadded(r, c, size) && !inCenter(r, c, size))
        darkMods.push([r, c]);

  const shuffled = seededShuffle(darkMods);
  const replaceCount = Math.floor(shuffled.length * (state.replacePercent / 100));
  const rm = new Map();
  if (activeIdx.length > 0)
    for (let i = 0; i < replaceCount; i++) {
      const [r, c] = shuffled[i];
      rm.set(r * 1000 + c, activeIdx[i % activeIdx.length]);
    }

  const parts = [`<rect width="${total}" height="${total}" fill="${state.bgColor}"/>`];

  // Finders
  [[pad, pad], [pad + (size - 7) * cs, pad], [pad, pad + (size - 7) * cs]].forEach(([fx, fy]) => {
    parts.push(finderToSVG(fx, fy, cs, state.finderStyle, state.fgColor, state.bgColor));
  });

  // Data dots
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (isFinderModule(r, c, size) || inCenter(r, c, size) || !state.qrMatrix[r][c]) continue;
      const x = pad + c * cs, y = pad + r * cs, key = r * 1000 + c;
      if (rm.has(key)) {
        const prev = state.iconPreviews[rm.get(key)];
        if (prev) {
          const sz = cs * state.iconSize, off = (cs - sz) / 2;
          parts.push(`<image href="${prev}" x="${x + off}" y="${y + off}" width="${sz}" height="${sz}"/>`);
          continue;
        }
      }
      parts.push(dotToSVG(x, y, cs, state.dotStyle, state.fgColor));
    }

  // Center logo
  if (hasCenterLogo && state.centerLogoPreview) {
    const z = calcCenterZone(size);
    const zx = pad + z.cMin * cs, zy = pad + z.rMin * cs;
    const zw = (z.cMax - z.cMin + 1) * cs, zh = (z.rMax - z.rMin + 1) * cs;
    parts.push(`<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" rx="10" fill="${state.bgColor}"/>`);
    const ix = pad + z.icMin * cs, iy = pad + z.irMin * cs;
    const iw = (z.icMax - z.icMin + 1) * cs, ih = (z.irMax - z.irMin + 1) * cs;
    parts.push(`<image href="${state.centerLogoPreview}" x="${ix}" y="${iy}" width="${iw}" height="${ih}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">\n${parts.join("\n")}\n</svg>`;
}

// ─── Export ──────────────────────────────────

function doExport() {
  const canvas = $("qrCanvas");

  if (state.exportFormat === "png") {
    const link = document.createElement("a");
    link.download = "branded-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  } else if (state.exportFormat === "svg") {
    const blob = new Blob([buildSVG()], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "branded-qr.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
  } else if (state.exportFormat === "pdf") {
    if (!window.jspdf) {
      console.error("jsPDF library not loaded");
      return;
    }
    const { jsPDF } = window.jspdf;
    const w = canvas.width, h = canvas.height;
    const doc = new jsPDF({ unit: "px", format: [w, h] });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
    doc.save("branded-qr.pdf");
  }
}

// ─── Boot ────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  initUI();
  const waitForLib = setInterval(() => {
    if (window.qrcode) {
      clearInterval(waitForLib);
      generateQR();
    }
  }, 100);
});
