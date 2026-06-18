/* =========================================================
   STAR CLASSIFIER — JavaScript
   ========================================================= */

// ── Starfield canvas ──────────────────────────────────────
(function () {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      da: (Math.random() - 0.5) * 0.004,
      speed: Math.random() * 0.08 + 0.01,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.alpha += s.da;
      if (s.alpha <= 0.05 || s.alpha >= 0.75) s.da *= -1;
      s.y -= s.speed;
      if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${s.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ── Star type metadata ────────────────────────────────────
const STAR_COLORS = {
  0: { main: '#CD853F', glow: 'rgba(205,133,63,0.4)',  bar: 'linear-gradient(90deg,#8B5E3C,#CD853F)' },
  1: { main: '#FF6B35', glow: 'rgba(255,107,53,0.4)',  bar: 'linear-gradient(90deg,#C03000,#FF6B35)' },
  2: { main: '#A8D8FF', glow: 'rgba(168,216,255,0.4)', bar: 'linear-gradient(90deg,#4A90D9,#A8D8FF)' },
  3: { main: '#FFD700', glow: 'rgba(255,215,0,0.4)',   bar: 'linear-gradient(90deg,#B8860B,#FFD700)' },
  4: { main: '#FF69B4', glow: 'rgba(255,105,180,0.4)', bar: 'linear-gradient(90deg,#C71585,#FF69B4)' },
  5: { main: '#FF3333', glow: 'rgba(255,51,51,0.4)',   bar: 'linear-gradient(90deg,#8B0000,#FF3333)' },
};

const CLASS_LABELS = [
  'Brown Dwarf',
  'Red Dwarf',
  'White Dwarf',
  'Main Sequence',
  'Supergiant',
  'Hypergiant',
];

// ── Example buttons ───────────────────────────────────────
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('temperature').value    = btn.dataset.temp;
    document.getElementById('luminosity').value     = btn.dataset.lum;
    document.getElementById('radius').value         = btn.dataset.rad;
    document.getElementById('abs_magnitude').value  = btn.dataset.mag;

    const colorSel = document.getElementById('color');
    for (const opt of colorSel.options) {
      if (opt.value === btn.dataset.color) { opt.selected = true; break; }
    }
    const specSel = document.getElementById('spectral_class');
    for (const opt of specSel.options) {
      if (opt.value === btn.dataset.spec) { opt.selected = true; break; }
    }

    // Highlight active button
    document.querySelectorAll('.example-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Form submission ───────────────────────────────────────
const form      = document.getElementById('classify-form');
const btnText   = form.querySelector('.btn-text');
const btnIcon   = form.querySelector('.btn-icon');
const btnLoader = form.querySelector('.btn-loader');
const btn       = document.getElementById('classify-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate
  const temperature   = document.getElementById('temperature').value.trim();
  const luminosity    = document.getElementById('luminosity').value.trim();
  const radius        = document.getElementById('radius').value.trim();
  const abs_magnitude = document.getElementById('abs_magnitude').value.trim();
  const color         = document.getElementById('color').value;
  const spectral_class = document.getElementById('spectral_class').value;

  if (!temperature || !luminosity || !radius || !abs_magnitude || !color || !spectral_class) {
    shakeForm(); return;
  }

  setLoading(true);

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temperature, luminosity, radius, abs_magnitude, color, spectral_class }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Ошибка сервера');

    showResult(data, { temperature, luminosity, radius, abs_magnitude, color, spectral_class });
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  btn.disabled = on;
  btnText.hidden = on;
  btnIcon.hidden = on;
  btnLoader.hidden = !on;
}

function shakeForm() {
  form.classList.add('shake');
  form.addEventListener('animationend', () => form.classList.remove('shake'), { once: true });
}

// ── Render result ─────────────────────────────────────────
function showResult(data, inputs) {
  const { type, confidence, all_probs, star_info } = data;
  const sc = STAR_COLORS[type];

  // Switch panels
  const emptyEl = document.getElementById('result-empty');
  emptyEl.style.display = 'none';
  const content = document.getElementById('result-content');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.hidden = false;
  content.classList.remove('animate-in');
  void content.offsetWidth; // reflow
  content.classList.add('animate-in');

  // ID
  document.getElementById('result-id').textContent = `TYPE-${type} · ID 0x${Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0')}`;

  // Hero
  const hero = document.getElementById('result-hero');
  hero.style.borderColor = sc.main + '55';
  hero.style.boxShadow   = `0 0 30px ${sc.glow}`;

  const core  = document.getElementById('star-core');
  const pulse = document.getElementById('star-pulse');
  core.style.background = `radial-gradient(circle at 38% 35%, #fff 0%, ${sc.main} 40%, ${sc.main}88 100%)`;
  core.style.boxShadow  = `0 0 20px ${sc.main}, 0 0 40px ${sc.glow}`;
  pulse.style.background = sc.main;

  const enEl = document.getElementById('result-en');
  const ruEl = document.getElementById('result-ru');
  enEl.textContent  = star_info.en;
  enEl.style.color  = sc.main;
  ruEl.textContent  = star_info.ru;

  // Confidence bar
  const confVal = document.getElementById('confidence-value');
  const confBar = document.getElementById('confidence-bar');
  confVal.textContent  = confidence.toFixed(1) + '%';
  confVal.style.color  = sc.main;
  confBar.style.width  = '0%';
  confBar.style.background = sc.bar;
  setTimeout(() => { confBar.style.width = confidence + '%'; }, 50);

  // Description
  const descEl = document.getElementById('result-desc');
  descEl.textContent = star_info.description;
  descEl.style.borderLeftColor = sc.main;

  // Facts
  const factsEl = document.getElementById('result-facts');
  factsEl.innerHTML = star_info.facts
    .map(f => `<span class="fact-tag" style="border-color:${sc.main}55;color:${sc.main}cc">${f}</span>`)
    .join('');

  // Probability chart
  const chartEl = document.getElementById('probs-chart');
  chartEl.innerHTML = '';
  CLASS_LABELS.forEach((label, i) => {
    const pct = all_probs[i];
    const isActive = i === type;
    const row = document.createElement('div');
    row.className = 'prob-row';
    row.innerHTML = `
      <div class="prob-label" style="${isActive ? `color:${sc.main};font-weight:600` : ''}">${label}</div>
      <div class="prob-bar-bg">
        <div class="prob-bar-fill" style="width:0%;background:${isActive ? sc.main : 'rgba(255,255,255,0.2)'}"></div>
      </div>
      <div class="prob-pct" style="${isActive ? `color:${sc.main}` : ''}">${pct.toFixed(1)}%</div>
    `;
    chartEl.appendChild(row);
    setTimeout(() => {
      row.querySelector('.prob-bar-fill').style.width = pct + '%';
    }, 100 + i * 60);
  });

  // Input echo
  document.getElementById('input-echo').innerHTML = `
    <div class="echo-item"><div class="echo-label">Температура</div><div class="echo-val">${parseFloat(inputs.temperature).toLocaleString()} K</div></div>
    <div class="echo-item"><div class="echo-label">Светимость</div><div class="echo-val">${inputs.luminosity} L☉</div></div>
    <div class="echo-item"><div class="echo-label">Радиус</div><div class="echo-val">${inputs.radius} R☉</div></div>
    <div class="echo-item"><div class="echo-label">Абс. величина</div><div class="echo-val">${inputs.abs_magnitude} Mv</div></div>
    <div class="echo-item"><div class="echo-label">Цвет</div><div class="echo-val">${inputs.color}</div></div>
    <div class="echo-item"><div class="echo-label">Спектр. класс</div><div class="echo-val">${inputs.spectral_class}</div></div>
  `;

  // Scroll to result on mobile
  if (window.innerWidth < 900) {
    document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function showError(msg) {
  const emptyEl = document.getElementById('result-empty');
  emptyEl.style.display = 'flex';
  emptyEl.hidden = false;
  const contentEl = document.getElementById('result-content');
  contentEl.style.display = 'none';
  contentEl.hidden = true;
  document.getElementById('result-empty').innerHTML = `
    <div class="empty-visual" style="font-size:2.5rem">⚠️</div>
    <p class="empty-title" style="color:#ff6b6b">Ошибка классификации</p>
    <p class="empty-sub">${msg}</p>
  `;
}
