// ---------- State ----------
const STORAGE_KEY = "wheel-of-names-list-v1";
const COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#B983FF", "#FF922B", "#20C997", "#F06595",
  "#845EC2", "#00C9A7", "#F9A826", "#4B4453"
];

let names = loadNames();
let currentRotation = 0;
let isSpinning = false;

// ---------- Elements ----------
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const namesList = document.getElementById("namesList");
const emptyMsg = document.getElementById("emptyMsg");
const countLabel = document.getElementById("countLabel");
const clearAllBtn = document.getElementById("clearAllBtn");
const spinBtn = document.getElementById("spinBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const winnerNameEl = document.getElementById("winnerName");
const keepBtn = document.getElementById("keepBtn");
const removeBtn = document.getElementById("removeBtn");
const installBtn = document.getElementById("installBtn");

let winningIndex = -1;

// ---------- Persistence ----------
function loadNames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return ["ก้อง", "แนน", "โบว์", "อาร์ต", "มิว", "ฟิล์ม"];
}

function saveNames() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

// ---------- Rendering ----------
function resizeCanvasForDPR() {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawWheel() {
  resizeCanvasForDPR();
  const size = canvas.clientWidth;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  ctx.clearRect(0, 0, size, size);

  if (names.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#2b2b3d";
    ctx.fill();
    ctx.fillStyle = "#888";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("เพิ่มชื่อเพื่อเริ่ม", cx, cy);
    return;
  }

  const segAngle = (Math.PI * 2) / names.length;
  const startOffset = -Math.PI / 2; // top of circle

  names.forEach((name, i) => {
    const start = startOffset + i * segAngle;
    const end = start + segAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Full name text: never truncate. Shrink it to fit the slice instead.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + segAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#151526";

    const label = String(name);
    const textRight = radius - 12;
    const hubRadius = radius * 0.24;
    const availableWidth = Math.max(42, textRight - hubRadius - 8);
    const arcHeight = Math.max(7, (radius * 0.70) * segAngle * 0.78);
    let fontSize = Math.min(17, Math.max(7, arcHeight));

    // Fit the complete name into the available radial width.
    while (fontSize > 6) {
      ctx.font = `800 ${fontSize}px "Noto Sans Thai", "Segoe UI", sans-serif`;
      if (ctx.measureText(label).width <= availableWidth) break;
      fontSize -= 0.5;
    }

    ctx.font = `800 ${fontSize}px "Noto Sans Thai", "Segoe UI", sans-serif`;
    ctx.lineWidth = Math.max(1.5, fontSize * 0.16);
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.strokeText(label, textRight, 0);
    ctx.fillText(label, textRight, 0);
    ctx.restore();
  });
}

function renderNamesList() {
  namesList.innerHTML = "";
  if (names.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
    names.forEach((name, i) => {
      const li = document.createElement("li");

      const nameSpan = document.createElement("span");
      nameSpan.className = "name-text";

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = COLORS[i % COLORS.length];

      nameSpan.appendChild(swatch);
      nameSpan.appendChild(document.createTextNode(name));

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.setAttribute("aria-label", "ลบชื่อ " + name);
      delBtn.addEventListener("click", () => {
        names.splice(i, 1);
        saveNames();
        renderAll();
      });

      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      namesList.appendChild(li);
    });
  }
  countLabel.textContent = `ทั้งหมด ${names.length} ชื่อ`;
  spinBtn.disabled = names.length < 2;
}

function renderAll() {
  renderNamesList();
  drawWheel();
}

// ---------- Adding names ----------
function addNamesFromInput() {
  const raw = nameInput.value;
  if (!raw.trim()) return;
  // support comma or newline separated bulk add
  const parts = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  names.push(...parts);
  nameInput.value = "";
  saveNames();
  renderAll();
}

addBtn.addEventListener("click", addNamesFromInput);
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addNamesFromInput();
  }
});

clearAllBtn.addEventListener("click", () => {
  if (names.length === 0) return;
  if (confirm("ลบชื่อทั้งหมดใช่หรือไม่?")) {
    names = [];
    saveNames();
    renderAll();
  }
});

// ---------- Spinning ----------
function spinWheel() {
  if (isSpinning || names.length < 2) return;
  isSpinning = true;
  spinBtn.disabled = true;

  const segAngleDeg = 360 / names.length;
  const extraSpins = 6 + Math.floor(Math.random() * 4); // 6-9 full turns
  const randomOffset = Math.random() * 360;
  const newRotation = currentRotation + extraSpins * 360 + randomOffset;

  currentRotation = newRotation;
  canvas.style.transform = `rotate(${currentRotation}deg)`;

  const onTransitionEnd = () => {
    canvas.removeEventListener("transitionend", onTransitionEnd);
    const normalized = ((currentRotation % 360) + 360) % 360;
    const effectiveAngle = (360 - normalized) % 360;
    winningIndex = Math.floor(effectiveAngle / segAngleDeg) % names.length;
    showWinner(names[winningIndex]);
    isSpinning = false;
    spinBtn.disabled = names.length < 2;
  };
  canvas.addEventListener("transitionend", onTransitionEnd);
}

spinBtn.addEventListener("click", spinWheel);

// ---------- Winner modal ----------
function showWinner(name) {
  winnerNameEl.textContent = name;
  modalBackdrop.classList.add("show");
}

function hideWinner() {
  modalBackdrop.classList.remove("show");
}

keepBtn.addEventListener("click", () => {
  hideWinner();
});

removeBtn.addEventListener("click", () => {
  if (winningIndex >= 0 && winningIndex < names.length) {
    names.splice(winningIndex, 1);
    saveNames();
    renderAll();
  }
  hideWinner();
});

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) hideWinner();
});

// ---------- Resize ----------
window.addEventListener("resize", () => {
  drawWheel();
});

// ---------- PWA install prompt ----------
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-block";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
});

window.addEventListener("appinstalled", () => {
  installBtn.style.display = "none";
});

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// ---------- Init ----------
renderAll();
