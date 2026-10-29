"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // MOODORA - JAVASCRIPT UTAMA
  // ========================================

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const KEYS = {
    moods: "moodora_moods_v1",
    journal: "moodora_journal_v1",
    garden: "moodora_garden_v1",
    letters: "moodora_letters_v1",
    steps: "moodora_steps_v1"
  };

  function load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      toast("Penyimpanan browser tidak tersedia.");
      return false;
    }
  }

  let moods = load(KEYS.moods, []);
  let journals = load(KEYS.journal, []);
  let gardenCount = Number(load(KEYS.garden, 0)) || 0;
  let letters = load(KEYS.letters, []);
  let savedSteps = load(KEYS.steps, []);

  if (!Array.isArray(moods)) moods = [];
  if (!Array.isArray(journals)) journals = [];
  if (!Array.isArray(letters)) letters = [];
  if (!Array.isArray(savedSteps)) savedSteps = [];

  const moodNames = {
    senang: "Senang",
    tenang: "Tenang",
    biasa: "Biasa saja",
    cemas: "Cemas",
    sedih: "Sedih",
    lelah: "Lelah"
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showFeedback(id, message, error = false) {
    const element = $("#" + id);
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("is-error", error);
    element.classList.toggle("is-success", !error && !!message);
  }

  function toast(message) {
    const container = $("#toast-container");
    if (!container) {
      console.info(message);
      return;
    }

    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    item.setAttribute("role", "status");
    container.appendChild(item);

    requestAnimationFrame(() => item.classList.add("show"));

    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 300);
    }, 3000);
  }

  function formatDate(value, withTime = true) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Tanggal tidak diketahui";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(withTime ? {
        hour: "2-digit",
        minute: "2-digit"
      } : {})
    }).format(date);
  }

  function today() {
    const date = new Date();
    const local = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 10);
  }

  // ========================================
  // NAVIGASI DAN ANIMASI
  // ========================================

  const year = $("#current-year");
  if (year) year.textContent = new Date().getFullYear();

  const menuToggle = $("#menu-toggle");
  const navMenu = $("#nav-menu");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      const opened = navMenu.classList.toggle("is-open");

      menuToggle.setAttribute("aria-expanded", String(opened));
      menuToggle.setAttribute(
        "aria-label",
        opened ? "Tutup navigasi" : "Buka navigasi"
      );
    });

    $$(".nav-menu a").forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if ("IntersectionObserver" in window) {
    const sections = $$(".nav-link")
      .map(link => $(link.getAttribute("href")))
      .filter(Boolean);

    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        $$(".nav-link").forEach(link => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === "#" + entry.target.id
          );
        });
      });
    }, {
      rootMargin: "-25% 0px -65% 0px"
    });

    sections.forEach(section => navObserver.observe(section));

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const elements = $$(".feature-card, .panel, .support-card, .section-heading");

      elements.forEach(element => element.classList.add("reveal-on-scroll"));

      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      elements.forEach(element => revealObserver.observe(element));
    }
  }

  // Efek 3D ringan pada kartu hero.
  const heroVisual = $(".hero-visual");
  const heroCard = $(".visual-card-main");

  if (
    heroVisual &&
    heroCard &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    heroVisual.addEventListener("pointermove", event => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      heroCard.style.transform =
        `perspective(900px) rotateX(${(0.5 - y) * 9}deg) ` +
        `rotateY(${(x - 0.5) * 9}deg) translateY(-3px)`;
    });

    heroVisual.addEventListener("pointerleave", () => {
      heroCard.style.transform = "";
    });
  }

  // ========================================
  // MOOD CHECK-IN
  // ========================================

  const moodForm = $("#mood-form");
  const intensity = $("#mood-intensity");
  const intensityValue = $("#intensity-value");

  function updateIntensity() {
    if (!intensity || !intensityValue) return;

    const value = Number(intensity.value);

    intensityValue.value = `${value} / 5`;
    intensityValue.textContent = `${value} / 5`;
    intensityValue.setAttribute("aria-label", `Intensitas ${value} dari 5`);

    intensity.style.setProperty(
      "--range-progress",
      `${((value - 1) / 4) * 100}%`
    );
  }

  if (intensity) {
    intensity.addEventListener("input", updateIntensity);
    intensity.addEventListener("change", updateIntensity);
    updateIntensity();
  }

  if (moodForm) {
    moodForm.addEventListener("submit", event => {
      event.preventDefault();

      const data = new FormData(moodForm);
      const mood = String(data.get("mood") || "");
      const value = Number(data.get("intensity") || 3);
      const factors = data.getAll("factors").map(String);
      const note = String(data.get("note") || "").trim();

      if (!mood) {
        showFeedback("mood-result", "Pilih mood terlebih dahulu.", true);
        return;
      }

      const entry = {
        id: Date.now().toString(),
        mood,
        intensity: value,
        factors,
        note,
        createdAt: new Date().toISOString()
      };

      const previous = moods;
      moods = [entry, ...moods].slice(0, 250);

      if (!save(KEYS.moods, moods)) {
        moods = previous;
        return;
      }

      const messages = {
        senang: "Nikmati hal baik yang sedang kamu rasakan.",
        tenang: "Beri dirimu ruang untuk menikmati ketenangan ini.",
        biasa: "Merasa biasa saja juga valid.",
        cemas: "Coba ambil jeda dan fokus pada satu hal yang bisa kamu kendalikan.",
        sedih: "Kamu tidak harus buru-buru menghilangkan rasa sedih.",
        lelah: "Jika memungkinkan, beri dirimu waktu untuk beristirahat."
      };

      let message = messages[mood];

      if (value >= 4 && ["cemas", "sedih", "lelah"].includes(mood)) {
        message += " Kamu boleh berbagi dengan seseorang yang kamu percaya.";
      }

      showFeedback(
        "mood-result",
        `Mood ${moodNames[mood]} (${value}/5) berhasil disimpan. ${message}`
      );

      toast("Mood check-in berhasil disimpan.");
      renderConstellation();
    });
  }

  // ========================================
  // REFLEKSI DIRI: 10 PERTANYAAN
  // ========================================

  const questions = [
    "Seberapa sering kamu kehilangan minat pada kegiatan yang biasanya kamu sukai?",
    "Seberapa sering kamu merasa sedih, kosong, atau putus asa?",
    "Seberapa sering kamu merasa cemas atau sulit menghentikan pikiran yang berputar?",
    "Seberapa sering kamu sulit tidur atau merasa lelah?",
    "Seberapa sering perasaanmu membuat sekolah atau hubungan dengan orang lain terasa sulit?",
    "Seberapa sering kamu kesulitan berkonsentrasi?",
    "Seberapa sering kamu merasa kewalahan oleh tugas atau ekspektasi?",
    "Seberapa sering kamu merasa kesepian atau tidak punya seseorang untuk diajak bicara?",
    "Seberapa sering kamu merasa tidak cukup baik atau menyalahkan diri sendiri?",
    "Seberapa sering kamu merasa tidak aman dengan dirimu sendiri atau terpikir menyakiti diri?"
  ];

  const frequencies = [
    "Nggak pernah",
    "Beberapa hari",
    "Lebih dari separuh hari",
    "Hampir setiap hari"
  ];

  let questionIndex = 0;
  let answers = Array(10).fill(null);

  const intro = $("#questionnaire-intro");
  const questionnaire = $("#questionnaire-form");
  const questionContainer = $("#question-container");
  const questionBack = $("#question-back");
  const questionNext = $("#question-next");
  const questionSubmit = $("#question-submit");
  const reflectionResult = $("#reflection-result");

  function renderQuestion() {
    if (!questionContainer) return;

    const index = questionIndex;

    questionContainer.innerHTML = `
      <fieldset class="question-card form-group">
        <legend class="question-title">
          ${index + 1}. ${escapeHTML(questions[index])}
        </legend>

        <div class="answer-options">
          ${frequencies.map((label, value) => `
            <label class="answer-option">
              <input
                type="radio"
                name="question-${index}"
                value="${value}"
                ${answers[index] === value ? "checked" : ""}
                required
              >
              <span>${label}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;

    $("#question-counter").textContent =
      `Pertanyaan ${index + 1} dari 10`;

    const percent = Math.round((index + 1) / 10 * 100);

    $("#question-percentage").textContent = `${percent}%`;
    $("#question-progress-fill").style.width = `${percent}%`;
    $("#question-progress").setAttribute("aria-valuenow", index + 1);

    questionBack.disabled = index === 0;
    questionNext.hidden = index === 9;
    questionSubmit.hidden = index !== 9;

    showFeedback("question-error", "");
  }

  function currentAnswer() {
    const selected = $(
      `input[name="question-${questionIndex}"]:checked`,
      questionContainer
    );

    return selected ? Number(selected.value) : null;
  }

  function storeAnswer() {
    const value = currentAnswer();

    if (value === null) {
      showFeedback(
        "question-error",
        "Pilih salah satu jawaban sebelum melanjutkan.",
        true
      );
      return false;
    }

    answers[questionIndex] = value;
    return true;
  }

  $("#start-questionnaire")?.addEventListener("click", () => {
    intro.hidden = true;
    questionnaire.hidden = false;
    reflectionResult.hidden = true;
    questionIndex = 0;
    renderQuestion();
  });

  questionNext?.addEventListener("click", () => {
    if (!storeAnswer()) return;

    if (questionIndex < 9) {
      questionIndex++;
      renderQuestion();
    }
  });

  questionBack?.addEventListener("click", () => {
    const value = currentAnswer();
    if (value !== null) answers[questionIndex] = value;

    if (questionIndex > 0) {
      questionIndex--;
      renderQuestion();
    }
  });

  questionnaire?.addEventListener("submit", event => {
    event.preventDefault();

    if (!storeAnswer()) return;

    if (answers.some(answer => answer === null)) {
      showFeedback("question-error", "Masih ada pertanyaan yang belum dijawab.", true);
      return;
    }

    const scores = answers.slice(0, 9);
    const average = scores.reduce((sum, score) => sum + score, 0) / 9;

    let title;
    let description;

    if (average < 0.75) {
      title = "Perasaanmu tampak relatif stabil belakangan ini.";
      description = "Pengalaman yang ditanyakan tampaknya tidak terlalu sering muncul. Kamu tetap boleh memberi ruang untuk perasaan apa pun yang datang.";
    } else if (average < 1.75) {
      title = "Ada hal yang mungkin sedang membebani.";
      description = "Coba perhatikan situasi yang membuatmu merasa berat. Kamu bisa memulai dengan satu langkah kecil.";
    } else {
      title = "Kamu mungkin membutuhkan dukungan lebih.";
      description = "Beberapa pengalaman ini mungkin cukup sering muncul. Kamu tidak harus menghadapinya sendirian.";
    }

    $("#reflection-result-title").textContent = title;
    $("#reflection-result-description").textContent = description;

    const advice = [];

    if (scores[2] > 0 || scores[6] > 0) {
      advice.push("Pecah tugas menjadi langkah kecil dan ambil jeda ketika pikiran terasa penuh.");
    }

    if (scores[3] > 0) {
      advice.push("Perhatikan kebutuhan istirahat dan buat rutinitas tidur yang realistis.");
    }

    if (scores[7] > 0) {
      advice.push("Cobalah menghubungi seseorang yang kamu percaya.");
    }

    if (scores[8] > 0) {
      advice.push("Coba tulis bagaimana kamu berbicara kepada diri sendiri dengan lebih ramah.");
    }

    if (scores[4] > 0 || scores[5] > 0) {
      advice.push("Jika aktivitas sehari-hari terganggu, kamu boleh meminta bantuan guru BK atau tenaga profesional.");
    }

    if (!advice.length) {
      advice.push("Lanjutkan kebiasaan yang membantumu merawat diri. Kamu tetap boleh mencari dukungan kapan pun dibutuhkan.");
    }

    // Pertanyaan keselamatan tidak dihitung dalam skor.
    if (answers[9] > 0) {
      advice.unshift(
        "PENTING: Jika kamu merasa tidak aman atau terpikir menyakiti diri, segera beri tahu orang dewasa tepercaya dan minta ditemani. Jika ada bahaya langsung, cari bantuan darurat atau fasilitas kesehatan terdekat."
      );
    }

    $("#reflection-advice-list").innerHTML = advice
      .map(item => `<li>${escapeHTML(item)}</li>`)
      .join("");

    questionnaire.hidden = true;
    reflectionResult.hidden = false;
    reflectionResult.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("#restart-questionnaire")?.addEventListener("click", () => {
    answers = Array(10).fill(null);
    questionIndex = 0;
    reflectionResult.hidden = true;
    questionnaire.hidden = true;
    intro.hidden = false;
  });

 // ========================================
  // MOOD GARDEN — INTERACTIVE FLOWERS
  // ========================================

  const gardenVisual = $("#garden-visual");
  const gardenButton = $("#garden-action");

  // Jumlah langkah dan jumlah bunga disimpan terpisah.
  const savedGardenFlowers = load("moodora_garden_flowers_v1", []);
  let gardenFlowers = Array.isArray(savedGardenFlowers)
    ? savedGardenFlowers
    : [];

  const flowerSymbols = ["✿", "❀", "✽", "❋", "✾"];
  const flowerColors = [
    "#8175e8",
    "#ed91bd",
    "#e6b957",
    "#789cf5",
    "#e58db9"
  ];

  // Tambahkan kupu-kupu hanya jika belum ada.
  function prepareGarden() {
    if (!gardenVisual) return;

    if (!gardenVisual.querySelector(".garden-butterfly")) {
      const butterfly = document.createElement("span");
      butterfly.className = "garden-butterfly";
      butterfly.setAttribute("aria-hidden", "true");
      butterfly.textContent = "🦋";
      gardenVisual.appendChild(butterfly);
    }

    if (!gardenVisual.querySelector(".garden-butterfly-two")) {
      const butterfly = document.createElement("span");
      butterfly.className = "garden-butterfly garden-butterfly-two";
      butterfly.setAttribute("aria-hidden", "true");
      butterfly.textContent = "🦋";
      gardenVisual.appendChild(butterfly);
    }
  }

  function renderGardenFlowers() {
    if (!gardenVisual) return;

    // Hapus bunga dinamis lama sebelum menggambar ulang.
    gardenVisual.querySelectorAll(".garden-flower").forEach(flower => {
      flower.remove();
    });

    gardenFlowers.forEach((flower, index) => {
      const plant = document.createElement("span");
      plant.className = "garden-flower";
      plant.setAttribute("aria-hidden", "true");
      plant.textContent = flower.symbol || flowerSymbols[index % flowerSymbols.length];

      // Posisi tersebar di sepanjang bukit.
      plant.style.left = `${8 + (index * 17.3) % 84}%`;
      plant.style.bottom = `${25 + (index * 13) % 48}px`;
      plant.style.color = flower.color || flowerColors[index % flowerColors.length];
      plant.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

      gardenVisual.appendChild(plant);
    });

    gardenVisual.dataset.growth = String(
      Math.min(gardenCount + gardenFlowers.length, 20)
    );

    gardenVisual.classList.toggle(
      "garden-growing",
      gardenCount > 0 || gardenFlowers.length > 0
    );
  }

  function updateGarden() {
    const countElement = $("#garden-count");
    const statusElement = $("#garden-status");
    const messageElement = $("#garden-message");

    if (countElement) countElement.textContent = gardenCount;

    if (statusElement) {
      statusElement.textContent =
        gardenFlowers.length === 0 ? "Siap bertumbuh" :
        gardenFlowers.length < 3 ? "Tunas pertama muncul" :
        gardenFlowers.length < 7 ? "Mulai bermekaran" :
        "Tamanmu terus tumbuh";
    }

    if (messageElement) {
      messageElement.textContent = gardenFlowers.length === 0
        ? "Mulai dengan satu langkah kecil hari ini."
        : `Kamu sudah menumbuhkan ${gardenFlowers.length} bunga. Setiap langkah kecil berarti.`;
    }

    prepareGarden();
    renderGardenFlowers();
  }

  gardenButton?.addEventListener("click", () => {
    const newFlower = {
      symbol: flowerSymbols[Math.floor(Math.random() * flowerSymbols.length)],
      color: flowerColors[Math.floor(Math.random() * flowerColors.length)]
    };

    // Simpan data lama agar bisa dipulihkan jika penyimpanan gagal.
    const previousCount = gardenCount;
    const previousFlowers = [...gardenFlowers];

    gardenCount++;
    gardenFlowers.push(newFlower);

    const countSaved = save(KEYS.garden, gardenCount);
    const flowersSaved = save("moodora_garden_flowers_v1", gardenFlowers);

    if (!countSaved || !flowersSaved) {
      gardenCount = previousCount;
      gardenFlowers = previousFlowers;
      
      gardenFlowers.push({
  symbol: flowerSymbols[
    Math.floor(Math.random() * flowerSymbols.length)
  ],
  color: flowerColors[
    Math.floor(Math.random() * flowerColors.length)
  ]
});

save("moodora_garden_flowers_v1", gardenFlowers);

      // Pulihkan nilai yang masih bisa disimpan.
      save(KEYS.garden, gardenCount);
      save("moodora_garden_flowers_v1", gardenFlowers);

      updateGarden();
      return;
    }

    updateGarden();
    toast("Satu bunga baru tumbuh di tamanmu! 🌷");
  });
  
  // =======================================
  // EMOTION CONSTELLATION
  // ========================================

  function renderConstellation() {
    const empty = $("#constellation-empty");
    const chart = $("#constellation-chart");
    const line = $("#constellation-line");
    const points = $("#constellation-points");

    $("#constellation-count").textContent = `${moods.length} catatan`;

    if (!empty || !chart || !line || !points) return;

    if (!moods.length) {
      empty.hidden = false;
      chart.hidden = true;
      $("#constellation-summary").textContent =
        "Belum ada cukup data untuk melihat pola.";
      return;
    }

    empty.hidden = true;
    chart.hidden = false;

    const data = [...moods].slice(0, 12).reverse();
    const coords = data.map((item, index) => ({
      x: data.length === 1 ? 300 : 30 + index * 540 / (data.length - 1),
      y: 220 - ((Math.max(1, Math.min(5, Number(item.intensity))) - 1) / 4) * 180,
      item
    }));

    line.setAttribute(
      "points",
      coords.map(point => `${point.x},${point.y}`).join(" ")
    );

    points.innerHTML = coords.map(point => `
      <circle
        cx="${point.x}"
        cy="${point.y}"
        r="5"
        class="chart-point"
      >
        <title>
          ${escapeHTML(moodNames[point.item.mood] || point.item.mood)}
          - ${point.item.intensity}/5
        </title>
      </circle>
    `).join("");

    if (moods.length < 3) {
      $("#constellation-summary").textContent =
        "Tambahkan beberapa check-in lagi untuk mengamati pola.";
    } else {
      const avg = moods.reduce(
        (sum, item) => sum + Number(item.intensity || 0), 0
      ) / moods.length;

      $("#constellation-summary").textContent =
        `Rata-rata intensitas: ${avg.toFixed(1)} dari 5. Ini hanya ringkasan catatan.`;
    }
  }

  // ========================================
  // CALM CORNER: LATIHAN NAPAS
  // ========================================

  let breathingTimer = null;
  let breathingActive = false;
  let breathingPhase = 0;

  const breathingPhases = [
    {
      label: "Tarik napas",
      caption: "Tarik napas perlahan, senyamanmu.",
      duration: 4000,
      className: "is-inhaling"
    },
    {
      label: "Embuskan",
      caption: "Embuskan napas dengan lembut.",
      duration: 6000,
      className: "is-exhaling"
    }
  ];

  function stopBreathing() {
    clearTimeout(breathingTimer);
    breathingTimer = null;
    breathingActive = false;

    const visual = $("#breathing-visual");
    visual?.classList.remove(
      "is-inhaling", "is-exhaling", "is-breathing"
    );

    $("#breathing-instruction").textContent = "Siap?";
    $("#breathing-caption").textContent =
      "Ambil posisi yang nyaman sebelum memulai.";

    $("#breathing-start").disabled = false;
  }

  function runBreathing() {
    if (!breathingActive) return;

    const phase = breathingPhases[breathingPhase % 2];
    const visual = $("#breathing-visual");

    visual?.classList.add("is-breathing");
    visual?.classList.toggle("is-inhaling", phase.className === "is-inhaling");
    visual?.classList.toggle("is-exhaling", phase.className === "is-exhaling");

    $("#breathing-instruction").textContent = phase.label;
    $("#breathing-caption").textContent = phase.caption;

    breathingTimer = setTimeout(() => {
      breathingPhase++;
      runBreathing();
    }, phase.duration);
  }

  $("#breathing-start")?.addEventListener("click", () => {
    if (breathingActive) return;

    breathingActive = true;
    breathingPhase = 0;
    $("#breathing-start").disabled = true;
    runBreathing();
  });

  $("#breathing-stop")?.addEventListener("click", stopBreathing);

  // ========================================
  // GROUNDING 5-4-3-2-1
  // ========================================

  const groundingPrompts = [
    "Sebutkan lima hal yang bisa kamu lihat.",
    "Perhatikan empat hal yang bisa kamu rasakan melalui sentuhan.",
    "Dengarkan tiga suara di sekitarmu.",
    "Sadari dua aroma yang bisa kamu cium, jika ada.",
    "Perhatikan satu rasa di mulutmu atau satu hal yang kamu syukuri."
  ];

  let groundingIndex = 0;

  function renderGrounding() {
    $("#grounding-prompt").textContent = groundingPrompts[groundingIndex];
    $("#grounding-step").textContent =
      `Langkah ${groundingIndex + 1} dari 5`;

    $("#grounding-back").disabled = groundingIndex === 0;

    $("#grounding-next").textContent =
      groundingIndex === 4 ? "Selesai" : "Selanjutnya";
  }

  $("#grounding-start")?.addEventListener("click", () => {
    groundingIndex = 0;
    $("#grounding-panel").hidden = false;
    renderGrounding();
  });

  $("#grounding-back")?.addEventListener("click", () => {
    if (groundingIndex > 0) groundingIndex--;
    renderGrounding();
  });

  $("#grounding-next")?.addEventListener("click", () => {
    if (groundingIndex < 4) {
      groundingIndex++;
      renderGrounding();
    } else {
      $("#grounding-panel").hidden = true;
      toast("Latihan grounding selesai. Semoga kamu merasa lebih hadir.");
    }
  });

  // ========================================
  // DAILY JOURNAL
  // ========================================

  const journalForm = $("#journal-form");
  const journalList = $("#journal-list");

  function renderJournal() {
    $("#journal-count").textContent = `${journals.length} catatan`;

    if (!journalList) return;

    if (!journals.length) {
      journalList.innerHTML = `
        <div class="empty-state">
          <span aria-hidden="true">✉</span>
          <h4>Belum ada catatan.</h4>
          <p>Catatan pertamamu bisa dimulai dari satu kalimat sederhana.</p>
        </div>`;
      return;
    }

    journalList.innerHTML = [...journals]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(entry => `
        <article class="journal-entry">
          <div class="journal-entry-header">
            <h4>${escapeHTML(entry.title)}</h4>
            <time>${escapeHTML(formatDate(entry.createdAt))}</time>
          </div>

          ${entry.mood ? `
            <span class="journal-mood-tag">
              ${escapeHTML(moodNames[entry.mood] || entry.mood)}
            </span>` : ""}

          <p>${escapeHTML(entry.content).replace(/\n/g, "<br>")}</p>

          <button
            type="button"
            class="text-link"
            data-delete-journal="${escapeHTML(entry.id)}"
          >Hapus catatan ×</button>
        </article>
      `).join("");
  }

  journalForm?.addEventListener("submit", event => {
    event.preventDefault();

    const title = $("#journal-title").value.trim();
    const content = $("#journal-content").value.trim();
    const mood = $("#journal-mood").value;

    if (!title || !content) {
      showFeedback("journal-feedback", "Isi judul dan catatan terlebih dahulu.", true);
      return;
    }

    const entry = {
      id: Date.now().toString(),
      title,
      content,
      mood,
      createdAt: new Date().toISOString()
    };

    journals.unshift(entry);

    if (!save(KEYS.journal, journals)) {
      journals.shift();
      return;
    }

    journalForm.reset();
    showFeedback("journal-feedback", "Catatan tersimpan di browser ini.");
    renderJournal();
    toast("Journal berhasil disimpan.");
  });

  journalList?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-journal]");
    if (!button) return;

    if (!confirm("Hapus catatan ini?")) return;

    journals = journals.filter(
      item => item.id !== button.dataset.deleteJournal
    );

    save(KEYS.journal, journals);
    renderJournal();
    toast("Catatan dihapus.");
  });

  $("#export-journal")?.addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({
        exportedAt: new Date().toISOString(),
        app: "Moodora",
        journal: journals,
        moods
      }, null, 2)],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `moodora-${today()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast("File ekspor dibuat. Simpan di tempat yang aman.");
  });

  // ========================================
  // INNER WORLD: CERITA INTERAKTIF
  // ========================================

  const stories = [
    {
      title: "Ketika semuanya terasa menumpuk.",
      description: "Besok ada ujian, tugas belum selesai, dan kamu sulit menentukan harus mulai dari mana.",
      options: [
        ["Memaksa menyelesaikan semuanya.", "Mengerjakan semuanya sekaligus bisa membuatmu makin kewalahan. Coba tentukan satu prioritas."],
        ["Memilih satu tugas kecil lebih dulu.", "Memecah tugas menjadi bagian kecil bisa membuat langkah pertama terasa lebih mungkin."],
        ["Berhenti sejenak untuk memahami perasaan.", "Mengambil jeda dapat membantumu mengenali apa yang sedang kamu butuhkan."]
      ]
    },
    {
      title: "Ketika merasa tertinggal dari teman.",
      description: "Kamu melihat pencapaian orang lain dan mulai membandingkannya dengan perjalananmu sendiri.",
      options: [
        ["Terus membandingkan diriku.", "Media sosial sering menunjukkan sebagian kecil dari kehidupan seseorang. Kamu tidak melihat keseluruhan ceritanya."],
        ["Mengingat bahwa setiap orang punya ritme sendiri.", "Perjalananmu tidak harus sama dengan perjalanan orang lain."],
        ["Menulis satu hal yang sudah kupelajari.", "Menghargai perkembangan kecil dapat membantumu melihat perjalananmu sendiri."]
      ]
    },
    {
      title: "Ketika sulit mengatakan tidak.",
      description: "Teman meminta bantuan lagi, sementara kamu sedang lelah dan punya urusan sendiri.",
      options: [
        ["Mengiyakan semuanya.", "Kebutuhanmu juga penting. Kamu tidak harus mengorbankan diri untuk selalu membantu."],
        ["Menjelaskan bahwa aku sedang tidak sanggup.", "Menyampaikan batasan dengan sopan bukan berarti kamu tidak peduli."],
        ["Meminta waktu untuk berpikir.", "Kamu boleh mengambil waktu sebelum memberikan jawaban."]
      ]
    }
  ];

  let storyIndex = 0;

  function renderStory() {
    const story = stories[storyIndex];

    $("#story-category").textContent = `CERITA 0${storyIndex + 1}`;
    $("#story-title").textContent = story.title;
    $("#story-description").textContent = story.description;

    $("#story-options").innerHTML = story.options.map((option, index) => `
      <button type="button" class="story-option" data-choice="${index}">
        ${escapeHTML(option[0])}
      </button>
    `).join("");

    $("#story-options").hidden = false;
    $("#story-result").hidden = true;
  }

  $("#story-options")?.addEventListener("click", event => {
    const button = event.target.closest("[data-choice]");
    if (!button) return;

    const choice = stories[storyIndex].options[Number(button.dataset.choice)];

    $("#story-result-title").textContent = "Coba lihat dari sisi lain.";
    $("#story-result-description").textContent = choice[1];

    $("#story-options").hidden = true;
    $("#story-result").hidden = false;
  });

  $("#story-next")?.addEventListener("click", () => {
    storyIndex = (storyIndex + 1) % stories.length;
    renderStory();
  });

  // ========================================
  // LETTER TO FUTURE SELF
  // ========================================

  const letterDate = $("#letter-date");
  const letterForm = $("#future-letter-form");
  const letterList = $("#letter-list");

  if (letterDate) letterDate.min = today();

  function renderLetters() {
    if (!letterList) return;

    if (!letters.length) {
      letterList.innerHTML =
        "<p class='field-hint'>Belum ada surat untuk dirimu di masa depan.</p>";
      return;
    }

    letterList.innerHTML = [...letters]
      .sort((a, b) => a.openDate.localeCompare(b.openDate))
      .map(letter => {
        const ready = letter.openDate <= today();

        return `
          <article class="letter-entry">
            <h4>Surat untuk ${escapeHTML(formatDate(letter.openDate, false))}</h4>
            <span class="data-badge">
              ${ready ? "Sudah bisa dibuka" : "Untuk masa depan"}
            </span>

            <p>${ready
              ? escapeHTML(letter.content).replace(/\n/g, "<br>")
              : "Pesan ini menunggu tanggal yang kamu pilih."}
            </p>

            <button
              type="button"
              class="text-link"
              data-delete-letter="${escapeHTML(letter.id)}"
            >Hapus surat ×</button>
          </article>
        `;
      }).join("");
  }

  letterForm?.addEventListener("submit", event => {
    event.preventDefault();

    const openDate = letterDate.value;
    const content = $("#letter-content").value.trim();

    if (!openDate || !content) {
      showFeedback("letter-feedback", "Pilih tanggal dan tulis pesanmu.", true);
      return;
    }

    if (openDate < today()) {
      showFeedback("letter-feedback", "Pilih tanggal hari ini atau tanggal mendatang.", true);
      return;
    }

    const letter = {
      id: Date.now().toString(),
      openDate,
      content,
      createdAt: new Date().toISOString()
    };

    letters.push(letter);

    if (!save(KEYS.letters, letters)) {
      letters.pop();
      return;
    }

    letterForm.reset();
    letterDate.min = today();

    showFeedback("letter-feedback", "Suratmu berhasil disimpan.");
    renderLetters();
  });

  letterList?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-letter]");
    if (!button || !confirm("Hapus surat ini?")) return;

    letters = letters.filter(letter => letter.id !== button.dataset.deleteLetter);
    save(KEYS.letters, letters);
    renderLetters();
  });

  // ========================================
  // SMALL STEPS
  // ========================================

  const stepInputs = $$('input[name="small-step"]');

  stepInputs.forEach(input => {
    input.checked = savedSteps.includes(input.value);
  });

  $("#save-small-steps")?.addEventListener("click", () => {
    const selected = stepInputs
      .filter(input => input.checked)
      .map(input => input.value);

    const previous = savedSteps;
    savedSteps = selected;

    if (!save(KEYS.steps, savedSteps)) {
      savedSteps = previous;
      return;
    }

    showFeedback(
      "steps-feedback",
      selected.length
        ? `${selected.length} langkah kecil tersimpan. Kamu tidak harus melakukan semuanya hari ini.`
        : "Kamu belum memilih langkah. Tidak apa-apa, kamu bisa kembali nanti."
    );

    if (selected.length) {
      gardenCount++;
      save(KEYS.garden, gardenCount);
      updateGarden();
    }
  });

  // ========================================
  // HAPUS SELURUH DATA LOKAL
  // ========================================

  $("#delete-local-data")?.addEventListener("click", () => {
    if (!confirm("Hapus semua data Moodora di browser ini? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }

    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    moods = [];
    journals = [];
    gardenCount = 0;
    letters = [];
    savedSteps = [];

    moodForm?.reset();
    journalForm?.reset();
    letterForm?.reset();

    stepInputs.forEach(input => input.checked = false);

    updateIntensity();

    [
      "mood-result",
      "journal-feedback",
      "letter-feedback",
      "steps-feedback"
    ].forEach(id => showFeedback(id, ""));

    renderConstellation();
    renderJournal();
    renderLetters();
    updateGarden();

    showFeedback(
      "privacy-feedback",
      "Data Moodora yang didukung di browser ini telah dihapus."
    );

    toast("Data lokal Moodora telah dihapus.");
  });

  // ========================================
  // TAMPILKAN DATA AWAL
  // ========================================

  updateIntensity();
  updateGarden();
  renderConstellation();
  renderJournal();
  renderLetters();
  renderStory();

  console.info("Moodora berhasil dijalankan.");
});
