let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const CATEGORIES = ["personal", "work", "study"];
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(search));
}

// ---------- Tests: searchNotes ----------
console.log(searchNotes("milk"));              // [ { id: 1, text: "Buy milk and bread", category: "personal" } ]
console.log(searchNotes("JAVASCRIPT").length); // 1 (case is ignored)
console.log(searchNotes("the").length);        // 2 (notes 2 and 3)
console.log(searchNotes("zebra"));             // [] (no results)


function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}
// ---------- Tests: longestNote ----------
console.log(longestNote());   // { id: 3, text: "Email the project report to Grace", category: "work" }

const savedNotes = notes;
notes = [];
console.log(longestNote());   // null (empty array)
notes = savedNotes;

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// ---------- Tests: countByCategory ----------
console.log(countByCategory());   // { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory());   // {} (no notes)
notes = savedNotes;





function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";

  const parts = [];
  for (const category of CATEGORIES) {
    if (counts[category]) {
      parts.push(`${counts[category]} ${category}`);
    }
  }

  if (parts.length === 0) {
    return `${total} ${word}.`;
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// ---------- Tests: getSummary ----------
console.log(getSummary());   // "5 notes: 2 personal, 1 work, 2 study."

notes = [savedNotes[0]];
console.log(getSummary());   // "1 note: 1 personal."

notes = [];
console.log(getSummary());   // "0 notes."
notes = savedNotes;

function normalise(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDuplicate(text) {
  const wanted = normalise(text);
  return notes.some(note => normalise(note.text) === wanted);
}

// ---------- Tests: isDuplicate ----------
console.log(isDuplicate("call mum"));       // true (case ignored)
console.log(isDuplicate("  CALL   MUM  ")); // true (extra spaces ignored)
console.log(isDuplicate("Call dad"));       // false (not in the list)

function addNote(text, category) {
  const cleaned = typeof text === "string" ? text.trim() : "";

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Not added: text must be 1-200 characters.");
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log(`Not added: category must be one of ${CATEGORIES.join(", ")}.`);
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Not added: that note already exists.");
    return false;
  }

  const nextId = notes.length ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  console.log(`Added note ${nextId}.`);
  return true;
}

// ---------- Tests: addNote ----------
console.log(addNote("Water the plants", "personal")); // logs "Added note 6." then true
console.log(addNote("call mum", "personal"));         // logs duplicate reason, then false
console.log(addNote("", "work"));                     // logs length reason, then false
console.log(addNote("x".repeat(201), "work"));        // logs length reason, then false
console.log(addNote("Plan a trip", "fun"));           // logs category reason, then false
console.log(getSummary());                            // "6 notes: 3 personal, 1 work, 2 study."