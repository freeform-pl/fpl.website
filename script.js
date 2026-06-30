/* ============================================================
   FPL blog interactions
   - media placeholders (dashed slot until the file exists)
   - binary + freeform preference widgets (each with a synced scrubber)
   - steerability widget (bowl picker → prompt + video)
   - compositionality widget (peg × speed → scatter + video)
   - bibtex copy
   ============================================================ */

// ---------- media placeholders ----------
// Every .media-frame shows its dashed placeholder until the video/img
// actually loads. Swap real files into media/ and the slots fill in.

function watchMedia(frame) {
  const el = frame.querySelector("video, img");
  if (!el) return;
  const markLoaded = () => frame.classList.add("loaded");
  const markMissing = () => frame.classList.remove("loaded");
  if (el.tagName === "VIDEO") {
    el.addEventListener("loadeddata", markLoaded);
    el.addEventListener("error", markMissing);
    if (el.readyState >= 2) markLoaded();
  } else {
    el.addEventListener("load", markLoaded);
    el.addEventListener("error", markMissing);
    if (el.complete && el.naturalWidth > 0) markLoaded();
  }
}

document.querySelectorAll(".media-frame").forEach(watchMedia);

// ---------- task-band videos: autoplay + loop, nonstop ----------
// Muted autoplay can still be blocked (autoplay policy, Low Power Mode), so we
// force play on canplay, replay if paused, retry on the first user interaction,
// and (re)start each clip when it scrolls into view.
const bandVideos = [...document.querySelectorAll(".task-band video, .compose-cell video")];
const playBand = () => bandVideos.forEach((v) => { v.muted = true; v.play().catch(() => {}); });
bandVideos.forEach((v) => {
  v.muted = true;
  v.loop = true;
  v.addEventListener("canplay", () => v.play().catch(() => {}));
  v.addEventListener("loadeddata", () => v.play().catch(() => {}));
  v.addEventListener("pause", () => v.play().catch(() => {}));
});
playBand();
["pointerdown", "touchstart", "keydown", "scroll"].forEach((evt) =>
  window.addEventListener(evt, playBand, { once: true, passive: true })
);
if ("IntersectionObserver" in window) {
  const bandIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); }),
    { threshold: 0.15 }
  );
  bandVideos.forEach((v) => bandIO.observe(v));
}

// Helper to (re)point a video at a file and refresh its placeholder text.
function setVideo(video, placeholder, src, emoji = "🎬") {
  const frame = video.closest(".media-frame");
  frame.classList.remove("loaded");
  placeholder.innerHTML = `${emoji} video<br/><code>${src}</code>`;
  video.src = src;
  video.load();
  video.play().catch(() => {}); // autoplay is best-effort
}

// ---------- synchronized trajectory scrubber ----------
// One slider scrubs both trajectory videos together; the play button runs both
// in sync. Their durations differ slightly, so B's playbackRate is normalized
// to A's timeline so the pair starts and ends together. Reusable across widgets.

