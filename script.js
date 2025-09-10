/* Shared script for index.html, local.html, cloud.html
   - Persists files in localStorage under key "docard_files"
   - Theme saved in localStorage under key "docard_theme"
   - Local file manager features available if local.html is loaded
*/

// ---------- Utilities & Theme ----------
const FILES_KEY = 'docard_files';
const THEME_KEY = 'docard_theme';

// theme init
function setTheme(theme) {
  if (theme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  const iconEls = document.querySelectorAll('#themeIcon, #themeIconLocal, #themeIconCloud, #themeIcon');
  iconEls.forEach(el => {
    if (el) el.innerText = theme === 'dark' ? 'dark_mode' : 'light_mode';
  });
  localStorage.setItem(THEME_KEY, theme);
}
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  setTheme(isDark ? 'dark' : 'light');
}
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
setTheme(savedTheme);

// attach theme buttons (if present)
document.querySelectorAll('#themeToggle, #themeToggleLocal, #themeToggleCloud, #themeToggleHome').forEach(btn=>{
  if(btn) btn.addEventListener('click', toggleTheme);
});

// help & settings open/close (works for any page)
function openHelpModal(){ const m = document.getElementById('helpModal'); if(m){ m.style.display='flex'; m.setAttribute('open',''); } }
function closeHelpModal(){ const m = document.getElementById('helpModal'); if(m){ m.style.display='none'; m.removeAttribute('open'); } }
function openSettings(){ const m = document.getElementById('settingsModal'); if(m){ m.style.display='flex'; m.setAttribute('open',''); } }
function closeSettings(){ const m = document.getElementById('settingsModal'); if(m){ m.style.display='none'; m.removeAttribute('open'); } }

// top help/settings button bindings (home/local/cloud)
document.querySelectorAll('#helpBtn, #helpBtnLocal, #helpBtnCloud').forEach(b=>{ if(b) b.addEventListener('click', openHelpModal); });
document.querySelectorAll('#settingsBtn, #settingsBtnLocal, #settingsBtnCloud').forEach(b=>{ if(b) b.addEventListener('click', openSettings); });

// toast helper
function showToast(msg, ms=1600){
  const t = document.getElementById('toast');
  if(!t) return;
  t.innerText = msg; t.style.display='block';
  clearTimeout(t._h);
  t._h = setTimeout(()=> t.style.display='none', ms);
}

