
// Page Navigation & Sidebar
function updateSidebarVisibility(pageId) {
    const sidebar = document.getElementById('sidebar');
    if (pageId === 'homePage') {
        sidebar.style.display = 'flex';
    } else {
        sidebar.style.display = 'none';
    }
}
function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    updateSidebarVisibility(id);
    if(id==='localDashboard') updateStorageInfo();
}
function openHelpModal(){
    document.getElementById('helpModal').style.display='flex';
}
function closeHelpModal(){
    document.getElementById('helpModal').style.display='none';
}
function exitToHome(){ showPage('homePage'); }
function openLocalFileManager(){ showPage('localPage'); renderFiles(); }
function clearFilters(){ activeFilter=null; clearFilterButtons(); openLocalFileManager(); }

// Theme
function toggleTheme(){
    document.body.classList.toggle('dark');
    document.getElementById('themeIcon').innerText=document.body.classList.contains('dark')?'dark_mode':'light_mode';
    localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light');
}
if(localStorage.getItem('theme')==='dark'){document.body.classList.add('dark');document.getElementById('themeIcon').innerText='dark_mode';}

// Settings modal
function openSettings(){
    document.getElementById('settingsModal').style.display='flex';
    updateStorageInfo();
    document.getElementById('modalStorageInfo').innerText=document.getElementById('storageInfo').innerText;
}
function closeSettings(){ document.getElementById('settingsModal').style.display='none'; }

// Storage
function updateStorageInfo(){
    let used=calculateStorageUsed();
    document.getElementById('storageInfo').innerText = `Used: ${used} / Total: 100 MB`;
    if(document.getElementById('modalStorageInfo')) document.getElementById('modalStorageInfo').innerText = `Used: ${used} / Total: 100 MB`;
}
function calculateStorageUsed(){
    let total=0;
    let filesFlat=flattenFiles(files['/']);
    filesFlat.forEach(f=>{ if(f.size)total+=f.size; });
    let mb=(total/(1024*1024)).toFixed(2)+' MB';
    return mb;
}
function flattenFiles(obj){
    let arr=[];
    for(let k in obj){
        if(typeof obj[k]==='object'){
            if(obj[k].content) arr.push(obj[k]);
            else arr=arr.concat(flattenFiles(obj[k]));
        }
    }
    return arr;
}

// Files
let files=JSON.parse(localStorage.getItem('files')||'{"\/":{}}');
let path=['/'], selectedItems=[], activeFilter=null, isGrid=false, searchQuery='', sortOrder='name';

// --- BACK BUTTON LOGIC ---
function goBackManager(){
    // If we're in a folder (length > 1), go up one folder
    if (document.getElementById('localPage').classList.contains('active')) {
        if(path.length > 1) {
            path.pop();
            renderFiles();
        } else {
            // At root: go to dashboard
            showPage('localDashboard');
        }
        return;
    }
    // If we're at dashboard, go to home
    if (document.getElementById('localDashboard').classList.contains('active')) {
        showPage('homePage');
        return;
    }
    // If we're at homePage, do nothing (or could navigate elsewhere if desired)
}