function setupScrubber(aId, bId, scrubId, playId) {
  const A = document.getElementById(aId);
  const B = document.getElementById(bId);
  const scrub = document.getElementById(scrubId);
  const play = document.getElementById(playId);
  if (!A || !B || !scrub || !play) return;

  let scrubbing = false;

  // Both clips play at real time (1×) and start together. If one is shorter, it
  // ends and freezes on its last frame while the longer one keeps going. The
  // slider tracks real elapsed time, so it spans the longer of the two clips.
  const maxDur = () => Math.max(A.duration || 0, B.duration || 0);
  const elapsed = () => Math.max(A.currentTime, B.currentTime);

  const seekBoth = (t) => { // t in seconds; clamp each clip to its own length
    if (A.duration) A.currentTime = Math.min(t, A.duration);
    if (B.duration) B.currentTime = Math.min(t, B.duration);
  };
  const setPlaying = (on) => { play.textContent = on ? "❚❚" : "▶"; };

  scrub.addEventListener("input", () => {
    scrubbing = true;
    A.pause();
    B.pause();
    setPlaying(false);
    seekBoth((scrub.value / 1000) * maxDur());
  });
  scrub.addEventListener("change", () => { scrubbing = false; });

  play.addEventListener("click", () => {
    if (play.textContent === "▶") {
      A.playbackRate = 1;
      B.playbackRate = 1;
      const md = maxDur();
      if (md && elapsed() >= md - 0.05) seekBoth(0); // restart when at the end
      A.play();
      B.play();
      setPlaying(true);
    } else {
      A.pause();
      B.pause();
      setPlaying(false);
    }
  });

  const onTime = () => {
    if (scrubbing) return;
    const md = maxDur();
    if (md) scrub.value = (elapsed() / md) * 1000;
  };
  A.addEventListener("timeupdate", onTime);
  B.addEventListener("timeupdate", onTime);

  // loop the pair only once the LONGER clip finishes (the shorter just freezes)
  const onEnded = () => {
    const md = maxDur();
    if (md && elapsed() >= md - 0.05) {
      const wasPlaying = play.textContent === "❚❚";
      seekBoth(0);
      if (wasPlaying) { A.play(); B.play(); }
    }
  };
  A.addEventListener("ended", onEnded);
  B.addEventListener("ended", onEnded);
}

setupScrubber("traj-a-bin", "traj-b-bin", "scrub-bin", "play-bin");
setupScrubber("traj-a-fpl", "traj-b-fpl", "scrub-fpl", "play-fpl");

// ---------- binary preference UI ----------
// A single "overall" verdict — and a note on why that one bit is ambiguous.

const binaryChoice = document.getElementById("binary-choice");
const binarySummary = document.getElementById("binary-summary");

if (binaryChoice && binarySummary) {
  binaryChoice.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      binaryChoice.querySelectorAll("button").forEach((b) => b.classList.toggle("picked", b === btn));
      binarySummary.innerHTML =
        `<span class="badge thin">Just one bit — but A is faster yet knocks the cup over, while B is slower and cleaner. A single “overall” label can't capture that.</span>`;
    });
  });
}

// ---------- freeform preference UI ----------
// A few axes are filled in by default; the reader can remove any of them or add
// their own in natural language via the "+ Add label" field.

const prefPanel = document.getElementById("pref-panel");
const prefSummary = document.getElementById("pref-summary");

const DEFAULT_AXES = [
  { name: "Speed", hint: "which finished sooner?" },
  { name: "Cup safety", hint: "which kept the cup upright?" },
  { name: "Small plate placement", hint: "which placed the small plate more correctly?" },
];

let freeformAxes = DEFAULT_AXES.map((a) => ({ ...a }));
const prefPicks = {}; // axis name -> "A" | "B"

function axisRow(axis, name, hint, removable) {
  return `
    <div class="pref-axis">
      <span class="axis-name">${name}${hint ? `<small>${hint}</small>` : ""}</span>
      <span class="pref-controls">
        <span class="pref-choice" data-axis="${axis}">
          <button data-pick="A">A</button><button data-pick="B">B</button>
        </span>
        ${removable ? `<button class="axis-remove" data-remove="${axis}" title="remove axis" aria-label="remove ${name}">×</button>` : ""}
      </span>
    </div>`;
}

function renderPref() {
  prefPanel.innerHTML =
    `<div class="pref-q">Score each axis you care about</div>` +
    freeformAxes.map((a) => axisRow(a.name, a.name, a.hint, true)).join("") +
    `<div class="pref-add">
      <input type="text" id="pref-add-input" maxlength="40"
             placeholder="Add your own axis in natural language, e.g. “gentleness”" />
      <button id="pref-add-btn">+ Add label</button>
    </div>`;
  wirePref();
  updatePrefSummary();
}

