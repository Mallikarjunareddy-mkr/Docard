// Device storage
let data = JSON.parse(localStorage.getItem("mydata")) || { folders: {}, notes: [], files: [] };
let currentPath = [];

// Note modal
const noteModal = document.getElementById("noteModal");
const closeNoteModal = document.getElementById("closeNoteModal");
const noteText = document.getElementById("noteText");
const saveNoteBtn = document.getElementById("saveNoteBtn");

let editingNoteIndex = null;

function saveDeviceData() {
  localStorage.setItem("mydata", JSON.stringify(data));
}

function getCurrentDeviceFolder() {
  let folder = data;
  for (const f of currentPath) folder = folder.folders[f];
  return folder;
}

// Render cards
function renderCards() {
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";

  const folder = getCurrentDeviceFolder();

  // Folders
  Object.keys(folder.folders).forEach(name => {
    const card = createCard("📁 " + name, () => openFolder(name));
    addMenu(card, name, "folder");
    container.appendChild(card);
  });

  // Notes
  folder.notes.forEach((note, i) => {
    const card = createCard("📝 " + (note.slice(0, 15) + (note.length > 15 ? "..." : "")), () => openNote(i));
    addMenu(card, i, "note");
    container.appendChild(card);
  });

  // Files
  folder.files.forEach((f, i) => {
    const card = createCard("📂 " + f, null);
    addMenu(card, i, "file");
    container.appendChild(card);
  });
}

function createCard(text, onclick) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerText = text;
  if (onclick) div.onclick = onclick;
  return div;
}

function addMenu(card, id, type) {
  const menuBtn = document.createElement("span");
  menuBtn.className = "menuBtn";
  menuBtn.innerText = "⋮";

  const menu = document.createElement("div");
  menu.className = "menu";

  ["Rename", "Delete", "Copy", "Move"].forEach(action => {
    const btn = document.createElement("button");
    btn.innerText = action;
    btn.onclick = (e) => {
      e.stopPropagation();
      handleAction(action, id, type);
      menu.style.display = "none";
    };
    menu.appendChild(btn);
  });

  menuBtn.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };

  card.appendChild(menuBtn);
  card.appendChild(menu);
}

function handleAction(action, id, type) {
  const folder = getCurrentDeviceFolder();

  if (action === "Rename") {
    const newName = prompt("New name:");
    if (!newName) return;

    if (type === "folder") {
      folder.folders[newName] = folder.folders[id];
      delete folder.folders[id];
    } else if (type === "note") {
      folder.notes[id] = newName;
    } else if (type === "file") {
      folder.files[id] = newName;
    }
  }

  if (action === "Delete") {
    if (type === "folder") delete folder.folders[id];
    else if (type === "note") folder.notes.splice(id, 1);
    else if (type === "file") folder.files.splice(id, 1);
  }

  if (action === "Copy") {
    if (type === "folder") folder.folders[id + "_copy"] = JSON.parse(JSON.stringify(folder.folders[id]));
    else if (type === "note") folder.notes.push(folder.notes[id] + " (copy)");
    else if (type === "file") folder.files.push(folder.files[id] + "_copy");
  }

  if (action === "Move") {
    const target = prompt("Move to folder name:");
    if (target && folder.folders[target]) {
      if (type === "folder") {
        folder.folders[target].folders[id] = folder.folders[id];
        delete folder.folders[id];
      } else if (type === "note") {
        folder.folders[target].notes.push(folder.notes[id]);
        folder.notes.splice(id, 1);
      } else if (type === "file") {
        folder.folders[target].files.push(folder.files[id]);
        folder.files.splice(id, 1);
      }
    } else {
      alert("Target folder not found!");
    }
  }

  saveDeviceData();
  renderCards();
}

// Create
function createFolder() {
  const name = prompt("Folder name:");
  if (!name) return;
  getCurrentDeviceFolder().folders[name] = { folders: {}, notes: [], files: [] };
  saveDeviceData();
  renderCards();
}

function createNote() {
  const text = prompt("Note text:");
  if (!text) return;
  getCurrentDeviceFolder().notes.push(text);
  saveDeviceData();
  renderCards();
}

function uploadFile() {
  const name = prompt("File name:");
  if (!name) return;
  getCurrentDeviceFolder().files.push(name);
  saveDeviceData();
  renderCards();
}

// Folder navigation
function openFolder(name) {
  currentPath.push(name);
  renderCards();
}

// Notes
function openNote(index) {
  editingNoteIndex = index;
  noteText.value = getCurrentDeviceFolder().notes[index];
  noteModal.style.display = "block";
}

saveNoteBtn.onclick = () => {
  if (editingNoteIndex !== null) {
    getCurrentDeviceFolder().notes[editingNoteIndex] = noteText.value;
    saveDeviceData();
    renderCards();
  }
  closeNote();
};

function closeNote() {
  noteModal.style.display = "none";
  editingNoteIndex = null;
}

closeNoteModal.onclick = closeNote;

// Initial render
renderCards();
