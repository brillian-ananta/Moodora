
/* =========================================
   MOODORA — INTERACTIVE JAVASCRIPT
   Tanpa framework dan tanpa database
   ========================================= */

"use strict";

// Helper untuk mengambil elemen HTML
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

// =========================================
// 1. PENYIMPANAN LOKAL YANG AMAN
// =========================================

function loadData(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Data tidak dapat dibaca:", error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("Data tidak dapat disimpan:", error);
    showToast("Penyimpanan gagal. Periksa pengaturan browser.");
    return false;
  }
}

// localStorage hanya untuk perangkat/browser ini.
// Jangan menganggapnya sebagai penyimpanan rahasia.

// =========================================
// 2. TOAST NOTIFICATION
// =========================================

let toastTimeout;

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// =========================================
// 3. NAVIGASI DAN TRANSISI HALAMAN
// =========================================

const validPages = [
  "home", "mood", "selfcheck", "calm",
  "journal", "steps", "support"
];

function navigateTo(page, updateHistory = true) {
  if (!validPages.includes(page)) page = "home";

  const target = $(`#page-${page}`);
  if (!target) return;

  $$(".page").forEach((section) => {
    section.classList.remove("active");
  });

  target.classList.add("active");

  $$(".nav-link").forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  $("#nav-links").classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");

  document.title =
    `${target.dataset.title || "Moodora"} — Moodora`;

  if (updateHistory) {
    history.pushState({ page }, "", `#${page}`);
  }

  // Scroll ke atas setelah pindah halaman
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Jalankan kembali animasi elemen
  setupReveal(target);
}

$$("[data-page]").forEach((element) => {
  element.addEventListener("click", (event) => {
    event.preventDefault();
    navigateTo(element.dataset.page);
  });
});

// Tombol Back/Forward browser
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "home";
  navigateTo(page, false);
});

// Menu HP
$("#menu-toggle").addEventListener("click", () => {
  const menu = $("#nav-links");
  const open = menu.classList.toggle("open");

  $("#menu-toggle").setAttribute("aria-expanded", String(open));
});

// Inisialisasi halaman dari URL
const initialPage = location.hash.replace("#", "");
navigateTo(
  validPages.includes(initialPage) ? initialPage : "home",
  false
);

$("#current-year").textContent = new Date().getFullYear();

// =========================================
// 4. ANIMASI SCROLL REVEAL
// =========================================

let revealObserver;

