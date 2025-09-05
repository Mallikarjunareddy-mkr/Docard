let rootKey = "MyData";
let path = [rootKey];
let editingNote = null;

// Initialize MyData root folder
function initRoot() {
  if (!localStorage.getItem(rootKey)) {
    const root = {type:"folder", name:"MyData", children:[]};
    localStorage.setItem(rootKey, JSON.stringify(root));
  }
}
initRoot();

function getRoot() { return JSON.parse(localStorage.getItem(rootKey)); }
function saveRoot(root) { localStorage.setItem(rootKey, JSON.stringify(root)); }

function getCurrentFolder() {
  let folder = getRoot();
  for (let i=1;i<path.length;i++) folder = folder.children.find(c => c.name===path[i]);
  return folder;
}

// Render
function render() {
  const folder = getCurrentFolder();
  const search = document.getElementById("searchBox").value.toLowerCase();

  document.getElementById("path").innerHTML = path.map((p,i)=>`<span onclick="goTo(${i})">${p}</span>`).join(" / ");

  const cardsDiv = document.getElementById("cards");
  cardsDiv.innerHTML = "";

  folder.children.filter(c => c.name.toLowerCase().includes(search)).forEach((c,i)=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML = `<div class="menu" onclick="showMenu(${i},event)">⋮</div>
                     <img src="icons/${c.type}.png" alt="${c.type}">
                     <span>${c.name}</span>`;
    div.onclick = (e)=>{
      if(e.target.className==="menu") return;
      if(c.type==="folder"){ path.push(c.name); render(); }
      else if(c.type==="note"){ openNoteEditor(c); }
      else if(c.type==="file"){ openFilePreview(c); }
    };
    cardsDiv.appendChild(div);
  });
}

// Create folder/note
function createCard(type) {
  const name = prompt("Enter name:");
  if(!name) return;
  const folder = getCurrentFolder();
  if(folder.children.find(c=>c.name===name)){ alert("Name exists!"); return; }

  if(type==="folder") folder.children.push({type:"folder", name, children:[]});
  if(type==="note") folder.children.push({type:"note", name, content:""});
  saveRoot(getRoot()); render();
}

// Upload file
function uploadFile(e){
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function(){
    const folder = getCurrentFolder();
    folder.children.push({type:"file", name:file.name, content:reader.result, size:file.size});
    saveRoot(getRoot()); render();
  };
  reader.readAsDataURL(file);
}

// Notes
function openNoteEditor(note){
  editingNote=note;
  document.getElementById("noteText").value = note.content;
  document.getElementById("notePopup").style.display="flex";
}
function saveNote(){ editingNote.content=document.getElementById("noteText").value;
saveRoot(getRoot()); closeNote(); render(); }
function closeNote(){ document.getElementById("notePopup").style.display="none"; }

// File preview
function openFilePreview(file){
  const preview=document.getElementById("filePreview");
  if(file.content.startsWith("data:image")) preview.innerHTML=`<img src="${file.content}" style="max-width:100%;">`;
  else preview.innerHTML=`<a href="${file.content}" download="${file.name}">⬇ Download ${file.name}</a>`;
  document.getElementById("filePopup").style.display="flex";
}
function closeFile(){ document.getElementById("filePopup").style.display="none"; }

// Menu actions
function showMenu(index,e){
  e.stopPropagation();
  const action = prompt("Choose: rename, delete, copy, move, share");
  if(!action) return;
  const folder=getCurrentFolder();
  const item=folder.children[index];
  const root=getRoot();

  switch(action.toLowerCase()){
    case "rename":
      const newName=prompt("New name:",item.name);
      if(newName)item.name=newName;
      break;
    case "delete": folder.children.splice(index,1); break;
    case "copy":
      const copy=JSON.parse(JSON.stringify(item));
      copy.name+="_copy"; folder.children.push(copy);
      break;
    case "move":
      const target=prompt("Move to folder name:");
      const targetFolder=findFolder(root,target);
      if(targetFolder){ targetFolder.children.push(item); folder.children.splice(index,1); }
      else alert("Folder not found!");
      break;
    case "share": alert("Share JSON:\n"+JSON.stringify(item)); break;
  }
  saveRoot(root); render();
}
function findFolder(folder,name){
  if(folder.name===name && folder.type==="folder") return folder;
  for(const c of folder.children) if(c.type==="folder"){ const f=findFolder(c,name); if(f) return f; }
  return null;
}

// Navigation
function goTo(i){ path=path.slice(0,i+1); render(); }

// Floating menu
function toggleAddMenu(){
  const menu=document.getElementById("addMenu");
  menu.style.display=menu.style.display==="flex"?"none":"flex";
}

render();
