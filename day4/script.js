// ---------- Select the elements ----------
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// ---------- Constants ----------
const MAX_CHARS = 200;
const WARNING_AT = 180;
const DRAFT_KEY = "draft";
const THEME_KEY = "theme";



// ---------- Update the counters ----------
function updateCounts() {
  const text = noteText.value;
  const length = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

      charCount.textContent = `${length} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  charCount.classList.remove("warning", "over");
  if (length > MAX_CHARS) {
    charCount.classList.add("over");
  } else if (length > WARNING_AT) {
    charCount.classList.add("warning");
  }
}

// ---------- Save the draft ----------
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

// ---------- React to typing ----------
noteText.addEventListener("input", function () {
  updateCounts();
  saveDraft();
});

// ---------- Restore saved state on page load ----------
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

applyTheme(localStorage.getItem(THEME_KEY) === "dark");
updateCounts();

// ---------- Clear ----------
function clearNote() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
}

clearBtn.addEventListener("click", clearNote);

noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearNote();
  }
});

// ---------- Theme toggle ----------
themeToggle.addEventListener("click", function () {
  const goingDark = !document.body.classList.contains("dark");
  applyTheme(goingDark);
  localStorage.setItem(THEME_KEY, goingDark ? "dark" : "light");
});