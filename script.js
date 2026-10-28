/* =========================================================
   MOODORA — YOUR FEELINGS, YOUR SPACE
   File: js/script.js

   Fitur:
   - Navigasi responsif
   - Mood Check-in
   - Kuesioner refleksi 10 pertanyaan
   - Calm Corner (latihan pernapasan)
   - Daily Journal
   - Small Steps
   - Penyimpanan lokal dan penghapusan data
   - Notifikasi dan animasi sederhana
   ========================================================= */

"use strict";

/* =========================================================
   1. KONFIGURASI DAN UTILITAS
   ========================================================= */

const STORAGE_KEYS = {
  moods: "moodora_moods",
  journals: "moodora_journals",
  habits: "moodora_habits",
  questionnaire: "moodora_questionnaire"
};

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

function readStorage(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Gagal membaca data ${key}:`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Gagal menyimpan data ${key}:`, error);
    showToast("Data tidak dapat disimpan di browser ini.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function todayString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function showToast(message) {
  let container = $("#toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 9999;
      display: grid;
      gap: 10px;
      max-width: min(360px, calc(100vw - 40px));
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    padding: 13px 17px;
    border-radius: 14px;
    color: #ffffff;
    background: #303447;
    box-shadow: 0 8px 28px rgba(0,0,0,.16);
    font-size: 14px;
    line-height: 1.5;
    animation: moodoraToastIn .25s ease;
  `;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity .2s, transform .2s";

    window.setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function scrollToElement(element) {
  if (!element) return;

  element.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start"
  });
}

function bindClick(selector, callback) {
  $$(selector).forEach(element => {
    element.addEventListener("click", callback);
  });
}

/* =========================================================
   2. NAVIGASI RESPONSIF
   ========================================================= */

function initNavigation() {
  const menuToggle = $("#menu-toggle");
  const navMenu = $("#nav-menu") || $("#primary-nav");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
      );
    });

    $$(".nav-link, .nav-cta", navMenu).forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        navMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Tandai menu sesuai bagian yang sedang terlihat.
  const navLinks = $$(".nav-link");

  if ("IntersectionObserver" in window && navLinks.length) {
    const sections = navLinks
      .map(link => {
        const href = link.getAttribute("href");
        return href?.startsWith("#") ? $(href) : null;
      })
      .filter(Boolean);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        navLinks.forEach(link => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;

          link.classList.toggle("active", active);

          if (active) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    }, {
      rootMargin: "-25% 0px -60% 0px"
    });

    sections.forEach(section => observer.observe(section));
  }
}

/* =========================================================
   3. MOOD CHECK-IN
   ========================================================= */

const MOOD_INFO = {
  happy: {
    label: "Bahagia",
    emoji: "😊",
    message: "Senang rasanya kalau ada hal yang membuatmu bahagia."
  },
  calm: {
    label: "Tenang",
    emoji: "😌",
    message: "Nikmati momen tenang ini tanpa perlu terburu-buru."
  },
  okay: {
    label: "Biasa saja",
    emoji: "🙂",
    message: "Tidak harus selalu merasa luar biasa. Biasa saja juga tidak apa-apa."
  },
  sad: {
    label: "Sedih",
    emoji: "😔",
    message: "Kamu boleh memberi ruang untuk perasaanmu hari ini."
  },
  anxious: {
    label: "Cemas",
    emoji: "😰",
    message: "Coba hadapi semuanya satu langkah kecil pada satu waktu."
  },
  angry: {
    label: "Kesal",
    emoji: "😤",
    message: "Ambil jeda sebelum merespons. Perasaanmu layak dipahami."
  },
  tired: {
    label: "Lelah",
    emoji: "😴",
    message: "Istirahat juga bagian dari proses untuk terus bertumbuh."
  }
};

function initMoodCheckIn() {
  const form = document.querySelector("#mood-form")
    || document.querySelector(".mood-form");

  const intensity = document.querySelector("#mood-intensity");
  const result = document.querySelector("#mood-result");

  // Tampilkan nilai slider secara langsung.
  let intensityValue = document.querySelector("#mood-intensity-value");

  if (intensity && !intensityValue) {
    intensityValue = document.createElement("span");
    intensityValue.id = "mood-intensity-value";
    intensityValue.className = "intensity-value";
    intensity.insertAdjacentElement("afterend", intensityValue);
  }

  function updateIntensity() {
    if (!intensity) return;

    const value = Number(intensity.value);
    if (intensityValue) {
      intensityValue.textContent = `${value}/5`;
    }

    intensity.setAttribute("aria-valuetext", `${value} dari 5`);
  }

  if (intensity) {
    updateIntensity();
    intensity.addEventListener("input", updateIntensity);
    intensity.addEventListener("change", updateIntensity);
  }

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const selectedMood = form.querySelector(
      'input[name="mood"]:checked, ' +
      'input[name="mood-choice"]:checked, ' +
      'input[name="feeling"]:checked'
    );

    const selectedCard = form.querySelector(
      "[data-mood].selected, [data-mood].is-selected"
    );

    const moodValue = selectedMood?.value || selectedCard?.dataset.mood;

    if (!moodValue) {
      showToast("Pilih suasana hati kamu terlebih dahulu.");
      return;
    }

    // Baca nilai terbaru ketika tombol simpan ditekan.
    const intensityNumber = Number(intensity?.value ?? 3);
    const mood = MOOD_INFO[moodValue] || {
      label: moodValue,
      emoji: "💭",
      message: "Terima kasih sudah mengenali perasaanmu."
    };

    const factors = [
      ...form.querySelectorAll(
        'input[name="factor"]:checked, ' +
        'input[name="mood-factor"]:checked, ' +
        'input[name="trigger"]:checked'
      )
    ].map(input => input.value);

    const entry = {
      id: Date.now(),
      date: todayString(),
      mood: moodValue,
      label: mood.label,
      intensity: intensityNumber,
      factors,
      createdAt: new Date().toISOString()
    };

    const moods = readStorage(STORAGE_KEYS.moods, []);
    moods.unshift(entry);

    if (!saveStorage(STORAGE_KEYS.moods, moods)) return;

    // Hasil menunjukkan nilai yang benar-benar dipilih.
    if (result) {
      result.replaceChildren();

      const heading = document.createElement("strong");
      heading.textContent =
        `${mood.emoji} ${mood.label} — Intensitas ${intensityNumber}/5`;

      const description = document.createElement("p");
      description.textContent = mood.message;

      result.append(heading, description);
      result.hidden = false;
    }

    renderMoodHistory();
    renderMoodInsights();
    showToast(`Mood tersimpan dengan intensitas ${intensityNumber}/5.`);
  });

  renderMoodHistory();
  renderMoodInsights();
}
  // Memilih mood melalui kartu atau tombol data-mood.
  $$("[data-mood]").forEach(button => {
    button.addEventListener("click", () => {
      const moodValue = button.dataset.mood;
      const radio = $(
        `input[name="mood"][value="${CSS.escape(moodValue)}"], ` +
        `input[name="mood-choice"][value="${CSS.escape(moodValue)}"], ` +
        `input[name="feeling"][value="${CSS.escape(moodValue)}"]`,
        form || document
      );

      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }

      $$("[data-mood]").forEach(item => {
        item.classList.remove("selected", "is-selected");
        item.setAttribute("aria-pressed", "false");
      });

      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    });
  });

  renderMoodHistory();
  renderMoodInsights();
}

function renderMoodHistory() {
  const container = $("#mood-history");
  if (!container) return;

  const moods = readStorage(STORAGE_KEYS.moods, []).slice(0, 7);

  if (!moods.length) {
    container.textContent = "Catatan suasana hatimu akan muncul di sini.";
    return;
  }

  container.innerHTML = moods.map(entry => {
    const mood = MOOD_INFO[entry.mood] || {
      emoji: "💭",
      label: entry.label || entry.mood
    };

    return `
      <article class="mood-history-item">
        <span aria-hidden="true">${mood.emoji}</span>
        <div>
          <strong>${escapeHTML(mood.label)}</strong>
          <p>${escapeHTML(formatDate(entry.date))}</p>
          <small>Intensitas: ${Number(entry.intensity)}/5</small>
        </div>
      </article>
    `;
  }).join("");
}

function renderMoodInsights() {
  const container = $("#mood-insights");
  if (!container) return;

  const moods = readStorage(STORAGE_KEYS.moods, []).slice(0, 7);

  if (!moods.length) {
    container.textContent =
      "Lakukan beberapa check-in untuk mulai melihat pola suasana hatimu.";
    return;
  }

  const counts = {};

  moods.forEach(entry => {
    counts[entry.mood] = (counts[entry.mood] || 0) + 1;
  });

  const topMood = Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a]
  )[0];

  const info = MOOD_INFO[topMood];

  container.textContent = info
    ? `Dalam ${moods.length} check-in terakhir, suasana hati yang paling sering kamu catat adalah ${info.label.toLowerCase()}. Ini bukan penilaian baik atau buruk—hanya kesempatan untuk mengenali pola dirimu.`
    : "Terus catat perasaanmu untuk mengenali polanya.";
}

/* =========================================================
   4. KUESIONER REFLEKSI DIRI
   ========================================================= */

const QUESTIONS = [
  {
    text: "Dalam dua minggu terakhir, seberapa sering kamu kehilangan minat pada hal yang biasanya kamu sukai?",
    theme: "interest"
  },
  {
    text: "Seberapa sering kamu merasa sedih, kosong, atau kehilangan harapan?",
    theme: "sadness"
  },
  {
    text: "Seberapa sering kamu merasa cemas, khawatir berlebihan, atau sulit menghentikan pikiranmu?",
    theme: "anxiety"
  },
  {
    text: "Seberapa sering kamu mengalami kesulitan tidur atau merasa lelah meskipun sudah beristirahat?",
    theme: "sleep"
  },
  {
    text: "Seberapa sering perasaanmu membuat kegiatan sekolah atau hubungan dengan orang lain terasa sulit?",
    theme: "daily"
  },
  {
    text: "Seberapa sering kamu kesulitan berkonsentrasi saat belajar atau mengerjakan sesuatu?",
    theme: "focus"
  },
  {
    text: "Seberapa sering kamu merasa kewalahan oleh tugas, ekspektasi orang lain, atau masalah sehari-hari?",
    theme: "stress"
  },
  {
    text: "Seberapa sering kamu merasa kesepian atau merasa tidak punya seseorang untuk diajak bercerita?",
    theme: "loneliness"
  },
  {
    text: "Seberapa sering kamu merasa tidak cukup baik atau menyalahkan dirimu sendiri?",
    theme: "self-worth"
  },
  {
    text: "Seberapa sering kamu merasa tidak aman dengan dirimu sendiri atau terpikir untuk menyakiti dirimu?",
    theme: "safety",
    safetyQuestion: true
  }
];

const FREQUENCY_OPTIONS = [
  { label: "Nggak pernah", value: 0 },
  { label: "Beberapa hari", value: 1 },
  { label: "Lebih dari separuh hari", value: 2 },
  { label: "Hampir setiap hari", value: 3 }
];

const questionnaireState = {
  index: 0,
  answers: Array(QUESTIONS.length).fill(null),
  started: false
};

function initQuestionnaire() {
  const startButton = $("#start-questionnaire");
  const form = $("#questionnaire-form");

  if (!form) return;

  form.addEventListener("submit", event => event.preventDefault());

  startButton?.addEventListener("click", () => {
    questionnaireState.index = 0;
    questionnaireState.answers = Array(QUESTIONS.length).fill(null);
    questionnaireState.started = true;

    const result = $("#reflection-result");
    if (result) result.hidden = true;

    form.hidden = false;
    startButton.hidden = true;

    renderQuestion();
    scrollToElement(form);
  });

  $("#question-back")?.addEventListener("click", () => {
    if (questionnaireState.index > 0) {
      questionnaireState.index--;
      renderQuestion();
    }
  });

  $("#question-next")?.addEventListener("click", () => {
    if (!saveCurrentAnswer()) return;

    if (questionnaireState.index < QUESTIONS.length - 1) {
      questionnaireState.index++;
      renderQuestion();
    }
  });

  $("#question-submit")?.addEventListener("click", () => {
    if (!saveCurrentAnswer()) return;
    showQuestionnaireResult();
  });

  $("#restart-questionnaire")?.addEventListener("click", () => {
    questionnaireState.index = 0;
    questionnaireState.answers = Array(QUESTIONS.length).fill(null);
    questionnaireState.started = true;

    const result = $("#reflection-result");
    if (result) result.hidden = true;

    form.hidden = false;
    renderQuestion();
    scrollToElement(form);
  });
}

function renderQuestion() {
  const question = QUESTIONS[questionnaireState.index];
  const container = $("#question-container");
  const counter = $("#question-counter");
  const percentage = $("#question-percentage");
  const progress = $("#question-progress");
  const progressFill = $("#question-progress-fill");
  const backButton = $("#question-back");
  const nextButton = $("#question-next");
  const submitButton = $("#question-submit");
  const error = $("#question-error");

  if (!question || !container) return;

  const current = questionnaireState.index + 1;
  const percent = Math.round((current / QUESTIONS.length) * 100);

  if (counter) counter.textContent = `Pertanyaan ${current} dari ${QUESTIONS.length}`;
  if (percentage) percentage.textContent = `${percent}%`;

  if (progress) progress.setAttribute("aria-valuenow", String(percent));
  if (progressFill) progressFill.style.width = `${percent}%`;

  container.innerHTML = `
    <fieldset class="question-card">
      <legend>${escapeHTML(question.text)}</legend>
      <p class="question-hint">Pilih jawaban yang paling sesuai dengan pengalamanmu.</p>

      <div class="answer-options">
        ${FREQUENCY_OPTIONS.map((option, index) => `
          <label class="answer-option">
            <input
              type="radio"
              name="question-${questionnaireState.index}"
              value="${option.value}"
              ${questionnaireState.answers[questionnaireState.index] === option.value ? "checked" : ""}
              required
            >
            <span>${escapeHTML(option.label)}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;

  if (backButton) {
    backButton.hidden = questionnaireState.index === 0;
    backButton.disabled = questionnaireState.index === 0;
  }

  const isLast = questionnaireState.index === QUESTIONS.length - 1;

  if (nextButton) nextButton.hidden = isLast;
  if (submitButton) submitButton.hidden = !isLast;
  if (error) error.textContent = "";

  const selectedInput = $('input[type="radio"]:checked', container);
  selectedInput?.focus({ preventScroll: true });
}

function saveCurrentAnswer() {
  const selected = $(
    `input[name="question-${questionnaireState.index}"]:checked`
  );

  const error = $("#question-error");

  if (!selected) {
    if (error) {
      error.textContent = "Pilih salah satu jawaban sebelum melanjutkan.";
    } else {
      showToast("Pilih salah satu jawaban terlebih dahulu.");
    }
    return false;
  }

  questionnaireState.answers[questionnaireState.index] =
    Number(selected.value);

  if (error) error.textContent = "";
  return true;
}

function showQuestionnaireResult() {
  const answers = questionnaireState.answers;

  // Pertanyaan keselamatan tidak dimasukkan ke skor.
  const score = answers.slice(0, 9).reduce(
    (total, answer) => total + (answer ?? 0),
    0
  );

  const safetyAnswer = answers[9] ?? 0;
  let title;
  let description;

  if (score <= 8) {
    title = "Perasaan relatif stabil";
    description =
      "Dari jawabanmu, mungkin kamu sedang memiliki ruang untuk menjalani keseharian. Tetap beri perhatian pada kebutuhan diri dan ingat bahwa kamu boleh meminta dukungan kapan pun.";
  } else if (score <= 17) {
    title = "Ada hal yang sedang membebani";
    description =
      "Jawabanmu menunjukkan ada beberapa hal yang mungkin terasa berat belakangan ini. Kamu tidak harus menyelesaikan semuanya sekaligus. Mulailah dari satu langkah kecil.";
  } else {
    title = "Kamu mungkin membutuhkan dukungan lebih";
    description =
      "Sepertinya akhir-akhir ini ada cukup banyak hal yang menguras energimu. Kamu tidak perlu menghadapi semuanya sendirian. Bercerita kepada orang yang kamu percaya atau tenaga profesional bisa menjadi langkah yang berarti.";
  }

  const advice = buildAdvice(answers);

  const result = $("#reflection-result");
  const titleElement = $("#reflection-result-title");
  const descriptionElement = $("#reflection-result-description");
  const adviceList = $("#reflection-advice-list");
  const form = $("#questionnaire-form");

  if (titleElement) titleElement.textContent = title;
  if (descriptionElement) descriptionElement.textContent = description;

  if (adviceList) {
    adviceList.innerHTML = advice.map(item => `
      <li>
        <strong>${escapeHTML(item.title)}</strong>
        <p>${escapeHTML(item.description)}</p>
      </li>
    `).join("");
  }

  if (form) form.hidden = true;
  if (result) {
    result.hidden = false;
    scrollToElement(result);
  }

  // Simpan jawaban refleksi secara lokal.
  saveStorage(STORAGE_KEYS.questionnaire, {
    date: todayString(),
    answers,
    score,
    resultTitle: title
  });

  // Tampilkan informasi keselamatan secara terpisah dari skor.
  showSafetyMessage(safetyAnswer);

  showToast("Refleksi selesai. Terima kasih sudah meluangkan waktu untuk dirimu.");
}

function buildAdvice(answers) {
  const advice = [];
  const themes = QUESTIONS.slice(0, 9).map((question, index) => ({
    theme: question.theme,
    score: answers[index] ?? 0
  }));

  const recommendations = {
    interest: {
      title: "Mulai dari hal kecil yang kamu sukai",
      description: "Luangkan beberapa menit untuk aktivitas sederhana yang dulu terasa menyenangkan, tanpa menuntut dirimu harus langsung merasa lebih baik."
    },
    sadness: {
      title: "Beri ruang untuk perasaanmu",
      description: "Coba tuliskan apa yang sedang kamu rasakan. Kamu tidak perlu memaksa diri untuk selalu terlihat baik-baik saja."
    },
    anxiety: {
      title: "Coba latihan pernapasan",
      description: "Kunjungi Calm Corner dan ikuti latihan pernapasan pelan. Berhenti jika kamu merasa pusing atau tidak nyaman."
    },
    sleep: {
      title: "Perhatikan kebutuhan istirahat",
      description: "Coba buat rutinitas tidur yang lebih teratur dan beri jeda dari layar sebelum tidur."
    },
    daily: {
      title: "Pecah aktivitas menjadi langkah kecil",
      description: "Pilih satu tugas yang paling penting, kerjakan sedikit demi sedikit, dan pertimbangkan berbicara dengan orang yang bisa membantu."
    },
    focus: {
      title: "Coba fokus dalam waktu singkat",
      description: "Kerjakan satu hal selama 10 menit, lalu istirahat sebentar. Kurangi gangguan yang bisa kamu kendalikan."
    },
    stress: {
      title: "Kurangi beban satu per satu",
      description: "Tulis hal yang membebanimu, pilih satu yang bisa ditangani hari ini, dan izinkan dirimu meminta bantuan."
    },
    loneliness: {
      title: "Hubungi seseorang yang kamu percaya",
      description: "Kirim pesan sederhana kepada teman, keluarga, guru BK, atau orang dewasa yang membuatmu merasa aman."
    },
    "self-worth": {
      title: "Berbicara kepada diri dengan lebih lembut",
      description: "Bayangkan apa yang akan kamu katakan kepada teman dalam situasi yang sama, lalu coba gunakan kata-kata itu untuk dirimu."
    }
  };

  themes
    .filter(item => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .forEach(item => {
      if (recommendations[item.theme]) advice.push(recommendations[item.theme]);
    });

  if (!advice.length) {
    advice.push({
      title: "Terus jaga dirimu",
      description: "Pertahankan kebiasaan yang membantumu merasa lebih baik, luangkan waktu untuk beristirahat, dan tetap terbuka untuk bercerita ketika membutuhkan dukungan."
    });
  }

  return advice;
}

function showSafetyMessage(safetyAnswer) {
  const existing = $("#safety-support-message");
  if (existing) existing.remove();

  if (safetyAnswer === 0) return;

  const message = document.createElement("section");
  message.id = "safety-support-message";
  message.className = "safety-support-message";
  message.setAttribute("role", "alert");

  message.innerHTML = `
    <h3>Kamu layak merasa aman dan didukung</h3>
    <p>
      Terima kasih sudah menjawab dengan jujur. Jika kamu merasa tidak aman
      atau terpikir untuk menyakiti diri, cobalah segera menghubungi orang
      dewasa yang kamu percaya, keluarga, guru BK, atau tenaga kesehatan.
      Kamu tidak harus menghadapi ini sendirian.
    </p>
    <p>
      Jika kamu merasa mungkin akan menyakiti diri dalam waktu dekat,
      jangan sendirian. Dekati orang yang aman dan hubungi layanan darurat
      setempat atau pergi ke IGD terdekat.
    </p>
    <p>
      Kamu tidak perlu menjelaskan semuanya sekaligus. Kamu bisa mulai
      dengan mengatakan, "Aku sedang tidak merasa aman dan butuh ditemani."
    </p>
  `;

  const result = $("#reflection-result");
  if (result) result.appendChild(message);
}

/* =========================================================
   5. CALM CORNER — LATIHAN PERNAPASAN
   ========================================================= */

let breathingInterval = null;
let breathingPhaseTimeout = null;
let breathingRunning = false;

function initBreathing() {
  const startButton = $("#breathing-start");
  const stopButton = $("#breathing-stop");
  const visual = $("#breathing-visual");
  const instruction = $("#breathing-instruction");
  const countdown = $("#breathing-countdown");

  if (!startButton || !visual) return;

  const phases = [
    { label: "Tarik napas perlahan", seconds: 4, className: "inhale" },
    { label: "Tahan sebentar", seconds: 2, className: "hold" },
    { label: "Hembuskan perlahan", seconds: 6, className: "exhale" }
  ];

  let phaseIndex = 0;
  let secondsLeft = phases[0].seconds;

  function updateDisplay() {
    const phase = phases[phaseIndex];

    if (instruction) instruction.textContent = phase.label;
    if (countdown) countdown.textContent = String(secondsLeft);

    visual.classList.remove("inhale", "hold", "exhale", "is-running");
    visual.classList.add(phase.className, "is-running");
  }

  function tick() {
    if (!breathingRunning) return;

    secondsLeft--;

    if (secondsLeft <= 0) {
      phaseIndex = (phaseIndex + 1) % phases.length;
      secondsLeft = phases[phaseIndex].seconds;
    }

    updateDisplay();
  }

  function stop() {
    breathingRunning = false;
    window.clearInterval(breathingInterval);
    window.clearTimeout(breathingPhaseTimeout);
    breathingInterval = null;
    breathingPhaseTimeout = null;

    visual.classList.remove("inhale", "hold", "exhale", "is-running");

    if (instruction) instruction.textContent = "Tarik napas saat siap, lalu hembuskan perlahan.";
    if (countdown) countdown.textContent = "—";

    startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
  }

  startButton.addEventListener("click", () => {
    if (breathingRunning) return;

    breathingRunning = true;
    phaseIndex = 0;
    secondsLeft = phases[0].seconds;

    startButton.disabled = true;
    if (stopButton) stopButton.disabled = false;

    updateDisplay();
    breathingInterval = window.setInterval(tick, 1000);
  });

  stopButton?.addEventListener("click", stop);
  if (stopButton) stopButton.disabled = true;

  // Hindari interval yang berjalan terus jika pengguna meninggalkan halaman.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && breathingRunning) stop();
  });
}

/* =========================================================
   6. DAILY JOURNAL
   ========================================================= */

function initJournal() {
  const form = $("#journal-form");
  const entryInput = $("#journal-entry");
  const editIdInput = $("#journal-edit-id");

  if (form && entryInput) {
    form.addEventListener("submit", event => {
      event.preventDefault();

      const content = entryInput.value.trim();

      if (!content) {
        showToast("Tulis sedikit tentang harimu sebelum menyimpan.");
        entryInput.focus();
        return;
      }

      const journals = readStorage(STORAGE_KEYS.journals, []);
      const editId = editIdInput?.value;

      if (editId) {
        const index = journals.findIndex(item => String(item.id) === editId);

        if (index !== -1) {
          journals[index].content = content;
          journals[index].updatedAt = new Date().toISOString();
        }
      } else {
        journals.unshift({
          id: Date.now(),
          date: todayString(),
          content,
          createdAt: new Date().toISOString()
        });
      }

      if (!saveStorage(STORAGE_KEYS.journals, journals)) return;

      form.reset();
      if (editIdInput) editIdInput.value = "";

      const submitButton = $('button[type="submit"]', form);
      if (submitButton) submitButton.textContent = "Simpan catatan";

      renderJournals();
      showToast(editId ? "Catatan berhasil diperbarui." : "Catatan berhasil disimpan.");
    });
  }

  renderJournals();
}

function renderJournals() {
  const container = $("#journal-list");
  if (!container) return;

  const journals = readStorage(STORAGE_KEYS.journals, []);

  if (!journals.length) {
    container.textContent =
      "Belum ada catatan. Mulailah dengan menuliskan satu hal yang kamu rasakan hari ini.";
    return;
  }

  container.innerHTML = journals.map(journal => `
    <article class="journal-entry" data-journal-id="${escapeHTML(journal.id)}">
      <p class="journal-date">${escapeHTML(formatDate(journal.date))}</p>
      <p class="journal-content">${escapeHTML(journal.content).replace(/\n/g, "<br>")}</p>
      <div class="journal-actions">
        <button type="button" data-edit-journal="${escapeHTML(journal.id)}">
          Edit
        </button>
        <button type="button" data-delete-journal="${escapeHTML(journal.id)}">
          Hapus
        </button>
      </div>
    </article>
  `).join("");

  $$("[data-edit-journal]", container).forEach(button => {
    button.addEventListener("click", () => {
      const journal = readStorage(STORAGE_KEYS.journals, []).find(
        item => String(item.id) === button.dataset.editJournal
      );

      if (!journal) return;

      const form = $("#journal-form");
      const input = $("#journal-entry");
      const editId = $("#journal-edit-id");

      if (!form || !input) return;

      input.value = journal.content;
      if (editId) editId.value = String(journal.id);

      const submitButton = $('button[type="submit"]', form);
      if (submitButton) submitButton.textContent = "Perbarui catatan";

      scrollToElement(form);
      input.focus({ preventScroll: true });
    });
  });

  $$("[data-delete-journal]", container).forEach(button => {
    button.addEventListener("click", () => {
      const confirmed = window.confirm("Hapus catatan jurnal ini?");
      if (!confirmed) return;

      const remaining = readStorage(STORAGE_KEYS.journals, []).filter(
        item => String(item.id) !== button.dataset.deleteJournal
      );

      if (saveStorage(STORAGE_KEYS.journals, remaining)) {
        renderJournals();
        showToast("Catatan telah dihapus dari perangkat ini.");
      }
    });
  });
}

/* =========================================================
   7. SMALL STEPS — KEBIASAAN KECIL
   ========================================================= */

const DEFAULT_HABITS = [
  { id: "water", text: "Minum air putih", done: false },
  { id: "break", text: "Istirahat sebentar dari layar", done: false },
  { id: "outside", text: "Mencari udara segar", done: false },
  { id: "talk", text: "Menghubungi seseorang yang dipercaya", done: false },
  { id: "journal", text: "Menulis satu hal yang dirasakan", done: false }
];

function initSmallSteps() {
  const container = $("#habit-list");
  const resetButton = $("#reset-habits");

  if (!container) return;

  const stored = readStorage(STORAGE_KEYS.habits, null);

  if (!stored || stored.date !== todayString()) {
    saveStorage(STORAGE_KEYS.habits, {
      date: todayString(),
      items: DEFAULT_HABITS.map(item => ({ ...item }))
    });
  }

  renderHabits();

  resetButton?.addEventListener("click", () => {
    saveStorage(STORAGE_KEYS.habits, {
      date: todayString(),
      items: DEFAULT_HABITS.map(item => ({ ...item }))
    });

    renderHabits();
    showToast("Daftar Small Steps hari ini sudah diatur ulang.");
  });
}

function renderHabits() {
  const container = $("#habit-list");
  if (!container) return;

  let data = readStorage(STORAGE_KEYS.habits, null);

  if (!data || !Array.isArray(data.items)) {
    data = {
      date: todayString(),
      items: DEFAULT_HABITS.map(item => ({ ...item }))
    };
  }

  if (data.date !== todayString()) {
    data = {
      date: todayString(),
      items: DEFAULT_HABITS.map(item => ({ ...item }))
    };
    saveStorage(STORAGE_KEYS.habits, data);
  }

  const completed = data.items.filter(item => item.done).length;
  const percent = Math.round((completed / Math.max(data.items.length, 1)) * 100);

  container.innerHTML = data.items.map(item => `
    <label class="habit-card">
      <input
        type="checkbox"
        data-habit-id="${escapeHTML(item.id)}"
        ${item.done ? "checked" : ""}
      >
      <span>${escapeHTML(item.text)}</span>
    </label>
  `).join("");

  const progressBar = $("#steps-progress-bar");
  const progressFill = $("#steps-progress-fill");
  const progressText = $("#steps-progress-text");

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(percent));
  }

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
    progressFill.setAttribute("aria-valuenow", String(percent));
  }

  if (progressText) {
    progressText.textContent = `${completed} dari ${data.items.length} langkah selesai`;
  }

  $$("input[data-habit-id]", container).forEach(input => {
    input.addEventListener("change", () => {
      const current = readStorage(STORAGE_KEYS.habits, data);
      const item = current.items.find(
        habit => habit.id === input.dataset.habitId
      );

      if (!item) return;

      item.done = input.checked;

      if (saveStorage(STORAGE_KEYS.habits, current)) {
        renderHabits();

        if (input.checked) {
          showToast("Satu langkah kecil berhasil kamu selesaikan. Keren!");
        }
      }
    });
  });
}

/* =========================================================
   8. INTERAKSI KARTU DAN TOMBOL AJAKAN
   ========================================================= */

function initGeneralInteractions() {
  // Tombol yang menuju ke bagian tertentu.
  $$("[data-scroll-to]").forEach(button => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.scrollTo);
      scrollToElement(target);
    });
  });

  // Tombol yang menuju ke fitur terkait.
  bindClick("[data-go-journal]", () => scrollToElement($("#journal")));
  bindClick("[data-go-calm]", () => scrollToElement($("#calm-corner")));
  bindClick("[data-go-checkin]", () => scrollToElement($("#check-in")));
  bindClick("[data-go-small-steps]", () => scrollToElement($("#small-steps")));

  // Tombol yang mengisi prompt jurnal, jika ada.
  $$("[data-journal-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      const input = $("#journal-entry");
      if (!input) return;

      input.value = button.dataset.journalPrompt || "";
      scrollToElement(input);
      input.focus({ preventScroll: true });
    });
  });
}

/* =========================================================
   9. PRIVASI DAN HAPUS DATA
   ========================================================= */

function initPrivacy() {
  const deleteButton = $("#delete-all-data");
  if (!deleteButton) return;

  deleteButton.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Hapus semua data Moodora yang tersimpan di browser ini? " +
      "Data yang dihapus tidak bisa dikembalikan."
    );

    if (!confirmed) return;

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Reset tampilan yang menampilkan data lokal.
    renderMoodHistory();
    renderMoodInsights();
    renderJournals();

    const habitList = $("#habit-list");
    if (habitList) {
      saveStorage(STORAGE_KEYS.habits, {
        date: todayString(),
        items: DEFAULT_HABITS.map(item => ({ ...item }))
      });
      renderHabits();
    }

    const moodResult = $("#mood-result");
    if (moodResult) {
      moodResult.textContent = "";
      moodResult.hidden = true;
    }

    const questionnaireForm = $("#questionnaire-form");
    const questionnaireResult = $("#reflection-result");
    const startQuestionnaire = $("#start-questionnaire");

    if (questionnaireForm) questionnaireForm.hidden = true;
    if (questionnaireResult) questionnaireResult.hidden = true;
    if (startQuestionnaire) startQuestionnaire.hidden = false;

    $("#safety-support-message")?.remove();

    const journalForm = $("#journal-form");
    journalForm?.reset();

    const editId = $("#journal-edit-id");
    if (editId) editId.value = "";

    showToast("Data Moodora di browser ini telah dihapus.");
  });
}

/* =========================================================
   10. EFEK MASUK SAAT SCROLL
   ========================================================= */

function initRevealAnimations() {
  const elements = $$(".reveal-on-scroll");

  if (!elements.length || !("IntersectionObserver" in window)) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  elements.forEach(element => observer.observe(element));
}

/* =========================================================
   11. INISIALISASI MOODORA
   ========================================================= */

function initMoodora() {
  initNavigation();
  initMoodCheckIn();
  initQuestionnaire();
  initBreathing();
  initJournal();
  initSmallSteps();
  initGeneralInteractions();
  initPrivacy();
  initRevealAnimations();

  console.info("Moodora berhasil diinisialisasi ✨");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMoodora);
} else {
  initMoodora();
}