function getCurrentFolder(){ let f=files; for(let i=1;i<path.length;i++) f=f[path[i]]; return f; }
function clearFilterButtons(){ document.querySelectorAll('.filter-btn').forEach(btn=>btn.classList.remove('active')); }
function filterFiles(type){ activeFilter=type; highlightFilterButton(type); openLocalFileManager(); }
function highlightFilterButton(type){
    clearFilterButtons();
    if(type==='images') document.getElementById('filterImages').classList.add('active');
    else if(type==='documents') document.getElementById('filterDocs').classList.add('active');
    else if(type==='videos') document.getElementById('filterVideos').classList.add('active');
    else if(type==='others') document.getElementById('filterOthers').classList.add('active');
}
function renderBreadcrumb(){
    const bc=document.getElementById('breadcrumb'); bc.innerHTML='';
    path.forEach((p,i)=>{
        let span=document.createElement('span'); span.innerText=(i === 0 ? "Root" : p);
        span.onclick=()=>navigateTo(i); bc.appendChild(span);
        if(i<path.length-1) bc.appendChild(document.createTextNode(' / '));
    });
}
function navigateTo(i){ path=path.slice(0,i+1); renderFiles(); }
function renderFiles(){
    renderBreadcrumb();
    updateStorageInfo();
    const fileArea=document.getElementById('fileArea'); fileArea.innerHTML='';
    selectedItems=[]; updateFabIcon(); toggleFileOperations(false);
    let folderObj=getCurrentFolder();
    let items=Object.keys(folderObj).map(name=>{
        let isFolder=typeof folderObj[name]==='object' && !folderObj[name].content;
        return {name,isFolder,obj:folderObj[name]};
    });
    // Filter
    items=items.filter(item=>{
        if(!item.isFolder && activeFilter){
            let ext=item.name.split('.').pop().toLowerCase();
            if(activeFilter==='images' && !['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return false;
            if(activeFilter==='documents' && !['pdf','docx','doc','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return false;
            if(activeFilter==='videos' && !['mp4','mov','avi','webm','mkv'].includes(ext)) return false;
            if(activeFilter==='others' && ['jpg','jpeg','png','gif','webp','svg','bmp','pdf','docx','doc','txt','xlsx','xls','pptx','csv','md','mp4','mov','avi','webm','mkv'].includes(ext)) return false;
        }
        if(searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });
    // Sort
    if(sortOrder==='name') items.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortOrder==='size') items.sort((a,b)=>(b.obj.size||0)-(a.obj.size||0));
    // Render
    items.forEach(item=>{
        const div=document.createElement('div'); div.className='file-item'; div.tabIndex=0;
        div.innerHTML = `
            <span class="file-checkbox"><input type="checkbox" onchange="toggleSelect(this,'${item.name}',${item.isFolder})"></span>
            <span class="file-icon">${getFileIcon(item.name,item.isFolder)}</span>
            <div class="file-info">
                <span class="file-name">${item.name}</span>
                <span class="file-meta">${item.isFolder ? 'Folder' : (item.obj.size ? (formatBytes(item.obj.size)) : '')}</span>
            </div>
        `;
        // Folder: click anywhere
        if(item.isFolder) {
            div.onclick = (e) => {
                if(e.target.tagName.toLowerCase()!=='input') {
                    path.push(item.name); renderFiles();
                }
            };
        } else {
            div.querySelector('.file-info').onclick = ()=>{ previewFile(item.name); };
            div.querySelector('.file-icon').onclick = ()=>{ previewFile(item.name); };
            div.onkeydown = (e) => {
                if(e.key==='Enter') previewFile(item.name);
            };
        }
        div.querySelector('.file-info').ondblclick = ()=>{ showDetails(item.name, item.isFolder); };
        fileArea.appendChild(div);
    });
    document.getElementById('fileArea').style.gridTemplateColumns=isGrid?'repeat(auto-fill,minmax(180px,1fr))':'repeat(auto-fill,minmax(240px,1fr))';
    document.getElementById('viewIcon').innerText=isGrid?'grid_view':'view_list';
}
function getFileIcon(name,isFolder){
    if(isFolder) return '<span class="material-symbols-outlined" aria-label="Folder">folder</span>';
    let ext=name.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return '<span class="material-symbols-outlined" aria-label="Image">image</span>';
    if(['pdf','doc','docx','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return '<span class="material-symbols-outlined" aria-label="Document">description</span>';
    if(['mp4','mov','avi','webm','mkv'].includes(ext)) return '<span class="material-symbols-outlined" aria-label="Video">movie</span>';
    return '<span class="material-symbols-outlined" aria-label="File">insert_drive_file</span>';
}
function formatBytes(bytes){
    if(bytes<1024) return bytes+' B';
    else if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
    else return (bytes/(1024*1024)).toFixed(2)+' MB';
}
function searchFiles(q){ searchQuery=q; renderFiles(); }
function toggleView(){ isGrid=!isGrid; renderFiles(); }
function sortFiles(){ 
    sortOrder=sortOrder==='name'?'size':'name'; 
    renderFiles(); 
    showToast('Sorted by '+(sortOrder==='name'?'Name':'Size')); 
}

// FAB & File Operations
function fabAction(){
    if(selectedItems.length>0){
        document.getElementById('fileOperations').style.display='flex';
        document.getElementById('fabMenu').style.display='none';
    } else {
        document.getElementById('fabMenu').style.display=document.getElementById('fabMenu').style.display==='flex'?'none':'flex';
        document.getElementById('fileOperations').style.display='none';
    }
}
function updateFabIcon(){
    document.getElementById('fabBtn').innerHTML = selectedItems.length>0 ? '<span class="material-symbols-outlined">edit</span>' : '<span class="material-symbols-outlined">add</span>';
}
function toggleSelect(cb,name,isFolder){
    if(cb.checked) selectedItems.push({name,isFolder});
    else selectedItems=selectedItems.filter(i=>i.name!==name||i.isFolder!==isFolder);
    updateFabIcon(); toggleFileOperations(false);
}
function toggleFileOperations(show){ document.getElementById('fileOperations').style.display=show?'flex':'none'; }
function cancelSelection(){ selectedItems=[]; document.querySelectorAll('#fileArea input[type=checkbox]').forEach(cb=>cb.checked=false); updateFabIcon(); toggleFileOperations(false); }

// Folder / File Operations
function createFolder(){
    const name=prompt('Folder Name:');
    if(!name||name.includes('/')) return showToast('Invalid folder name');
    const f=getCurrentFolder();
    if(f[name]) return showToast('Already exists');
    f[name]={};
    localStorage.setItem('files',JSON.stringify(files));
    renderFiles();
    showToast('Folder created');
}
function uploadFile(){
    document.getElementById('fileInput').click();
    document.getElementById('fabMenu').style.display='none';
}
function handleFileUpload(e){
    const f=getCurrentFolder();
    for(const file of e.target.files){
        const reader=new FileReader();
        reader.onload=function(ev){
            f[file.name]={content:ev.target.result,size:file.size,type:file.type,lastModified:file.lastModified};
            localStorage.setItem('files',JSON.stringify(files));
            renderFiles();
            showToast('File uploaded: '+file.name);
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}
function confirmDeleteSelected() {
    if(selectedItems.length===0) return showToast('No items selected');
    if(confirm('Are you sure you want to delete selected items?')) {
        deleteSelected();
    }
}
function deleteSelected(){
    const f=getCurrentFolder();
    selectedItems.forEach(i=>delete f[i.name]);
    selectedItems=[];
    localStorage.setItem('files',JSON.stringify(files));
    renderFiles();
    showToast('Deleted');
}
function renameSelected(){
    if(selectedItems.length!==1) return showToast('Select only one item');
    const oldName=selectedItems[0].name;
    const newName=prompt('New name:',oldName);
    if(!newName||newName.includes('/')) return showToast('Invalid name');
    const f=getCurrentFolder();
    if(f[newName]) return showToast('Name already exists');
    f[newName]=f[oldName];
    delete f[oldName];
    localStorage.setItem('files',JSON.stringify(files));
    renderFiles();
    showToast('Renamed');
}
function downloadSelected(){
    selectedItems.forEach(i=>{
        const f=getCurrentFolder()[i.name];
        if(!i.isFolder){
            const a=document.createElement('a');
            a.href=f.content;
            a.download=i.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
    cancelSelection();
    showToast('Downloaded');
}
function previewSelected(){
    if(selectedItems.length!==1) return showToast('Select only one item');
    previewFile(selectedItems[0].name);
    selectedItems=[]; updateFabIcon(); toggleFileOperations(false);
}
function previewFile(name){
    const f=getCurrentFolder()[name];
    if(!f) return showToast('File not found!');
    const modal=document.getElementById('previewModal');
    const content=document.getElementById('previewContent');
    content.innerHTML = `<h4>${name}</h4>`;
    let ext = name.split('.').pop().toLowerCase();
    let isTextFile = ['txt','md','js','json','css','html','csv'].includes(ext);
    let isImage = ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext);
    if(isImage) {
        content.innerHTML += `<img src="${f.content}" alt="${name}" style="border-radius:12px;box-shadow:0 4px 18px rgba(25,118,210,0.13);"/>`;
    } else if(['pdf'].includes(ext)) {
        content.innerHTML += `<iframe src="${f.content}" style="width:100%;height:70vh;border:none;"></iframe>`;
    } else if(isTextFile) {
        let reader = new FileReader();
        reader.onload = function(ev) {
            content.innerHTML += `<pre style="width:100%;max-height:60vh;">${ev.target.result}</pre>`;
        }
        reader.readAsText(dataURLtoBlob(f.content));
    } else {
        content.innerHTML += `<p style="color:var(--color-muted);">Preview not available for this file type.</p><a href="${f.content}" download="${name}" class="filter-btn" style="margin-top:12px;">Download</a>`;
    }
    modal.style.display = 'flex';
}
function closePreview(e){
    if(!e || e.target===document.getElementById('previewModal') || e.target===document.getElementById('previewClose'))
        document.getElementById('previewModal').style.display='none';
}

// File Details Modal
function showDetailsSelected() {
    if(selectedItems.length!==1) return showToast('Select only one item');
    showDetails(selectedItems[0].name, selectedItems[0].isFolder);
}
function showDetails(name, isFolder) {
    const f=getCurrentFolder()[name];
    if(!f) return showToast('File not found!');
    let html = `<h3>Details for: ${name}</h3>`;
    html += `<ul style="font-size:15px;line-height:1.6;margin:14px 0 0 0;">`;
    html += `<li>Type: ${isFolder?'Folder':(f.type||'Unknown')}</li>`;
    html += `<li>Size: ${isFolder?'N/A':formatBytes(f.size||0)}</li>`;
    html += `<li>Last Modified: ${isFolder?'N/A':(f.lastModified?new Date(f.lastModified).toLocaleString():'N/A')}</li>`;
    html += `<li>Path: ${path.join('/')}/${name}</li>`;
    html += `</ul>`;
    document.getElementById('detailsContent').innerHTML = html;
    document.getElementById('detailsModal').style.display='flex';
}
function closeDetailsModal(){
    document.getElementById('detailsModal').style.display='none';
}

// Utility: DataURL to Blob
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
}

// Drag & Drop upload
document.addEventListener('dragover',function(e){e.preventDefault();},false);
document.addEventListener('drop',function(e){
    if(document.getElementById('localPage').classList.contains('active')){
        e.preventDefault();
        if(e.dataTransfer.files && e.dataTransfer.files.length){
            document.getElementById('fileInput').files = e.dataTransfer.files;
            handleFileUpload({target:{files:e.dataTransfer.files}});
        }
    }
},false);

// Toast notifications
function showToast(msg){
    const t=document.getElementById('toast');
    t.innerText=msg;
    t.style.display='block';
    setTimeout(()=>{t.style.display='none';},1800);
}

// Initial page load
if(window.location.hash){
    let page=window.location.hash.replace('#','');
    if(document.getElementById(page)) showPage(page);
} else showPage('homePage');