function wirePref() {
  prefPanel.querySelectorAll(".pref-choice").forEach((group) => {
    const axis = group.dataset.axis;
    group.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("picked", prefPicks[axis] === btn.dataset.pick);
      btn.addEventListener("click", () => {
        prefPicks[axis] = btn.dataset.pick;
        group.querySelectorAll("button").forEach((b) => b.classList.toggle("picked", b === btn));
        updatePrefSummary();
      });
    });
  });

  prefPanel.querySelectorAll(".axis-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const axis = btn.dataset.remove;
      freeformAxes = freeformAxes.filter((a) => a.name !== axis);
      delete prefPicks[axis];
      renderPref();
    });
  });

  const input = document.getElementById("pref-add-input");
  const addBtn = document.getElementById("pref-add-btn");
  if (input && addBtn) {
    const add = () => {
      const name = input.value.trim();
      if (!name) return;
      if (!freeformAxes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
        freeformAxes.push({ name });
      }
      renderPref();
      document.getElementById("pref-add-input")?.focus(); // keep typing the next one
    };
    addBtn.addEventListener("click", add);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); add(); }
    });
  }
}

function updatePrefSummary() {
  const n = freeformAxes.filter((a) => prefPicks[a.name]).length;
  prefSummary.innerHTML =
    n === 0
      ? `<span class="badge rich">label as many axes as you like — add your own, too</span>`
      : `<span class="badge rich">${n} axis label${n > 1 ? "s" : ""} from one comparison — denser, less ambiguous, and 1.85× faster per label</span>`;
}

if (prefPanel) renderPref();

// ---------- side-by-side comparisons ----------
// The cube task is bowl-conditioned, so its files carry the target bowl:
//   cube:   media/compare/cube_<method>_<bowl>.mp4   (bowl ∈ orange|blue|yellow)
//   others: media/compare/<task>_<method>.mp4

const cmp = {
  task: "toast",
  baseline: "single_pref",
  bowl: "orange",
  video: { baseline: document.getElementById("cmp-baseline"), fpl: document.getElementById("cmp-fpl") },
  ph: { baseline: document.getElementById("cmp-baseline-ph"), fpl: document.getElementById("cmp-fpl-ph") },
};

const cmpBowls = document.getElementById("cmp-bowls");
const compareWidget = document.getElementById("compare-widget");
const cmpCaption = document.getElementById("cmp-caption");

const CMP_CAPTIONS = {
  toast: "FPL learns to maximize the reward of plating and hygiene by using the spatula, while single preferences only maximize the reward of plating and don't use the spatula to plate.",
  table: "FPL learns to maximize the reward of plating all the items without making them fall and placing them in the correct position, while single preferences don't place the small plate in the correct placement.",
  shorts: "FPL learns to make a higher-quality fold than when learning from single binary preferences.",
  cube: "FPL places the cube in whichever bowl is commanded, while single preferences place it near-randomly.",
};

function cmpSrc(method) {
  return cmp.task === "cube"
    ? `media/compare/cube_${method}_${cmp.bowl}.mp4`
    : `media/compare/${cmp.task}_${method}.mp4`;
}

function updateCompare() {
  cmpBowls.hidden = cmp.task !== "cube";
  if (cmpCaption) cmpCaption.textContent = CMP_CAPTIONS[cmp.task] || "";
  setVideo(cmp.video.baseline, cmp.ph.baseline, cmpSrc(cmp.baseline));
  setVideo(cmp.video.fpl, cmp.ph.fpl, cmpSrc("fpl"));
}

document.querySelectorAll("#compare-widget .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("#compare-widget .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    cmp.task = tab.dataset.task;
    updateCompare();
  });
});

document.querySelectorAll(".cmp-base-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cmp-base-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    cmp.baseline = btn.dataset.method;
    updateCompare();
  });
});

cmpBowls.querySelectorAll(".band-bowl").forEach((btn) => {
  btn.addEventListener("click", () => {
    cmpBowls.querySelectorAll(".band-bowl").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    cmp.bowl = btn.dataset.bowl;
    updateCompare();
  });
});

// Defer loading the (large) comparison videos until the widget is near the
// viewport — otherwise they download on page load and starve the task band.
if ("IntersectionObserver" in window && compareWidget) {
  let primed = false;
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && !primed) {
      primed = true;
      updateCompare();
      io.disconnect();
    }
  }, { rootMargin: "400px" });
  io.observe(compareWidget);
} else {
  updateCompare();
}

