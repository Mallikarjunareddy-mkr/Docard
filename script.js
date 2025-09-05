let rootKey = "MyData";
let path = [rootKey];
let editingNote = null;

if (!localStorage.getItem(rootKey)) {
  localStorage.setItem(rootKey, JSON.stringify({type:"folder", name:"MyData", children:[]}));
}
render();

function getRoot() { return JSON.parse(localStorage.getItem(rootKey)); }
function saveRoot(root) { localStorage.setItem(rootKey, JSON.stringify(root)); }
function getCurrentFolder() {
  let folder = getRoot();
  for (let i=1;i<path.length;i++) {
    folder = folder.children.find(c => c.name === path[i]);
  }
  return folder;
}

// Render
function render() {
  let folder = getCurrentFolder();
  let searchQuery = document.getElementById("searchBox").value.toLowerCase();
  document.getElementById("path").innerHTML = path.map((p, i) =>
    `<span onclick="goTo(${i})">${p}</span>`
  ).join(" / ");

  let cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  folder.children
    .filter(c => c.name.toLowerCase().includes(searchQuery))
    .forEach((c,i) => {
      let div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `<div class="menu" onclick="showMenu(${i}, event)">⋮</div>
                       <img src="icons/${c.type}.png" alt="${c.type}">
                       <span>${c.name}</span>`;
      div.onclick = (e) => {
        if (e.target.className==="menu") return;
        if (c.type==="folder") { path.push(c.name); render(); }
        else if (c.type==="note") { openNoteEditor(c); }
        else if (c.type==="file") { openFilePreview(c); }
      };
      cardsDiv.appendChild(div);
    });
}

// Create
function createCard(type) {
  let name = prompt("Enter name:");
  if (!name) return;
  let folder = getCurrentFolder();
  if (folder.children.find(c=>c.name===name)) { alert("Name exists!"); return; }

  if (type==="folder") folder.children.push({type:"folder", name, children:[]});
  if (type==="note") folder.children.push({type:"note", name, content:""});
  saveRoot(getRoot()); render();
}

// Upload
function uploadFile(e) {
  let file = e.target.files[0];
  let reader = new FileReader();
  reader.onload = function() {
    let folder = getCurrentFolder();
    folder.children.push({type:"file", name:file.name, content:reader.result, size:file.size});
    saveRoot(getRoot()); render();
  };
  reader.readAsDataURL(file);
}

// Notes
function openNoteEditor(note) {
  editingNote = note;
  document.getElementById("noteText").value = note.content;
  document.getElementById("notePopup").style.display = "flex";
}
function saveNote() { editingNote.content = document.getElementById("noteText").value;
  saveRoot(getRoot()); closeNote(); render(); }
function closeNote() { document.getElementById("notePopup").style.display = "none"; }

// Files
function openFilePreview(file) {
  let preview = document.getElementById("filePreview");
  if (file.content.startsWith("data:image")) {
    preview.innerHTML = `<img src="${file.content}" style="max-width:100%;">`;
  } else {
    preview.innerHTML = `<a href="${file.content}" download="${file.name}">⬇ Download ${file.name}</a>`;
  }
  document.getElementById("filePopup").style.display = "flex";
}
function closeFile() { document.getElementById("filePopup").style.display = "none"; }

// Menu actions
function showMenu(index, e) {
  e.stopPropagation();
  let action = prompt("Choose action: rename, delete, copy, move, share");
  if (!action) return;
  let root = getRoot();
  let folder = getCurrentFolder();
  let item = folder.children[index];

  switch(action.toLowerCase()) {
    case "rename": let newName = prompt("New name:", item.name); if (newName) item.name=newName; break;
    case "delete": folder.children.splice(index,1); break;
    case "copy": let copy = JSON.parse(JSON.stringify(item)); copy.name+="_copy"; folder.children.push(copy); break;
    case "move": let target = prompt("Move into folder:"); let targetFolder = findFolder(root, target);
      if (targetFolder) { targetFolder.children.push(item); folder.children.splice(index,1); }
      else alert("Folder not found!"); break;
    case "share": alert("Share JSON:\n"+JSON.stringify(item)); break;
  }
  saveRoot(root); render();
}
function findFolder(folder, name) {
  if (folder.name===name && folder.type==="folder") return folder;
  for (let c of folder.children) if (c.type==="folder") { let f=findFolder(c,name); if(f) return f; }
  return null;
}

// Navigation
function goTo(index) { path = path.slice(0,index+1); render(); }

// Floating Add Menu
function toggleAddMenu() {
  let menu = document.getElementById("addMenu");
  menu.style.display = menu.style.display==="flex" ? "none" : "flex";
    }
