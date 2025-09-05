// ================== CONFIG ==================
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
let DRIVE_FOLDER_ID = null;

// ================== MODE ==================
let mode = null; // "device" or "google"
let data = JSON.parse(localStorage.getItem("mydata")) || { folders: {}, notes: [], files: [] };
let currentPath = [];
let cards = []; // google drive items

// ================== UI ==================
const cardContainer = document.getElementById("cardContainer");
const toolbar = document.getElementById("toolbar");

// Note modal
const noteModal = document.getElementById("noteModal");
const closeNoteModal = document.getElementById("closeNoteModal");
const noteText = document.getElementById("noteText");
const saveNoteBtn = document.getElementById("saveNoteBtn");

let editingNoteIndex = null;
let editingNoteId = null;

// ================== INIT ==================
document.getElementById("deviceBtn").onclick = () => {
  mode = "device";
  document.getElementById("loginSection").style.display = "none";
  toolbar.style.display = "block";
  renderCards();
};

document.getElementById("googleBtn").onclick = () => {
  mode = "google";
  gapi.load("client:auth2", initClient);
};

// ================== GOOGLE DRIVE ==================
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    scope: SCOPES
  }).then(() => {
    return gapi.auth2.getAuthInstance().signIn();
  }).then(() => {
    console.log("Signed in with Google");
    toolbar.style.display = "block";
    findOrCreateMyDataFolder();
  });
}

function findOrCreateMyDataFolder() {
  gapi.client.drive.files.list({
    q: "name='MyData' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)"
  }).then(res => {
    if (res.result.files.length > 0) {
      DRIVE_FOLDER_ID = res.result.files[0].id;
      listDriveFiles(DRIVE_FOLDER_ID);
    } else {
      gapi.client.drive.files.create({
        resource: { name: "MyData", mimeType: "application/vnd.google-apps.folder" },
        fields: "id"
      }).then(res2 => {
        DRIVE_FOLDER_ID = res2.result.id;
        listDriveFiles(DRIVE_FOLDER_ID);
      });
    }
  });
}

