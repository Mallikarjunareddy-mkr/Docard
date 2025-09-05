const deviceBtn = document.getElementById("deviceBtn");
const googleBtn = document.getElementById("googleBtn");
const app = document.getElementById("app");
const welcome = document.querySelector(".welcome");
const storageTypeEl = document.getElementById("storageType");
const cardContainer = document.getElementById("cardContainer");
const addCardBtn = document.getElementById("addCardBtn");
const searchBox = document.getElementById("searchBox");

let mode = null;
let cards = [];
let DRIVE_FOLDER_ID = null;

// ========= LOCAL STORAGE MODE =========
deviceBtn.onclick = () => {
  mode = "device";
  welcome.style.display = "none";
  app.style.display = "block";
  storageTypeEl.innerText = "📂 Stored in Device";
  loadDeviceData();
  renderCards();
};

function loadDeviceData() {
  cards = JSON.parse(localStorage.getItem("MyData")) || [];
}
function saveDeviceData() {
  localStorage.setItem("MyData", JSON.stringify(cards));
}

// ========= GOOGLE DRIVE MODE =========
googleBtn.onclick = () => {
  mode = "google";
  gapi.load("client:auth2", initGoogle);
};

function initGoogle() {
  gapi.client.init({
    apiKey: "YOUR_API_KEY",
    clientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    scope: "https://www.googleapis.com/auth/drive.file"
  }).then(() => {
    return gapi.auth2.getAuthInstance().signIn();
  }).then(() => {
    welcome.style.display = "none";
    app.style.display = "block";
    storageTypeEl.innerText = "☁️ Google Drive";
    findOrCreateDriveFolder();
  });
}

function findOrCreateDriveFolder() {
  gapi.client.drive.files.list({
    q: "name='MyData' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)"
  }).then(res => {
    if (res.result.files && res.result.files.length > 0) {
      DRIVE_FOLDER_ID = res.result.files[0].id;
      listDriveFiles();
    } else {
      gapi.client.drive.files.create({
        resource: { name: "MyData", mimeType: "application/vnd.google-apps.folder" },
        fields: "id"
      }).then(resp => {
        DRIVE_FOLDER_ID = resp.result.id;
        listDriveFiles();
      });
    }
  });
}

function listDriveFiles() {
  gapi.client.drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: "files(id, name)"
  }).then(res => {
    cards = res.result.files.map(f => ({ id: f.id, name: f.name }));
    renderCards();
  });
}

function createDriveCard(name) {
  gapi.client.drive.files.create({
    resource: { name, mimeType: "application/vnd.google-apps.folder", parents: [DRIVE_FOLDER_ID] },
    fields: "id, name"
  }).then(res => {
    cards.push({ id: res.result.id, name: res.result.name });
    renderCards();
  });
}

// ========= COMMON UI =========
function renderCards() {
  cardContainer.innerHTML = "";
  cards.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerText = c.name;
    cardContainer.appendChild(card);
  });
}

addCardBtn.onclick = () => {
  const name = prompt("Enter new card name:");
  if (!name) return;

  if (mode === "device") {
    cards.push({ name, files: [] });
    saveDeviceData();
    renderCards();
  } else if (mode === "google") {
    createDriveCard(name);
  }
};

searchBox.oninput = e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".card").forEach((el, i) => {
    el.style.display = cards[i].name.toLowerCase().includes(term) ? "block" : "none";
  });
};
