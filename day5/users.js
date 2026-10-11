// ---------- Select the elements ----------
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

// ---------- State ----------
const USERS_URL = "https://jsonplaceholder.typicode.com/users";
let allUsers = [];

// ---------- Draw a list of users ----------
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  for (const user of list) {
    const item = document.createElement("li");
    item.textContent = `${user.name} - ${user.email} - ${user.address.city} - ${user.company.name}`;
    usersList.appendChild(item);
  }
}

// ---------- Load users from the API ----------
async function loadUsers() {
  loadBtn.disabled = true;
  statusEl.textContent = "Loading users...";

  try {
    const response = await fetch(USERS_URL);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    allUsers = await response.json();
    renderUsers(allUsers);
    statusEl.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    statusEl.textContent = `Error: could not load users. ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", loadUsers);

// ---------- Filter the stored users ----------
filterInput.addEventListener("input", function () {
  const search = filterInput.value.trim().toLowerCase();

  const matches = allUsers.filter(user =>
    user.name.toLowerCase().includes(search)
  );

  renderUsers(matches);
});