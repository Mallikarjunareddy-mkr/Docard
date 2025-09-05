// ---------- Data Structure ----------
// Each folder = { type:"folder", name:"...", children:[] }
// Each note   = { type:"note", name:"...", content:"..." }
// Each file   = { type:"file", name:"...", content:"base64string" }

let rootKey = "MyData";
let path = [rootKey];

// Initialize
if (!localStorage.getItem(rootKey)) {
  localStorage.setItem(rootKey, JSON.stringify({type:"folder", name:"MyData", children:[]}));
}

render();

function getCurrentFolder() {
  let folder = JSON.parse(localStorage.getItem(rootKey));
  for (let i=1;i<path.length;i++) {
    folder = folder.children.find(c => c.name === path[i]);
  }
  return folder;
}

function saveRoot(root) {
  localStorage.setItem(rootKey, JSON.stringify(root));
}

function render() {
  let folder = getCurrentFolder();
  document.getElementById("path").innerText = path.join(" / ");
  let cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  folder.children.forEach((c,i) => {
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div class="menu" onclick="showMenu(${i}, event)">⋮</div>
                     <span>${c.type==="folder"?"📁":c.type==="note"?"📝":"📄"}</span>
                     <span>${c.name}</span>`;
    div.onclick = (e) => {
      if (e.target.className==="menu") return;
      if (c.type==="folder") {
        path.push(c.name);
        render();
      } else if (c.type==="note") {
        let newText = prompt("Edit Note:", c.content);
        if (newText!==null) { c.content=newText; saveRoot(JSON.parse(localStorage.getItem(rootKey))); render(); }
      } else if (c.type==="file") {
        alert("File: "+c.name);
      }
    };
    cardsDiv.appendChild(div);
  });
}

// Create Folder/Note
function createCard(type) {
  let name = prompt("Enter name:");
  if (!name) return;
  let folder = getCurrentFolder();

  if (folder.children.find(c=>c.name===name)) {
    alert("Name already exists!"); return;
  }

  if (type==="folder") folder.children.push({type:"folder", name, children:[]});
  if (type==="note") folder.children.push({type:"note", name, content:""});
  
  saveRoot(JSON.parse(localStorage.getItem(rootKey)));
  render();
}

// Upload File
function uploadFile(e) {
  let file = e.target.files[0];
  let reader = new FileReader();
  reader.onload = function() {
    let folder = getCurrentFolder();
    folder.children.push({type:"file", name:file.name, content:reader.result});
    saveRoot(JSON.parse(localStorage.getItem(rootKey)));
    render();
  };
  reader.readAsDataURL(file);
}

// Menu (Rename/Delete/Copy/Move/Share)
function showMenu(index, e) {
  e.stopPropagation();
  let action = prompt("Choose action: rename, delete, copy, move, share");
  if (!action) return;

  let root = JSON.parse(localStorage.getItem(rootKey));
  let folder = getCurrentFolder();
  let item = folder.children[index];

  switch(action.toLowerCase()) {
    case "rename":
      let newName = prompt("New name:", item.name);
      if (newName) item.name=newName;
      break;
    case "delete":
      folder.children.splice(index,1);
      break;
    case "copy":
      let copy = JSON.parse(JSON.stringify(item));
      copy.name += "_copy";
      folder.children.push(copy);
      break;
    case "move":
      let target = prompt("Enter folder name to move into:");
      let targetFolder = findFolder(root, target);
      if (targetFolder) {
        targetFolder.children.push(item);
        folder.children.splice(index,1);
      } else alert("Folder not found!");
      break;
    case "share":
      alert("Share JSON:\n"+JSON.stringify(item));
      break;
  }
  saveRoot(root);
  render();
}

function findFolder(folder, name) {
  if (folder.name===name && folder.type==="folder") return folder;
  for (let c of folder.children) {
    if (c.type==="folder") {
      let f = findFolder(c, name);
      if (f) return f;
    }
  }
  return null;
}
