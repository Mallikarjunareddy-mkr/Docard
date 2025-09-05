let mode = null; // "device" or "google"
let data = null;
let currentPath = [];
let drivePath = [];
let DRIVE_FOLDER_ID = null;
let cards = [];

const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// Note modal
const noteModal = document.getElementById("noteModal");
const closeNoteModal = document.getElementById("closeNoteModal");
const noteText = document.getElementById("noteText");
const saveNoteBtn = document.getElementById("saveNoteBtn");
let editingNoteIndex = null;

// ---------- INIT MODES ----------
function initDevice() {
  mode = "device";
  document.getElementById("modeSelect").style.display = "none";
  document.getElementById("toolbar").style.display = "block";
  data = JSON.parse(localStorage.getItem("mydata")) || { folders: {}, notes: [], files: [] };
  renderCards();
}

function initGoogle() {
  mode = "google";
  document.getElementById("modeSelect").style.display = "none";
  document.getElementById("toolbar").style.display = "block";
  gapi.load("client:auth2", initClient);
}

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    scope: SCOPES
  }).then(() => {
    gapi.auth2.getAuthInstance().signIn().then(user => {
      console.log("Signed in as " + user.getBasicProfile().getEmail());
      ensureMyDataFolder();
    });
  });
}

function ensureMyDataFolder() {
  gapi.client.drive.files.list({
    q: "name='MyData' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)"
  }).then(res => {
    if (res.result.files.length > 0) {
      DRIVE_FOLDER_ID = res.result.files[0].id;
      listDriveFiles(DRIVE_FOLDER_ID);
    } else {
      gapi.client.drive.files.create({
        resource: { name: "MyData", mimeType: "application/vnd.google-apps.folder" }
      }).then(res => {
        DRIVE_FOLDER_ID = res.result.id;
        listDriveFiles(DRIVE_FOLDER_ID);
      });
    }
  });
}

// ---------- DEVICE MODE ----------
function saveDeviceData() {
  localStorage.setItem("mydata", JSON.stringify(data));
}

function getCurrentDeviceFolder() {
  let folder = data;
  for (const f of currentPath) folder = folder.folders[f];
  return folder;
}

// ---------- RENDER ----------
function renderCards() {
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";

  if (mode === "device") {
    const folder = getCurrentDeviceFolder();

    Object.keys(folder.folders).forEach(name => {
      const card = createCard("📁 " + name, () => openFolder(name));
      addMenu(card, name, "folder");
      container.appendChild(card);
    });

    folder.notes.forEach((note, i) => {
      const card = createCard("📝 " + (note.slice(0, 15) + (note.length > 15 ? "..." : "")), () => openNote(i));
      addMenu(card, i, "note");
      container.appendChild(card);
    });

    folder.files.forEach((f, i) => {
      const card = createCard("📂 " + f, null);
      addMenu(card, i, "file");
      container.appendChild(card);
    });
  }

  if (mode === "google") {
    cards.forEach(item => {
      const icon = item.mimeType === "application/vnd.google-apps.folder" ? "📁" :
                   item.mimeType === "text/plain" ? "📝" : "📂";
      const card = createCard(icon + " " + item.name, () => {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          listDriveFiles(item.id);
        } else if (item.mimeType === "text/plain") {
          openDriveNote(item.id);
        }
      });
      container.appendChild(card);
    });
  }
}

function createCard(text, onclick) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerText = text;
  if (onclick) div.onclick = onclick;
  return div;
}

// ---------- DEVICE ACTIONS ----------
function createFolder() {
  if (mode === "device") {
    const name = prompt("Folder name:");
    if (!name) return;
    getCurrentDeviceFolder().folders[name] = { folders: {}, notes: [], files: [] };
    saveDeviceData();
    renderCards();
  }
}

function createNote() {
  if (mode === "device") {
    const text = prompt("Note text:");
    if (!text) return;
    getCurrentDeviceFolder().notes.push(text);
    saveDeviceData();
    renderCards();
  }
}

function uploadFile() {
  if (mode === "device") {
    const name = prompt("File name:");
    if (!name) return;
    getCurrentDeviceFolder().files.push(name);
    saveDeviceData();
    renderCards();
  }
}

function openFolder(name) {
  currentPath.push(name);
  renderCards();
}

function openNote(index) {
  editingNoteIndex = index;
  noteText.value = getCurrentDeviceFolder().notes[index];
  noteModal.style.display = "block";
}

saveNoteBtn.onclick = () => {
  if (mode === "device" && editingNoteIndex !== null) {
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

// ---------- DRIVE ----------
function listDriveFiles(parentId) {
  if (!drivePath.includes(parentId)) drivePath.push(parentId);

  gapi.client.drive.files.list({
    q: `'${parentId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, parents)"
  }).then(res => {
    cards = res.result.files;
    renderCards();
  });
}

function openDriveNote(fileId) {
  gapi.client.drive.files.get({
    fileId: fileId,
    alt: "media"
  }).then(res => {
    noteText.value = res.body;
    noteModal.style.display = "block";
    editingNoteIndex = fileId;
  });
}

saveNoteBtn.onclick = () => {
  if (mode === "device" && editingNoteIndex !== null) {
    getCurrentDeviceFolder().notes[editingNoteIndex] = noteText.value;
    saveDeviceData();
    renderCards();
  } else if (mode === "google" && editingNoteIndex) {
    gapi.client.request({
      path: `/upload/drive/v3/files/${editingNoteIndex}`,
      method: "PATCH",
      params: { uploadType: "media" },
      body: noteText.value
    }).then(() => {
      console.log("Note updated in Drive");
      listDriveFiles(drivePath[drivePath.length - 1]);
    });
  }
  closeNote();
};

// ---------- NAVIGATION ----------
function goBack() {
  if (mode === "device") {
    if (currentPath.length > 0) {
      currentPath.pop();
      renderCards();
    }
  } else if (mode === "google") {
    if (drivePath.length > 1) {
      drivePath.pop();
      listDriveFiles(drivePath[drivePath.length - 1]);
    } else {
      listDriveFiles(DRIVE_FOLDER_ID);
    }
  }
                                              }