function listDriveFiles(parentId) {
  gapi.client.drive.files.list({
    q: `'${parentId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, parents)"
  }).then(res => {
    cards = res.result.files;
    renderCards();
  });
}

// ================== RENDER ==================
function renderCards() {
  cardContainer.innerHTML = "";

  if (mode === "device") {
    const folder = getCurrentDeviceFolder();

    // Folders
    Object.keys(folder.folders).forEach(name => {
      const card = createCard("📁 " + name, () => openFolder(name));
      addMenu(card, name, "folder");
      cardContainer.appendChild(card);
    });

    // Notes
    folder.notes.forEach((note, i) => {
      const card = createCard("📝 " + (note.slice(0, 15) + (note.length > 15 ? "..." : "")), () => openNote(i));
      addMenu(card, i, "note");
      cardContainer.appendChild(card);
    });

    // Files
    folder.files.forEach((f, i) => {
      const card = createCard("📂 " + f, null);
      addMenu(card, i, "file");
      cardContainer.appendChild(card);
    });
  }

  if (mode === "google") {
    cards.forEach(item => {
      let icon = "📂";
      if (item.mimeType === "application/vnd.google-apps.folder") icon = "📁";
      if (item.mimeType === "text/plain") icon = "📝";

      const card = createCard(icon + " " + item.name, () => {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          listDriveFiles(item.id);
        } else if (item.mimeType === "text/plain") {
          openDriveNote(item.id);
        }
      });

      addMenu(card, item.id, item.mimeType.includes("folder") ? "folder" : item.mimeType === "text/plain" ? "note" : "file", true);
      cardContainer.appendChild(card);
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

function addMenu(card, id, type, isDrive=false) {
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
      if (isDrive) handleDriveAction(action, id, type);
      else handleDeviceAction(action, id, type);
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

// ================== DEVICE ACTIONS ==================
function saveDeviceData() {
  localStorage.setItem("mydata", JSON.stringify(data));
}
function getCurrentDeviceFolder() {
  let folder = data;
  for (const f of currentPath) folder = folder.folders[f];
  return folder;
}

function handleDeviceAction(action, id, type) {
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

// ================== DRIVE ACTIONS ==================
function handleDriveAction(action, fileId, type) {
  if (action === "Rename") {
    const newName = prompt("New name:");
    if (!newName) return;
    gapi.client.drive.files.update({ fileId, resource: { name: newName } }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }

  if (action === "Delete") {
    gapi.client.drive.files.delete({ fileId }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }

  if (action === "Copy") {
    gapi.client.drive.files.copy({ fileId }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }

  if (action === "Move") {
    const target = prompt("Target folder ID:");
    if (!target) return;
    gapi.client.drive.files.get({ fileId, fields: "parents" }).then(res => {
      const oldParents = res.result.parents.join(",");
      gapi.client.drive.files.update({
        fileId,
        addParents: target,
        removeParents: oldParents,
        fields: "id, parents"
      }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
    });
  }
}

// ================== NOTES ==================
function createNote() {
  if (mode === "device") {
    const text = prompt("Note text:");
    if (!text) return;
    getCurrentDeviceFolder().notes.push(text);
    saveDeviceData();
    renderCards();
  } else {
    const text = prompt("Note text:");
    if (!text) return;
    const fileMetadata = { name: "Note.txt", parents: [DRIVE_FOLDER_ID], mimeType: "text/plain" };
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const body =
      delimiter + "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(fileMetadata) +
      delimiter + "Content-Type: text/plain\r\n\r\n" +
      text + close_delim;

    gapi.client.request({
      path: "/upload/drive/v3/files",
      method: "POST",
      params: { uploadType: "multipart" },
      headers: { "Content-Type": "multipart/related; boundary=" + boundary },
      body: body
    }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }
}

function openNote(index) {
  editingNoteIndex = index;
  noteText.value = getCurrentDeviceFolder().notes[index];
  noteModal.style.display = "block";
}
function openDriveNote(fileId) {
  editingNoteId = fileId;
  gapi.client.drive.files.get({ fileId, alt: "media" }).then(res => {
    noteText.value = res.body;
    noteModal.style.display = "block";
  });
}

saveNoteBtn.onclick = () => {
  if (mode === "device" && editingNoteIndex !== null) {
    getCurrentDeviceFolder().notes[editingNoteIndex] = noteText.value;
    saveDeviceData();
    renderCards();
  } else if (mode === "google" && editingNoteId) {
    fetch("https://www.googleapis.com/upload/drive/v3/files/" + editingNoteId + "?uploadType=media", {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + gapi.auth.getToken().access_token,
        "Content-Type": "text/plain"
      },
      body: noteText.value
    }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }
  closeNote();
};

function closeNote() {
  noteModal.style.display = "none";
  editingNoteIndex = null;
  editingNoteId = null;
}
closeNoteModal.onclick = closeNote;

// ================== FOLDERS & FILES ==================
function createFolder() {
  const name = prompt("Folder name:");
  if (!name) return;

  if (mode === "device") {
    getCurrentDeviceFolder().folders[name] = { folders: {}, notes: [], files: [] };
    saveDeviceData();
    renderCards();
  } else {
    gapi.client.drive.files.create({
      resource: { name, mimeType: "application/vnd.google-apps.folder", parents: [DRIVE_FOLDER_ID] },
      fields: "id"
    }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }
}

function uploadFile() {
  const name = prompt("File name:");
  if (!name) return;

  if (mode === "device") {
    getCurrentDeviceFolder().files.push(name);
    saveDeviceData();
    renderCards();
  } else {
    const fileMetadata = { name, parents: [DRIVE_FOLDER_ID] };
    gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: "id"
    }).then(() => listDriveFiles(DRIVE_FOLDER_ID));
  }
                                     }