// ---------- steerability: pick a bowl ----------
// Expected files: media/steer/cube_<blue|orange|yellow>.mp4

const steerVideo = document.getElementById("steer-video");
const steerPh = document.getElementById("steer-ph");
const steerPrompt = document.getElementById("steer-prompt");
const BOWLS = ["blue", "orange", "yellow"];

const steerAnim = document.getElementById("steer-anim");
const steerGripper = document.getElementById("steer-gripper");
const steerCube = document.getElementById("steer-cube");
let steerTarget = "orange";
let steerDropTimer = null;

function animateGripper(target) {
  const bowl = steerAnim.querySelector(`.steer-bowl[data-bowl="${target}"]`);
  if (!bowl) return;
  steerAnim.querySelectorAll(".steer-bowl").forEach((b) => b.classList.toggle("target", b === bowl));
  const animBox = steerAnim.getBoundingClientRect();
  const bowlBox = bowl.getBoundingClientRect();
  const x = bowlBox.left - animBox.left + bowlBox.width / 2 - steerGripper.offsetWidth / 2;
  clearTimeout(steerDropTimer);
  steerCube.classList.remove("drop");
  steerGripper.style.transform = `translateX(${x}px)`;
  steerDropTimer = setTimeout(() => steerCube.classList.add("drop"), 750);
}

function updateSteer(target) {
  steerTarget = target;
  steerPrompt.innerHTML = BOWLS.map((b) => {
    const val = b === target ? "2.0" : b === "yellow" ? "-0.3" : "-0.5";
    const style = b === target ? ' style="font-weight:700"' : "";
    return `${b[0].toUpperCase() + b.slice(1)} bowl: <span class="pv"${style}>${val}</span>`;
  }).join(", ");
  steerPrompt.classList.remove("flash");
  void steerPrompt.offsetWidth; // restart the highlight animation
  steerPrompt.classList.add("flash");
  animateGripper(target);
  setVideo(steerVideo, steerPh, `media/steer/cube_${target}.mp4`);
}

window.addEventListener("resize", () => animateGripper(steerTarget));

document.querySelectorAll(".bowl-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bowl-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    updateSteer(btn.dataset.bowl);
  });
});

updateSteer("orange");

// ---------- compositionality: peg × speed ----------
// All four sim clips (media/<slow|fast>_<left|right>.mp4) play at once; the cell
// matching the selected peg×speed is focused, the rest dimmed.

const composeState = { peg: "right", speed: "fast" };
const composeCells = [...document.querySelectorAll(".compose-cell")];
const composeStatus = document.getElementById("compose-status");

// interactive Fig. 4 (real rollout data extracted from the paper figure):
// the commanded-behavior star moves to the matching cluster at the commanded
// speed; on right+fast the dashed "no training data" zone lights up and the
// FPL + single-preference evaluation rollouts fade in
const composeMarker = document.getElementById("compose-marker");
const composeGap = document.getElementById("compose-gap");
const composeResults = document.getElementById("compose-results");
const composeSpark = document.getElementById("compose-spark");
let sparkAnimation = null;

const CLUSTERS = {
  left_slow: [162, 85],
  left_fast: [162, 218],
  right_slow: [348, 91],
  right_fast: [348, 212],
};

function animateChart(peg, speed) {
  const [x, y] = CLUSTERS[`${peg}_${speed}`];
  const travelMs = speed === "fast" ? 600 : 1900;
  composeMarker.style.transition = `transform ${travelMs}ms ease-in-out`;
  composeMarker.style.transform = `translate(${x}px, ${y}px)`;

  const novel = peg === "right" && speed === "fast";
  composeGap.classList.toggle("lit", novel);
  composeResults.classList.toggle("show", novel);
  sparkAnimation?.cancel();
  if (novel) {
    composeSpark.setAttribute("transform", `translate(${x + 38}, ${y - 28})`);
    sparkAnimation = composeSpark.animate(
      [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
      { duration: 1400, iterations: Infinity, delay: travelMs }
    );
  }
}

function updateCompose() {
  const { peg, speed } = composeState;
  const novel = peg === "right" && speed === "fast";
  composeStatus.innerHTML = novel
    ? '<span class="badge">✨ zero demonstrations of this combo — FPL composes it from the axes</span>'
    : '<span class="badge in-data">this combination exists in the training data</span>';
  animateChart(peg, speed);
  composeCells.forEach((c) => {
    c.classList.toggle("active", c.dataset.peg === peg && c.dataset.speed === speed);
    // restart every clip from the beginning so they play in sync on each click
    const vid = c.querySelector("video");
    if (vid) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    }
  });
}

