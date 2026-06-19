/* =========================================================
   STAR CLASSIFIER — client-side (GitHub Pages build)
   Loads model.json (exported RandomForest) and runs the
   prediction entirely in the browser — no backend needed.
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

// ── Star type metadata (was STAR_INFO in app.py) ──────────
const STAR_INFO = {
  0: {
    en: 'Brown Dwarf', ru: 'Коричневый карлик',
    description: 'Субзвёздный объект, масса которого недостаточна для устойчивого термоядерного синтеза водорода. Занимает промежуточное положение между планетами-гигантами и звёздами.',
    facts: ['Масса: 13–80 масс Юпитера', 'Темп.: 300–2500 K', 'Светимость очень низкая'],
  },
  1: {
    en: 'Red Dwarf', ru: 'Красный карлик',
    description: 'Самый распространённый тип звёзд во Вселенной. Маломассивные и холодные звёзды главной последовательности спектрального класса M.',
    facts: ['Масса: 0.08–0.6 M☉', 'Темп.: 2500–4000 K', 'Живут до триллиона лет'],
  },
  2: {
    en: 'White Dwarf', ru: 'Белый карлик',
    description: 'Конечная стадия эволюции звёзд с малой и средней массой. Чрезвычайно плотный объект размером с Землю, лишённый источников термоядерной энергии.',
    facts: ['Радиус ≈ радиус Земли', 'Масса до 1.4 M☉', 'Плотность ~10⁶ г/см³'],
  },
  3: {
    en: 'Main Sequence', ru: 'Звезда главной последовательности',
    description: 'Звёзды, находящиеся на стадии горения водорода в ядре. Наше Солнце — типичный представитель этого класса. Занимают диагональ диаграммы Герцшпрунга–Рассела.',
    facts: ['Класс G: ~5778 K (Солнце)', 'Живут 1–10 млрд лет', 'Синтез He из H в ядре'],
  },
  4: {
    en: 'Supergiant', ru: 'Сверхгигант',
    description: 'Одни из самых крупных и ярких звёзд во Вселенной. Являются эволюционной стадией массивных звёзд после исчерпания водорода в ядре.',
    facts: ['Радиус: 30–500 R☉', 'Светимость: 10⁴–10⁶ L☉', 'Живут всего 10–50 млн лет'],
  },
  5: {
    en: 'Hypergiant', ru: 'Гипергигант',
    description: 'Крайне редкие и самые массивные из известных звёзд. Обладают колоссальной светимостью и быстро теряют массу через мощные звёздные ветры.',
    facts: ['Радиус: >500 R☉', 'Масса: 100–300 M☉', 'Светимость: 10⁶ L☉ и выше'],
  },
};

const STAR_COLORS = {
  0: { main: '#CD853F', glow: 'rgba(205,133,63,0.4)',  bar: 'linear-gradient(90deg,#8B5E3C,#CD853F)' },
  1: { main: '#FF6B35', glow: 'rgba(255,107,53,0.4)',  bar: 'linear-gradient(90deg,#C03000,#FF6B35)' },
  2: { main: '#A8D8FF', glow: 'rgba(168,216,255,0.4)', bar: 'linear-gradient(90deg,#4A90D9,#A8D8FF)' },
  3: { main: '#FFD700', glow: 'rgba(255,215,0,0.4)',   bar: 'linear-gradient(90deg,#B8860B,#FFD700)' },
  4: { main: '#FF69B4', glow: 'rgba(255,105,180,0.4)', bar: 'linear-gradient(90deg,#C71585,#FF69B4)' },
  5: { main: '#FF3333', glow: 'rgba(255,51,51,0.4)',   bar: 'linear-gradient(90deg,#8B0000,#FF3333)' },
};

const CLASS_LABELS = [
  'Brown Dwarf', 'Red Dwarf', 'White Dwarf',
  'Main Sequence', 'Supergiant', 'Hypergiant',
];

// ── Model state ───────────────────────────────────────────
let MODEL = null;

// LabelEncoder.transform — index in the sorted classes array.
function encode(classes, value) {
  const idx = classes.indexOf(value);
  if (idx === -1) throw new Error(`Неизвестное значение: "${value}"`);
  return idx;
}

// Traverse one decision tree, return its leaf probability vector.
function treeProba(nodes, x) {
  let i = 0;
  while (!nodes[i].leaf) {
    const node = nodes[i];
    i = x[node.f] <= node.th ? node.l : node.r;
  }
  return nodes[i].probs;
}

// RandomForest predict_proba — average of per-tree probabilities.
function predict(inputs) {
  const c_code = encode(MODEL.color_classes, inputs.color);
  const s_code = encode(MODEL.spec_classes, inputs.spectral_class);
  const x = [
    parseFloat(inputs.temperature),
    parseFloat(inputs.luminosity),
    parseFloat(inputs.radius),
    parseFloat(inputs.abs_magnitude),
    c_code,
    s_code,
  ];

  const nClasses = MODEL.classes.length;
  const avg = new Array(nClasses).fill(0);
  for (const tree of MODEL.forest) {
    const p = treeProba(tree, x);
    for (let k = 0; k < nClasses; k++) avg[k] += p[k];
  }
  for (let k = 0; k < nClasses; k++) avg[k] /= MODEL.forest.length;

  // argmax → class label
  let best = 0;
  for (let k = 1; k < nClasses; k++) if (avg[k] > avg[best]) best = k;
  const type = MODEL.classes[best];

  // Probabilities indexed by class label (0..5)
  const allProbs = new Array(6).fill(0);
  MODEL.classes.forEach((label, k) => { allProbs[label] = avg[k] * 100; });

  return {
    type,
    confidence: avg[best] * 100,
    all_probs: allProbs,
    star_info: STAR_INFO[type],
  };
}

// ── Populate dynamic UI from model.json ───────────────────
function populateUI() {
  // Accuracy badges
  document.querySelectorAll('[data-accuracy]').forEach(el => {
    el.textContent = MODEL.accuracy;
  });

  // Color / spectral-class selects
  const colorSel = document.getElementById('color');
  MODEL.colors.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    colorSel.appendChild(o);
  });
  const specSel = document.getElementById('spectral_class');
  MODEL.specs.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = 'Класс ' + s;
    specSel.appendChild(o);
  });

  // Example buttons
  const row = document.querySelector('.examples-row');
  Object.keys(MODEL.examples).forEach(t => {
    const ex = MODEL.examples[t];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'example-btn';
    btn.textContent = t;
    btn.addEventListener('click', () => {
      document.getElementById('temperature').value   = ex.temperature;
      document.getElementById('luminosity').value    = ex.luminosity;
      document.getElementById('radius').value        = ex.radius;
      document.getElementById('abs_magnitude').value = ex.abs_magnitude;
      for (const opt of colorSel.options) {
        if (opt.value === ex.color) { opt.selected = true; break; }
      }
      for (const opt of specSel.options) {
        if (opt.value === String(ex.spectral_class)) { opt.selected = true; break; }
      }
      document.querySelectorAll('.example-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    row.appendChild(btn);
  });
}

// ── Form submission ───────────────────────────────────────
const form      = document.getElementById('classify-form');
const btnText   = form.querySelector('.btn-text');
const btnIcon   = form.querySelector('.btn-icon');
const btnLoader = form.querySelector('.btn-loader');
const btn       = document.getElementById('classify-btn');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const temperature    = document.getElementById('temperature').value.trim();
  const luminosity     = document.getElementById('luminosity').value.trim();
  const radius         = document.getElementById('radius').value.trim();
  const abs_magnitude  = document.getElementById('abs_magnitude').value.trim();
  const color          = document.getElementById('color').value;
  const spectral_class = document.getElementById('spectral_class').value;

  if (!temperature || !luminosity || !radius || !abs_magnitude || !color || !spectral_class) {
    shakeForm(); return;
  }
  if (!MODEL) { showError('Модель ещё загружается, попробуйте ещё раз.'); return; }

  setLoading(true);
  const inputs = { temperature, luminosity, radius, abs_magnitude, color, spectral_class };

  // Small delay so the loader is perceptible (prediction is instant).
  setTimeout(() => {
    try {
      const data = predict(inputs);
      showResult(data, inputs);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, 250);
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

  const emptyEl = document.getElementById('result-empty');
  emptyEl.style.display = 'none';
  const content = document.getElementById('result-content');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.hidden = false;
  content.classList.remove('animate-in');
  void content.offsetWidth; // reflow
  content.classList.add('animate-in');

  document.getElementById('result-id').textContent =
    `TYPE-${type} · ID 0x${Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase().padStart(4,'0')}`;

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

  const confVal = document.getElementById('confidence-value');
  const confBar = document.getElementById('confidence-bar');
  confVal.textContent  = confidence.toFixed(1) + '%';
  confVal.style.color  = sc.main;
  confBar.style.width  = '0%';
  confBar.style.background = sc.bar;
  setTimeout(() => { confBar.style.width = confidence + '%'; }, 50);

  const descEl = document.getElementById('result-desc');
  descEl.textContent = star_info.description;
  descEl.style.borderLeftColor = sc.main;

  const factsEl = document.getElementById('result-facts');
  factsEl.innerHTML = star_info.facts
    .map(f => `<span class="fact-tag" style="border-color:${sc.main}55;color:${sc.main}cc">${f}</span>`)
    .join('');

  const chartEl = document.getElementById('probs-chart');
  chartEl.innerHTML = '';
  CLASS_LABELS.forEach((label, i) => {
    const pct = all_probs[i];
    const isActive = i === type;
    const r = document.createElement('div');
    r.className = 'prob-row';
    r.innerHTML = `
      <div class="prob-label" style="${isActive ? `color:${sc.main};font-weight:600` : ''}">${label}</div>
      <div class="prob-bar-bg">
        <div class="prob-bar-fill" style="width:0%;background:${isActive ? sc.main : 'rgba(255,255,255,0.2)'}"></div>
      </div>
      <div class="prob-pct" style="${isActive ? `color:${sc.main}` : ''}">${pct.toFixed(1)}%</div>
    `;
    chartEl.appendChild(r);
    setTimeout(() => {
      r.querySelector('.prob-bar-fill').style.width = pct + '%';
    }, 100 + i * 60);
  });

  document.getElementById('input-echo').innerHTML = `
    <div class="echo-item"><div class="echo-label">Температура</div><div class="echo-val">${parseFloat(inputs.temperature).toLocaleString()} K</div></div>
    <div class="echo-item"><div class="echo-label">Светимость</div><div class="echo-val">${inputs.luminosity} L☉</div></div>
    <div class="echo-item"><div class="echo-label">Радиус</div><div class="echo-val">${inputs.radius} R☉</div></div>
    <div class="echo-item"><div class="echo-label">Абс. величина</div><div class="echo-val">${inputs.abs_magnitude} Mv</div></div>
    <div class="echo-item"><div class="echo-label">Цвет</div><div class="echo-val">${inputs.color}</div></div>
    <div class="echo-item"><div class="echo-label">Спектр. класс</div><div class="echo-val">${inputs.spectral_class}</div></div>
  `;

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
  emptyEl.innerHTML = `
    <div class="empty-visual" style="font-size:2.5rem">⚠️</div>
    <p class="empty-title" style="color:#ff6b6b">Ошибка классификации</p>
    <p class="empty-sub">${msg}</p>
  `;
}

// ── Boot ──────────────────────────────────────────────────
fetch('static/model.json')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(m => { MODEL = m; populateUI(); })
  .catch(err => showError('Не удалось загрузить модель: ' + err.message));