function setupReveal(container = document) {
  if (revealObserver) revealObserver.disconnect();

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    $$(".reveal").forEach((item) => item.classList.add("visible"));
    return;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  container.querySelectorAll(".reveal:not(.visible)")
    .forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 65, 260)}ms`;
      revealObserver.observe(item);
    });
}

setupReveal();

// =========================================
// 5. MOOD CHECK-IN
// =========================================

let selectedMood = null;
let selectedEmoji = null;

const moodForm = $("#mood-form");
const moodIntensity = $("#mood-intensity");
const intensityValue = $("#intensity-value");

moodIntensity.addEventListener("input", () => {
  intensityValue.value = `${moodIntensity.value} / 5`;
  intensityValue.textContent = `${moodIntensity.value} / 5`;
});

$$(".mood-option").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".mood-option").forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");

    selectedMood = button.dataset.mood;
    selectedEmoji = button.dataset.emoji;

    // Efek kecil saat emoji dipilih
    const emoji = button.querySelector("span");
    emoji.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.3) rotate(-8deg)" },
        { transform: "scale(1)" }
      ],
      { duration: 300, easing: "ease-out" }
    );
  });
});

function getMoodMessage(mood, intensity) {
  if (mood === "Senang") {
    return "Nikmati momen baik ini. Kalau mau, catat hal kecil yang membuatmu tersenyum.";
  }

  if (mood === "Tenang") {
    return "Senang kamu punya ruang untuk merasa tenang. Kamu boleh menikmati jeda ini.";
  }

  if (mood === "Biasa saja") {
    return "Kamu tidak harus merasa luar biasa setiap hari. Hari biasa pun tetap berarti.";
  }

  if (mood === "Sedih") {
    return intensity >= 4
      ? "Perasaanmu layak mendapat perhatian. Coba hubungi orang yang kamu percaya jika kamu membutuhkan teman."
      : "Tidak apa-apa merasa sedih. Beri dirimu waktu dan jangan memaksakan diri untuk segera ceria.";
  }

  if (mood === "Cemas") {
    return intensity >= 4
      ? "Kalau terasa sangat berat, coba dekati seseorang yang membuatmu merasa aman. Kamu tidak harus menghadapi semuanya sendirian."
      : "Coba berhenti sejenak dan perhatikan apa yang ada di sekitarmu. Kamu boleh mengambil satu langkah kecil.";
  }

  return intensity >= 4
    ? "Kamu boleh beristirahat dan meminta bantuan untuk hal yang terasa berat. Tidak semuanya harus kamu tanggung sendiri."
    : "Mungkin kamu butuh jeda. Minum air, beristirahat, atau kurangi kegiatan sejenak jika memungkinkan.";
}

moodForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedMood) {
    showToast("Pilih emoji mood kamu terlebih dahulu 💜");
    return;
  }

  const entry = {
    id: Date.now(),
    mood: selectedMood,
    emoji: selectedEmoji,
    intensity: Number(moodIntensity.value),
    reason: $("#mood-reason").value,
    date: new Date().toISOString()
  };

  const history = loadData("moodora-moods");
  history.unshift(entry);

  if (!saveData("moodora-moods", history.slice(0, 30))) return;

  const result = $("#mood-result");
  result.replaceChildren();

  const title = document.createElement("h3");
  title.textContent = `${entry.emoji} Your mood matters.`;

  const message = document.createElement("p");
  message.textContent = getMoodMessage(entry.mood, entry.intensity);

  const detail = document.createElement("p");
  detail.className = "result-action";
  detail.textContent =
    `Mood: ${entry.mood} · Intensitas ${entry.intensity}/5 · Faktor: ${entry.reason}`;

  result.append(title, message, detail);
  result.hidden = false;

  renderMoodHistory();
  showToast("Check-in kamu tersimpan ✦");
});

function renderMoodHistory() {
  const container = $("#mood-history");
  const history = loadData("moodora-moods");

  container.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada check-in. Yuk, mulai dengan satu perasaan hari ini.";
    container.append(empty);
    return;
  }

  history.slice(0, 5).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const emoji = document.createElement("span");
    emoji.className = "history-emoji";
    emoji.textContent = entry.emoji;

    const detail = document.createElement("div");
    detail.className = "history-detail";

    const title = document.createElement("b");
    title.textContent = entry.mood;

    const date = document.createElement("small");
    const parsedDate = new Date(entry.date);
    date.textContent =
      `${parsedDate.toLocaleDateString("id-ID")} · Intensitas ${entry.intensity}/5`;

    detail.append(title, date);
    item.append(emoji, detail);
    container.append(item);
  });
}

renderMoodHistory();

// =========================================
// 6. SELF-CHECK / REFLEKSI DIRI
// =========================================

// Pertanyaan refleksi, bukan instrumen diagnosis klinis.
const quizQuestions = [
  {
    question: "Bagaimana perasaanmu akhir-akhir ini?",
    description: "Pikirkan beberapa hari terakhir.",
    options: [
      "Cukup baik dan stabil",
      "Kadang naik, kadang turun",
      "Lebih sering merasa berat",
      "Sulit menjelaskan perasaanku"
    ]
  },
  {
    question: "Bagaimana kualitas tidurmu?",
    description: "Tidak harus sempurna.",
    options: [
      "Cukup nyaman",
      "Sedikit berubah dari biasanya",
      "Sering terganggu",
      "Aku sangat kesulitan tidur atau beristirahat"
    ]
  },
  {
    question: "Bagaimana energimu menjalani aktivitas?",
    description: "Sekolah, rumah, hobi, atau kegiatan harian.",
    options: [
      "Masih punya cukup energi",
      "Kadang cepat lelah",
      "Sering merasa kehabisan energi",
      "Aktivitas terasa sangat sulit dilakukan"
    ]
  },
  {
    question: "Seberapa mudah kamu menikmati hal yang disukai?",
    description: "Contohnya musik, bermain, atau bertemu teman.",
    options: [
      "Masih bisa menikmatinya",
      "Kadang terasa biasa saja",
      "Belakangan ini lebih sulit",
      "Aku hampir tidak menikmati apa pun"
    ]
  },
  {
    question: "Saat menghadapi masalah, bagaimana biasanya kamu merespons?",
    description: "Pilih yang paling mendekati pengalamanmu.",
    options: [
      "Bisa memikirkan langkah berikutnya",
      "Butuh waktu untuk menenangkan diri",
      "Sering merasa kewalahan",
      "Sulit mengetahui harus berbuat apa"
    ]
  },
  {
    question: "Seberapa didukung kamu oleh orang di sekitarmu?",
    description: "Kamu boleh menjawab dengan jujur.",
    options: [
      "Aku punya seseorang yang bisa diajak bicara",
      "Ada seseorang, tapi sulit untuk mulai bercerita",
      "Aku belum yakin siapa yang bisa dipercaya",
      "Aku merasa sendirian menghadapi ini"
    ]
  }
];

let quizIndex = 0;
let quizAnswers = Array(quizQuestions.length).fill(null);

const quizQuestion = $("#quiz-question");
const quizOptions = $("#quiz-options");
const quizNext = $("#quiz-next");
const quizBack = $("#quiz-back");

function renderQuiz() {
  const question = quizQuestions[quizIndex];

  $("#quiz-count").textContent =
    `Pertanyaan ${quizIndex + 1} dari ${quizQuestions.length}`;

  $("#quiz-progress").style.width =
    `${((quizIndex + 1) / quizQuestions.length) * 100}%`;

  quizQuestion.replaceChildren();
  quizOptions.replaceChildren();

  const title = document.createElement("h2");
  title.textContent = question.question;

  const description = document.createElement("p");
  description.textContent = question.description;

  quizQuestion.append(title, description);

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";

    if (quizAnswers[quizIndex] === index) {
      button.classList.add("selected");
    }

    const marker = document.createElement("span");
    marker.className = "option-marker";
    marker.textContent = quizAnswers[quizIndex] === index ? "✓" : "";

    const text = document.createElement("span");
    text.textContent = option;

    button.append(marker, text);

    button.addEventListener("click", () => {
      quizAnswers[quizIndex] = index;
      renderQuiz();
    });

    quizOptions.append(button);
  });

  quizBack.disabled = quizIndex === 0;
  quizNext.disabled = quizAnswers[quizIndex] === null;
  quizNext.textContent =
    quizIndex === quizQuestions.length - 1
      ? "Lihat refleksi ✦"
      : "Selanjutnya →";
}

quizBack.addEventListener("click", () => {
  if (quizIndex > 0) {
    quizIndex--;
    renderQuiz();
  }
});

quizNext.addEventListener("click", () => {
  if (quizAnswers[quizIndex] === null) return;

  if (quizIndex < quizQuestions.length - 1) {
    quizIndex++;
    renderQuiz();
    return;
  }

  showQuizResult();
});

function showQuizResult() {
  const result = $("#quiz-result");
  result.replaceChildren();

  const answered = quizAnswers.filter((value) => value !== null).length;

  const title = document.createElement("h3");
  title.textContent = "Terima kasih sudah meluangkan waktu 💜";

  const message = document.createElement("p");
  message.textContent =
    "Jawabanmu tidak menentukan diagnosis atau tingkat kesehatan mental. " +
    "Gunakan refleksi ini untuk mengenali hal yang mungkin kamu butuhkan.";

  const detail = document.createElement("p");
  detail.className = "result-action";

  const difficultAnswers = quizAnswers.filter(
    (answer) => answer === 2 || answer === 3
  ).length;

  if (difficultAnswers >= 3) {
    detail.textContent =
      "Beberapa jawabanmu menunjukkan bahwa ada hal yang mungkin terasa berat. " +
      "Pertimbangkan untuk bercerita kepada orang tepercaya atau tenaga profesional, " +
      "terutama jika hal ini berlangsung lama atau mengganggu aktivitasmu.";
  } else {
    detail.textContent =
      "Coba pikirkan satu kebutuhan kecil yang bisa kamu penuhi hari ini. " +
      "Jika ternyata kamu sedang kesulitan, kamu tetap berhak mencari dukungan.";
  }

  const support = document.createElement("button");
  support.type = "button";
  support.className = "btn btn-primary result-action";
  support.textContent = "Lihat pilihan dukungan →";
  support.addEventListener("click", () => navigateTo("support"));

  result.append(title, message, detail, support);
  result.hidden = false;

  quizQuestion.hidden = true;
  quizOptions.hidden = true;
  $(".quiz-actions").hidden = true;
  $("#quiz-count").textContent = `${answered} jawaban selesai`;

  showToast("Kamu sudah menyelesaikan refleksi ✦");
}

renderQuiz();

// =========================================
// 7. CALM CORNER — BREATHING TIMER
// =========================================

const breathCircle = $("#breath-circle");
const breathPhase = $("#breath-phase");
const breathTitle = $("#breath-title");
const breathDescription = $("#breath-description");
const breathTimer = $("#breath-timer");
const breathStart = $("#breath-start");

let breathInterval = null;
let breathStartedAt = 0;
let breathRemaining = 60;
let breathRunning = false;
let breathPhaseTimeout = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateBreathTimer() {
  breathTimer.textContent = formatTime(breathRemaining);
}

function setBreathPhase(phase, text, description) {
  breathCircle.classList.remove("inhale", "hold", "exhale");

  if (phase) breathCircle.classList.add(phase);

  breathPhase.textContent = text;
  breathTitle.textContent = text;
  breathDescription.textContent = description;
}

function scheduleBreathPhase() {
  clearTimeout(breathPhaseTimeout);

  if (!breathRunning) return;

  // Pola lembut: tarik 4 detik, jeda 2 detik,
  // embuskan 4 detik. Tidak perlu menahan napas
  // jika terasa tidak nyaman.
  setBreathPhase(
    "inhale",
    "Tarik napas...",
    "Tarik perlahan selama sekitar 4 detik, sesuai kenyamanan."
  );

  breathPhaseTimeout = setTimeout(() => {
    if (!breathRunning) return;

    setBreathPhase(
      "hold",
      "Jeda sejenak",
      "Biarkan tubuhmu rileks. Kamu boleh melewati jeda ini."
    );

    breathPhaseTimeout = setTimeout(() => {
      if (!breathRunning) return;

      setBreathPhase(
        "exhale",
        "Emb uskan perlahan...".replace("Emb uskan", "Embuskan"),
        "Emb uskan napas secara lembut, tanpa memaksakan diri.".replace("Emb uskan", "Embuskan")
      );

      breathPhaseTimeout = setTimeout(() => {
        if (breathRunning) scheduleBreathPhase();
      }, 4000);
    }, 2000);
  }, 4000);
}

function stopBreathing(finished = false) {
  breathRunning = false;
  clearInterval(breathInterval);
  clearTimeout(breathPhaseTimeout);

  breathInterval = null;
  breathPhaseTimeout = null;

  breathCircle.classList.remove("inhale", "hold", "exhale");
  breathStart.textContent = "Start again ✦";

  if (finished) {
    setBreathPhase(
      "",
      "You did it. 💜",
      "Sesi selesai. Perhatikan bagaimana tubuhmu terasa sekarang."
    );
    showToast("Kamu sudah mengambil jeda untuk diri sendiri.");
  } else {
    setBreathPhase(
      "",
      "Let's take it slow.",
      "Cari posisi yang nyaman. Kamu boleh berhenti kapan saja."
    );
  }
}

breathStart.addEventListener("click", () => {
  if (breathRunning) {
    stopBreathing();
    return;
  }

  breathRunning = true;
  breathRemaining = 60;
  breathStartedAt = Date.now();

  breathStart.textContent = "Pause session";
  updateBreathTimer();
  scheduleBreathPhase();

  breathInterval = setInterval(() => {
    // Berdasarkan waktu nyata agar timer tidak meleset
    // terlalu jauh ketika browser menunda interval.
    const elapsed = Math.floor((Date.now() - breathStartedAt) / 1000);
    breathRemaining = Math.max(0, 60 - elapsed);
    updateBreathTimer();

    if (breathRemaining <= 0) {
      stopBreathing(true);
    }
  }, 250);
});

$("#breath-reset").addEventListener("click", () => {
  stopBreathing();
  breathRemaining = 60;
  updateBreathTimer();
  breathStart.textContent = "Start breathing ✦";
  showToast("Timer diatur ulang.");
});

updateBreathTimer();

// =========================================
// 8. TINY RESET ACTIVITIES
// =========================================

const resetContent = {
  grounding: {
    title: "Come back to the present 🌱",
    intro: "Pelan-pelan, perhatikan lingkunganmu. Tidak perlu terburu-buru.",
    steps: [
      "Sebutkan 5 hal yang bisa kamu lihat.",
      "Sebutkan 4 hal yang bisa kamu rasakan melalui sentuhan.",
      "Sebutkan 3 hal yang bisa kamu dengar.",
      "Sebutkan 2 hal yang bisa kamu cium.",
      "Sebutkan 1 hal yang bisa kamu rasakan atau syukuri saat ini."
    ]
  },
  gratitude: {
    title: "A little thing that matters 🌷",
    intro: "Tidak perlu mencari sesuatu yang besar. Hal kecil juga berarti.",
    steps: [
      "Apa satu hal kecil yang membuat harimu sedikit lebih baik?",
      "Siapa orang yang pernah membuatmu merasa dihargai?",
      "Apa satu hal yang ingin kamu apresiasi dari dirimu sendiri?"
    ]
  },
  kindness: {
    title: "Talk to yourself like a friend 🫶",
    intro: "Bayangkan temanmu mengalami hal yang sama. Apa yang akan kamu katakan kepadanya?",
    steps: [
      "Kamu tidak harus sempurna untuk layak dihargai.",
      "Beristirahat bukan berarti kamu gagal.",
      "Kamu boleh meminta bantuan dan mengambil waktu untuk dirimu sendiri."
    ]
  }
};

$$("[data-reset]").forEach((button) => {
  button.addEventListener("click", () => {
    const content = resetContent[button.dataset.reset];
    const result = $("#reset-result");

    result.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = content.title;

    const intro = document.createElement("p");
    intro.textContent = content.intro;

    const list = document.createElement("div");
    list.className = "grounding-list";

    content.steps.forEach((step, index) => {
      const row = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      const text = document.createElement("span");
      text.textContent = step;

      row.append(checkbox, text);
      list.append(row);
    });

    result.append(title, intro, list);
    result.hidden = false;

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

// =========================================
// 9. MY JOURNAL
// =========================================

const journalForm = $("#journal-form");
const journalContent = $("#journal-content");
const journalCounter = $("#journal-counter");

journalContent.addEventListener("input", () => {
  journalCounter.textContent = `${journalContent.value.length} / 5000`;
});

journalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("#journal-title").value.trim();
  const content = journalContent.value.trim();
  const mood = $("#journal-mood").value;

  if (!title || !content) {
    showToast("Isi judul dan catatanmu terlebih dahulu.");
    return;
  }

  const entries = loadData("moodora-journal");

  entries.unshift({
    id: Date.now(),
    title,
    mood,
    content,
    date: new Date().toISOString()
  });

  if (!saveData("moodora-journal", entries.slice(0, 100))) return;

  journalForm.reset();
  journalCounter.textContent = "0 / 5000";

  renderJournal();
  showToast("Catatanmu tersimpan di browser ✦");
});

function renderJournal() {
  const container = $("#journal-list");
  const entries = loadData("moodora-journal");

  container.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada catatan. Kamu bisa mulai kapan saja.";
    container.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "journal-entry";

    const mood = document.createElement("span");
    mood.className = "entry-mood";
    mood.textContent = entry.mood.split(" ")[0];

    const title = document.createElement("h3");
    title.textContent = entry.title;

    const date = document.createElement("time");
    date.textContent = new Date(entry.date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    const content = document.createElement("p");
    content.className = "entry-content";
    content.textContent = entry.content;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "entry-delete";
    remove.textContent = "Hapus catatan";

    remove.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Hapus catatan ini secara permanen dari browser?"
      );

      if (!confirmed) return;

      const updated = loadData("moodora-journal")
        .filter((item) => item.id !== entry.id);

      if (!saveData("moodora-journal", updated)) return;

      renderJournal();
      showToast("Catatan telah dihapus dari browser.");
    });

    card.append(mood, title, date, content, remove);
    container.append(card);
  });
}

renderJournal();

// =========================================
// 10. SMALL STEPS CHECKLIST
// =========================================

const dailySteps = [
  {
    id: "water",
    emoji: "💧",
    title: "Minum air yang cukup",
    description: "Mulai dengan segelas air."
  },
  {
    id: "rest",
    emoji: "🌙",
    title: "Ambil jeda dari layar",
    description: "Sisihkan beberapa menit untuk beristirahat."
  },
  {
    id: "move",
    emoji: "🌿",
    title: "Gerakkan tubuh sebentar",
    description: "Peregangan ringan jika kamu nyaman."
  },
  {
    id: "connect",
    emoji: "🫂",
    title: "Terhubung dengan seseorang",
    description: "Sapa teman atau orang yang kamu percaya."
  },
  {
    id: "kind",
    emoji: "💜",
    title: "Berikan apresiasi kepada diri sendiri",
    description: "Ingat satu hal kecil yang sudah kamu usahakan."
  }
];

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `moodora-steps-${year}-${month}-${day}`;
}

function renderSteps() {
  const container = $("#steps-list");
  const saved = loadData(todayKey(), []);
  container.replaceChildren();

  dailySteps.forEach((step) => {
    const checked = saved.includes(step.id);

    const label = document.createElement("label");
    label.className = `step-item${checked ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;

    const emoji = document.createElement("span");
    emoji.className = "step-emoji";
    emoji.textContent = step.emoji;

    const copy = document.createElement("div");

    const title = document.createElement("b");
    title.textContent = step.title;

    const description = document.createElement("small");
    description.textContent = step.description;

    copy.append(title, description);
    label.append(checkbox, emoji, copy);
    container.append(label);

    checkbox.addEventListener("change", () => {
      let progress = loadData(todayKey(), []);

      if (checkbox.checked) {
        if (!progress.includes(step.id)) progress.push(step.id);
      } else {
        progress = progress.filter((id) => id !== step.id);
      }

      if (!saveData(todayKey(), progress)) return;

      label.classList.toggle("completed", checkbox.checked);
      updateStepsProgress();
    });
  });

  updateStepsProgress();
}

function updateStepsProgress() {
  const saved = loadData(todayKey(), []);
  const count = saved.length;
  const percentage = Math.round((count / dailySteps.length) * 100);

  $("#steps-progress-text").textContent =
    `${count} of ${dailySteps.length} completed`;

  $("#steps-percent").textContent = `${percentage}%`;

  const circle = $("#steps-circle");
  circle.style.background =
    `conic-gradient(from 0deg, rgba(180,154,255,${percentage / 100}) ${percentage}%, transparent ${percentage}%)`;

  circle.classList.remove("updated");
  void circle.offsetWidth;
  circle.classList.add("updated");

  if (count === dailySteps.length) {
    showToast("Semua langkah kecil hari ini selesai! ✨");
  }
}

$("#steps-reset").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset checklist hari ini?"
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(todayKey());
    renderSteps();
    showToast("Checklist hari ini sudah direset.");
  } catch (error) {
    showToast("Tidak dapat mereset checklist.");
  }
});

renderSteps();

// =========================================
// 11. INITIALIZE
// =========================================

console.log("✳ Moodora berhasil dijalankan!");
