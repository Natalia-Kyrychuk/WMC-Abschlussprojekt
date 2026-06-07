// =============================================
//  CodeQuiz – Spiellogik
// =============================================
// --- fetch: externe JSON-Datei laden ---
fetch("questions.json")
  .then(response => response.json())
  .then(data => {
    console.log("Fragen aus questions.json geladen:", data);
  })
  .catch(error => {
    console.error("Fehler beim Laden der JSON-Datei:", error);
  });
// --- Zustand ---
let selectedCats = new Set();
let questions    = [];
let current      = 0;
let scoreC       = 0;
let scoreW       = 0;
let hintsUsed    = 0;
let answered     = false;

// --- Hilfsfunktionen ---
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function normalize(s) {
  return s.trim().toLowerCase().replace(/[-_\s\/]/g, '');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.style.display = 'block';
  // Kleines Timeout damit die Animation startet
  requestAnimationFrame(() => el.classList.add('active'));
}

// --- Startbildschirm aufbauen ---
function buildCatGrid() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';

  Object.keys(DB).forEach(cat => {
    const d = DB[cat];
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.id = 'cat-card-' + cat;
    card.innerHTML = `
      <span class="cat-card-icon">${d.icon}</span>
      <span class="cat-card-name">${cat}</span>
      <span class="cat-card-count">${d.questions.length} Begriffe</span>
    `;
    card.addEventListener('click', () => toggleCat(cat));
    grid.appendChild(card);
  });
}

function toggleCat(cat) {
  const card = document.getElementById('cat-card-' + cat);
  if (selectedCats.has(cat)) {
    selectedCats.delete(cat);
    card.classList.remove('selected');
  } else {
    selectedCats.add(cat);
    card.classList.add('selected');
  }
  document.getElementById('btn-start').disabled = selectedCats.size === 0;
}

// --- Quiz starten ---
function startQuiz() {
  // Fragen aus gewählten Kategorien zusammenstellen
  let pool = [];
  selectedCats.forEach(cat => {
    DB[cat].questions.forEach(q => pool.push({ ...q, cat }));
  });

  // Max. 15 zufällige Fragen
  questions = shuffle(pool).slice(0, Math.min(15, pool.length));
  current = 0;
  scoreC  = 0;
  scoreW  = 0;

  document.getElementById('sc').textContent = '0 ✓';
  document.getElementById('sw').textContent = '0 ✗';

  showScreen('screen-quiz');
  showQuestion();
}

// --- Frage anzeigen ---
function showQuestion() {
  answered  = false;
  hintsUsed = 0;

  const q = questions[current];

  // Fortschritt
  const pct = (current / questions.length) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';

  // Meta
  document.getElementById('q-num-label').textContent =
    `Frage ${current + 1} / ${questions.length}`;
  document.getElementById('cat-pill').textContent = q.cat;

  // Beschreibung
  document.getElementById('desc-text').textContent = q.desc;

  // Buchstabenboxen
  buildBoxes(q.term, 1);

  // Hinweis-Button
  document.getElementById('btn-hint').disabled = false;

  // Input zurücksetzen
  const inp = document.getElementById('term-input');
  inp.value    = '';
  inp.disabled = false;
  document.getElementById('btn-check').disabled = false;

  // Feedback verstecken
  const fb = document.getElementById('feedback-box');
  fb.className  = 'feedback-box';
  fb.innerHTML  = '';

  // Weiter-Button verstecken
  document.getElementById('btn-next').style.display = 'none';

  // Fokus auf Eingabefeld
  setTimeout(() => inp.focus(), 80);
}

// --- Buchstabenboxen aufbauen ---
function buildBoxes(term, revealed) {
  const container = document.getElementById('letter-boxes');
  container.innerHTML = '';

  const words = term.split(' ');
  let charIdx = 0;

  words.forEach((word, wi) => {
    for (let i = 0; i < word.length; i++) {
      const box = document.createElement('div');
      const ch  = word[i];
      const isSpecial = ch === '-' || ch === '/' || ch === '.';
      const isRev     = charIdx < revealed || isSpecial;

      box.className = 'lb' + (isRev ? ' rev' : '');
      box.textContent = isRev ? ch : '_';
      container.appendChild(box);
      charIdx++;
    }

    // Leerzeichen zwischen Wörtern
    if (wi < words.length - 1) {
      const sp = document.createElement('div');
      sp.className = 'lb space';
      container.appendChild(sp);
      charIdx++;
    }
  });
}

// --- Hinweis anzeigen ---
function showHint() {
  hintsUsed++;
  const q        = questions[current];
  const totalLen = q.term.replace(/ /g, '').length;
  const toReveal = Math.min(hintsUsed + 1, totalLen);

  buildBoxes(q.term, toReveal);

  if (toReveal >= totalLen) {
    document.getElementById('btn-hint').disabled = true;
  }
}

// --- Antwort prüfen ---
function checkAnswer() {
  if (answered) return;

  const q   = questions[current];
  const inp = document.getElementById('term-input');
  const val = inp.value;

  if (!val.trim()) return;

  answered = true;
  inp.disabled = true;
  document.getElementById('btn-check').disabled = true;

  const fb = document.getElementById('feedback-box');
  const nb = document.getElementById('btn-next');

  if (normalize(val) === normalize(q.term)) {
    // Richtig
    scoreC++;
    document.getElementById('sc').textContent = scoreC + ' ✓';
    fb.className = 'feedback-box ok';
    fb.textContent = `✓ Richtig! Der Begriff ist "${q.term}".`;
  } else {
    // Falsch
    scoreW++;
    document.getElementById('sw').textContent = scoreW + ' ✗';
    fb.className = 'feedback-box err';
    fb.innerHTML =
      `✗ Leider falsch. Du hast "<strong>${val}</strong>" geschrieben. ` +
      `Richtige Antwort: "<strong>${q.term}</strong>".`;
    // Alle Buchstaben aufdecken
    buildBoxes(q.term, q.term.length);
  }

  nb.style.display = 'block';
}

// --- Nächste Frage ---
function nextQuestion() {
  current++;
  if (current < questions.length) {
    showQuestion();
  } else {
    showResult();
  }
}

// --- Ergebnis anzeigen ---
function showResult() {
  // Fortschrittsbalken auf 100 %
  document.getElementById('progress-bar').style.width = '100%';

  const pct = Math.round((scoreC / questions.length) * 100);

  // Emoji & Titel
  let emoji, title;
  if (pct >= 80) {
    emoji = '🏆'; title = 'Ausgezeichnet!';
  } else if (pct >= 50) {
    emoji = '💪'; title = 'Gut gemacht!';
  } else {
    emoji = '📚'; title = 'Weiter üben!';
  }

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-sub').textContent =
    `Du hast ${scoreC} von ${questions.length} Begriffe richtig erraten (${pct} %).`;

  showScreen('screen-result');

  // Balken animieren
  setTimeout(() => {
    document.getElementById('result-bar-fill').style.width = pct + '%';
  }, 100);
}

// --- Nochmal mit gleichen Kategorien ---
function restartSame() {
  showScreen('screen-quiz');
  startQuiz();
}

// --- Zurück zur Kategorienauswahl ---
function goHome() {
  showScreen('screen-start');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('sc').textContent = '0 ✓';
  document.getElementById('sw').textContent = '0 ✗';
}

// --- Tastatur: Enter = Prüfen ---
document.addEventListener('DOMContentLoaded', () => {
  buildCatGrid();

  document.getElementById('term-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAnswer();
  });

  // Startscreen sichtbar machen
  document.getElementById('screen-start').style.display = 'block';
});