document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const { group, val } = btn.dataset;
    document.querySelectorAll(`.seg-btn[data-group="${group}"]`).forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    composeState[group] = val;
    updateCompose();
  });
});

updateCompose();

// ---------- reward-signal interactive ----------
// Scrub demo_20; a vertical playhead tracks the same normalized time across both
// reward charts. Chart plot area spans viewBox x = 46 .. 468 (see SVG generator).

(function () {
  const v = document.getElementById("reward-video");
  const scrub = document.getElementById("reward-scrub");
  const play = document.getElementById("reward-play");
  const phF = document.getElementById("reward-ph-fpl");
  const phB = document.getElementById("reward-ph-bin");
  if (!v || !scrub || !play) return;

  const PX0 = 46, PX1 = 468;
  let scrubbing = false;

  const setPlayhead = (frac) => {
    const x = PX0 + frac * (PX1 - PX0);
    [phF, phB].forEach((ph) => { if (ph) { ph.setAttribute("x1", x); ph.setAttribute("x2", x); } });
  };
  const setPlaying = (on) => { play.textContent = on ? "❚❚" : "▶"; };

  v.addEventListener("timeupdate", () => {
    if (!v.duration) return;
    const frac = v.currentTime / v.duration;
    if (!scrubbing) scrub.value = frac * 1000;
    setPlayhead(frac);
  });

  scrub.addEventListener("input", () => {
    scrubbing = true;
    v.pause();
    setPlaying(false);
    const frac = scrub.value / 1000;
    if (v.duration) v.currentTime = frac * v.duration;
    setPlayhead(frac);
  });
  scrub.addEventListener("change", () => { scrubbing = false; });

  play.addEventListener("click", () => {
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  });

  v.addEventListener("ended", () => { v.currentTime = 0; v.play().catch(() => {}); });

  setPlayhead(0);

  // FPL axis selection: focus one curve, dim the rest (they still show)
  const rlines = [...document.querySelectorAll(".rline")];
  const rlegends = [...document.querySelectorAll(".rlegend")];
  function selectAxis(slug) {
    rlines.forEach((l) => {
      const on = l.dataset.axis === slug;
      l.style.opacity = on ? "1" : "0.16";
      l.style.strokeWidth = on ? "2.6" : "1.4";
    });
    rlegends.forEach((b) => b.classList.toggle("active", b.dataset.axis === slug));
  }
  rlegends.forEach((b) => b.addEventListener("click", () => selectAxis(b.dataset.axis)));
  if (rlegends.length) selectAxis("big_plate"); // default focus
})();

// ---------- bibtex copy ----------

document.getElementById("copy-bib").addEventListener("click", async (e) => {
  const text = document.getElementById("bib-text").innerText;
  try {
    await navigator.clipboard.writeText(text);
    e.target.textContent = "copied!";
    setTimeout(() => (e.target.textContent = "copy"), 1500);
  } catch {
    e.target.textContent = "select + ⌘C";
  }
});

// ---------- color theme toggle (warm ⇄ blue) ----------
(function () {
  const KEY = "fpl-theme";
  const btns = [...document.querySelectorAll("#theme-toggle button")];
  if (!btns.length) return;
  function apply(t) {
    document.documentElement.setAttribute("data-theme", t);
    btns.forEach((b) => b.classList.toggle("active", b.dataset.setTheme === t));
    try { localStorage.setItem(KEY, t); } catch (e) {}
  }
  btns.forEach((b) => b.addEventListener("click", () => apply(b.dataset.setTheme)));
  apply("blue"); // toggle is occluded; force the blue palette as default
})();