// ---------- Storage & Files Model ----------
/*
files structure:
{
  "/": {
    "FolderA": {},
    "file.txt": { content: "data:url...", size: 1234, type: "text/plain", lastModified: 123456789 }
  }
}
*/
function loadFiles() {
  try {
    const raw = localStorage.getItem(FILES_KEY);
    if(!raw) {
      const init = {'/': {}};
      localStorage.setItem(FILES_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch(e) {
    console.error('failed load files', e);
    const init = {'/': {}};
    localStorage.setItem(FILES_KEY, JSON.stringify(init));
    return init;
  }
}
function saveFiles() {
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
}

let files = loadFiles();

// flatten files to calculate used size
function flattenFiles(obj){
  let arr=[];
  for(let k in obj){
    if(typeof obj[k]==='object'){
      if(obj[k].content) arr.push(obj[k]);
      else arr = arr.concat(flattenFiles(obj[k]));
    }
  }
  return arr;
}
function calculateStorageUsed(){
  let total = 0;
  try {
    const flat = flattenFiles(files['/']);
    flat.forEach(f=>{ if(f.size) total += f.size; });
  } catch(e){ total = 0; }
  return (total/(1024*1024)).toFixed(2) + ' MB';
}

// ---------- Page detection ----------
const isLocalPage = !!document.getElementById('fileArea');
const isIndexPage = !!document.querySelector('.docard-title');
const isCloudPage = !!document.querySelector('.card .material-symbols-outlined'); // crude

// update settings modal storage info if exists
function updateStorageInfoDisplay(){
  const el = document.getElementById('storageInfo');
  const modalEl = document.getElementById('modalStorageInfo');
  const used = calculateStorageUsed();
  if(el) el.innerText = `Used: ${used} / Total: 100 MB`;
  if(modalEl) modalEl.innerText = `Used: ${used} / Total: 100 MB`;
}
updateStorageInfoDisplay();

// ---------- LOCAL PAGE FUNCTIONALITY ----------
if(isLocalPage){
  // state
  let path = ['/']; // root path representation
  let selectedItems = []; // {name,isFolder}
  let activeFilter = null;
  let isGrid = false;
  let searchQuery = '';
  let sortOrder = 'name';

  const fileArea = document.getElementById('fileArea');
  const breadcrumbEl = document.getElementById('breadcrumb');
  const fabBtn = document.getElementById('fabBtn');
  const fabMenu = document.getElementById('fabMenu');
  const fileOperations = document.getElementById('fileOperations');
  const fileInput = document.getElementById('fileInput');
  const previewModal = document.getElementById('previewModal');
  const previewContent = document.getElementById('previewContent');
  const detailsModal = document.getElementById('detailsModal');
  const detailsContent = document.getElementById('detailsContent');

  // render breadcrumb
  function renderBreadcrumb(){
    if(!breadcrumbEl) return;
    breadcrumbEl.innerHTML = '';
    path.forEach((p,i)=>{
      const span = document.createElement('span');
      span.innerText = (i===0? 'Root' : p);
      span.onclick = ()=>{ navigateTo(i); };
      breadcrumbEl.appendChild(span);
      if(i < path.length-1) {
        const sep = document.createTextNode(' / ');
        breadcrumbEl.appendChild(sep);
      }
    });
  }

  function navigateTo(index){
    path = path.slice(0, index+1);
    renderFiles();
  }

  function getCurrentFolder(){
    let f = files;
    for(let i=1;i<path.length;i++) f = f[path[i]];
    return f;
  }

  function clearFilterButtons(){
    document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
  }
  function highlightFilterButton(type){
    clearFilterButtons();
    if(!type) document.getElementById('filterAll')?.classList.add('active');
    else if(type==='images') document.getElementById('filterImages')?.classList.add('active');
    else if(type==='documents') document.getElementById('filterDocs')?.classList.add('active');
    else if(type==='videos') document.getElementById('filterVideos')?.classList.add('active');
    else if(type==='others') document.getElementById('filterOthers')?.classList.add('active');
  }

  // file icon helper
  function getFileIcon(name, isFolder){
    if(isFolder) return '<span class="material-symbols-outlined">folder</span>';
    let ext = name.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return '<span class="material-symbols-outlined">image</span>';
    if(['pdf','doc','docx','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return '<span class="material-symbols-outlined">description</span>';
    if(['mp4','mov','avi','webm','mkv'].includes(ext)) return '<span class="material-symbols-outlined">movie</span>';
    return '<span class="material-symbols-outlined">insert_drive_file</span>';
  }

  // format size
  function formatBytes(bytes){
    if(!bytes) return '';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(2) + ' MB';
  }

  // selection helpers
  function updateFabIcon(){
    if(!fabBtn) return;
    fabBtn.innerHTML = selectedItems.length > 0 ? '<span class="material-symbols-outlined">edit</span>' : '<span class="material-symbols-outlined">add</span>';
  }
  function toggleFileOperations(show){
    if(fileOperations) fileOperations.style.display = show ? 'flex' : 'none';
  }

  function cancelSelection(){
    selectedItems = [];
    document.querySelectorAll('#fileArea .file-item.selected').forEach(x=>x.classList.remove('selected'));
    updateFabIcon();
    toggleFileOperations(false);
  }

  // main render
  function renderFiles(){
    renderBreadcrumb();
    updateStorageInfoDisplay();
    if(!fileArea) return;
    fileArea.innerHTML = '';
    selectedItems = [];
    updateFabIcon();
    toggleFileOperations(false);

    const folderObj = getCurrentFolder();
    let items = Object.keys(folderObj).map(name=>{
      const isFolder = typeof folderObj[name] === 'object' && !folderObj[name].content;
      return { name, isFolder, obj: folderObj[name] };
    });

    // filter
    items = items.filter(item=>{
      if(!item.isFolder && activeFilter){
        let ext = item.name.split('.').pop().toLowerCase();
        if(activeFilter==='images' && !['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return false;
        if(activeFilter==='documents' && !['pdf','docx','doc','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return false;
        if(activeFilter==='videos' && !['mp4','mov','avi','webm','mkv'].includes(ext)) return false;
        if(activeFilter==='others' && ['jpg','jpeg','png','gif','webp','svg','bmp','pdf','docx','doc','txt','xlsx','xls','pptx','csv','md','mp4','mov','avi','webm','mkv'].includes(ext)) return false;
      }
      if(searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // sort
    if(sortOrder==='name') items.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortOrder==='size') items.sort((a,b)=> (b.obj.size||0) - (a.obj.size||0) );

    // render each
    items.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'file-item';
      div.tabIndex = 0;
      div.innerHTML = `
        <label style="margin-right:8px;">
          <input type="checkbox" class="file-checkbox" />
        </label>
        <div class="file-icon">${getFileIcon(item.name,item.isFolder)}</div>
        <div class="file-info">
          <div class="file-name">${item.name}</div>
          <div class="file-meta">${item.isFolder ? 'Folder' : (item.obj.size ? formatBytes(item.obj.size) : '')}</div>
        </div>
      `;
      // click behavior
      const checkbox = div.querySelector('.file-checkbox');
      checkbox.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        checkbox.checked ? selectItem(item.name, item.isFolder, div) : unselectItem(item.name, item.isFolder, div);
      });

      div.addEventListener('click', (ev)=>{
        if(ev.target.tagName.toLowerCase() === 'input') return;
        if(item.isFolder){
          path.push(item.name);
          renderFiles();
        } else {
          previewFile(item.name);
        }
      });
      div.addEventListener('dblclick', ()=> showDetails(item.name, item.isFolder) );
      fileArea.appendChild(div);
    });

    // grid mode adjustments
    document.getElementById('viewIcon').innerText = isGrid ? 'grid_view' : 'view_list';
    document.getElementById('fileArea').style.gridTemplateColumns = isGrid ? 'repeat(auto-fill,minmax(180px,1fr))' : 'repeat(auto-fill,minmax(220px,1fr))';
  }

  function selectItem(name, isFolder, element){
    element.classList.add('selected');
    selectedItems.push({name, isFolder});
    updateFabIcon();
    toggleFileOperations(false);
  }
  function unselectItem(name, isFolder, element){
    element.classList.remove('selected');
    selectedItems = selectedItems.filter(i => !(i.name===name && i.isFolder===isFolder));
    updateFabIcon();
  }

  // navigation open manager (just focus)
  function openLocalFileManager(){ renderFiles(); showToast('File manager ready'); }

  // search hook
  function searchFiles(q){ searchQuery = q; renderFiles(); }

  // filter hook
  function filterFiles(type){
    activeFilter = type;
    highlightFilterButton(type);
    renderFiles();
  }

  // sorting toggle
  function sortFiles(){ sortOrder = (sortOrder==='name'?'size':'name'); renderFiles(); showToast('Sorted by ' + (sortOrder==='name'?'name':'size')); }

  // toggle view
  function toggleView(){ isGrid = !isGrid; renderFiles(); }

  // FAB behavior
  function fabAction(){
    if(selectedItems.length > 0){
      fileOperations.style.display = fileOperations.style.display === 'flex' ? 'none' : 'flex';
      fabMenu.style.display = 'none';
    } else {
      fabMenu.style.display = fabMenu.style.display === 'flex' ? 'none' : 'flex';
      fileOperations.style.display = 'none';
    }
  }

  // Create folder
  function createFolder(){
    const name = prompt('Folder name:');
    if(!name || name.includes('/')) return showToast('Invalid folder name');
    const f = getCurrentFolder();
    if(f[name]) return showToast('Already exists');
    f[name] = {};
    saveFiles();
    renderFiles();
    showToast('Folder created');
  }

  // Upload file
  function uploadFile(){ if(fileInput) fileInput.click(); if(fabMenu) fabMenu.style.display='none'; }
  function handleFileUpload(e){
    const f = getCurrentFolder();
    const filesList = e.target.files;
    if(!filesList || !filesList.length) return;
    Array.from(filesList).forEach(file=>{
      const reader = new FileReader();
      reader.onload = function(ev){
        f[file.name] = { content: ev.target.result, size: file.size, type: file.type, lastModified: file.lastModified };
        saveFiles();
        renderFiles();
        showToast('Uploaded: ' + file.name);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  // drag & drop
  document.addEventListener('dragover', (e)=> e.preventDefault());
  document.addEventListener('drop', (e)=>{
    if(!document.body.contains(fileArea)) return;
    if(!fileArea) return;
    if(e.dataTransfer.files && e.dataTransfer.files.length){
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
    e.preventDefault();
  });

  // delete selected
  function confirmDeleteSelected(){
    if(selectedItems.length === 0) return showToast('No items selected');
    if(!confirm('Delete selected items?')) return;
    const f = getCurrentFolder();
    selectedItems.forEach(i => delete f[i.name]);
    selectedItems = [];
    saveFiles();
    renderFiles();
    showToast('Deleted');
  }

  // rename
  function renameSelected(){
    if(selectedItems.length !== 1) return showToast('Select only one item');
    const oldName = selectedItems[0].name;
    const newName = prompt('New name:', oldName);
    if(!newName || newName.includes('/')) return showToast('Invalid name');
    const f = getCurrentFolder();
    if(f[newName]) return showToast('Name exists');
    f[newName] = f[oldName];
    delete f[oldName];
    saveFiles();
    renderFiles();
    showToast('Renamed');
  }

  // download
  function downloadSelected(){
    if(selectedItems.length === 0) return showToast('No items selected');
    selectedItems.forEach(i=>{
      const obj = getCurrentFolder()[i.name];
      if(!i.isFolder && obj && obj.content){
        const a = document.createElement('a');
        a.href = obj.content;
        a.download = i.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
    cancelSelection();
    showToast('Downloaded');
  }

  // preview single
  function previewSelected(){
    if(selectedItems.length !== 1) return showToast('Select only one item');
    previewFile(selectedItems[0].name);
    cancelSelection();
  }
  function previewFile(name){
    const f = getCurrentFolder()[name];
    if(!f) return showToast('File not found');
    if(!previewModal || !previewContent) return;
    previewContent.innerHTML = `<h4 style="margin:0 0 8px 0;">${name}</h4>`;
    const ext = name.split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
    const isText = ['txt','md','js','json','css','html','csv'].includes(ext);
    if(isImage){
      previewContent.innerHTML += `<img src="${f.content}" alt="${name}" style="max-width:100%;border-radius:8px;"/>`;
    } else if(['pdf'].includes(ext)){
      previewContent.innerHTML += `<iframe src="${f.content}" style="width:100%;height:70vh;border:none;"></iframe>`;
    } else if(isText){
      const blob = dataURLtoBlob(f.content);
      const reader = new FileReader();
      reader.onload = function(ev){
        previewContent.innerHTML += `<pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;">${ev.target.result}</pre>`;
      };
      reader.readAsText(blob);
    } else {
      previewContent.innerHTML += `<p style="color:var(--color-muted)">Preview not available for this file type.</p><a href="${f.content}" download="${name}" class="btn" style="margin-top:8px;">Download</a>`;
    }
    previewModal.style.display = 'flex';
  }
  function closePreview(e){
    if(!previewModal) return;
    if(!e || e.target === previewModal || e.target.classList.contains('close-btn')) {
      previewModal.style.display = 'none';
      previewContent.innerHTML = '';
    }
  }

  // details
  function showDetailsSelected(){
    if(selectedItems.length !== 1) return showToast('Select only one item');
    showDetails(selectedItems[0].name, selectedItems[0].isFolder);
  }
  function showDetails(name, isFolder){
    const f = getCurrentFolder()[name];
    if(!f) return showToast('Not found');
    let html = `<h3>Details — ${name}</h3><ul style="line-height:1.6">`;
    html += `<li>Type: ${isFolder ? 'Folder' : (f.type || 'Unknown')}</li>`;
    html += `<li>Size: ${isFolder ? 'N/A' : formatBytes(f.size||0)}</li>`;
    html += `<li>Last Modified: ${isFolder ? 'N/A' : (f.lastModified ? new Date(f.lastModified).toLocaleString() : 'N/A')}</li>`;
    html += `<li>Path: ${path.join('/')}/${name}</li>`;
    html += `</ul><div style="margin-top:12px"><button class="btn" onclick="closeDetailsModal()">Close</button></div>`;
    detailsContent.innerHTML = html;
    detailsModal.style.display = 'flex';
  }
  function closeDetailsModal(){ detailsModal.style.display='none'; detailsContent.innerHTML=''; }

  // utility: dataURL to blob
  function dataURLtoBlob(dataurl){
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while(n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  // initial render
  renderFiles();

  // expose a few functions to global (used from inline onclicks)
  window.createFolder = createFolder;
  window.uploadFile = uploadFile;
  window.handleFileUpload = handleFileUpload;
  window.openLocalFileManager = openLocalFileManager;
  window.filterFiles = filterFiles;
  window.sortFiles = sortFiles;
  window.toggleView = toggleView;
  window.fabAction = fabAction;
  window.previewSelected = previewSelected;
  window.renameSelected = renameSelected;
  window.confirmDeleteSelected = confirmDeleteSelected;
  window.downloadSelected = downloadSelected;
  window.cancelSelection = cancelSelection;
  window.previewFile = previewFile;
  window.closePreview = closePreview;
  window.showDetails = showDetails;
  window.closeDetailsModal = closeDetailsModal;
  window.searchFiles = searchFiles;
  window.goBackManager = function(){
    if(path.length > 1){ path.pop(); renderFiles(); }
    else { window.location.href = 'index.html'; }
  };

  // update storage info periodically (or when files change)
  // saveFiles() already called when files change; update display now
  updateStorageInfoDisplay();
}
