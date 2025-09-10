// ======= Theme & Initialization =======
if(localStorage.getItem('theme')==='dark'){
    document.body.classList.add('dark');
    const themeBtn=document.getElementById('themeIcon');
    if(themeBtn) themeBtn.innerText='dark_mode';
}

function toggleTheme(){
    document.body.classList.toggle('dark');
    const icon=document.getElementById('themeIcon');
    if(icon) icon.innerText=document.body.classList.contains('dark')?'dark_mode':'light_mode';
    localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light');
}

// ======= Modals =======
function openHelpModal(){ const m=document.getElementById('helpModal'); if(m) m.style.display='flex'; }
function closeHelpModal(){ const m=document.getElementById('helpModal'); if(m) m.style.display='none'; }
function openSettings(){
    const m=document.getElementById('settingsModal');
    if(m){
        m.style.display='flex';
        const storage=document.getElementById('storageInfo');
        if(storage){
            const modalStorage=document.getElementById('modalStorageInfo');
            if(modalStorage) modalStorage.innerText=storage.innerText;
        }
    }
}
function closeSettings(){ const m=document.getElementById('settingsModal'); if(m) m.style.display='none'; }
function closePreview(e){
    const modal=document.getElementById('previewModal');
    if(!modal) return;
    if(!e || e.target===modal || e.target===document.getElementById('previewClose'))
        modal.style.display='none';
}
function closeDetailsModal(){ const m=document.getElementById('detailsModal'); if(m) m.style.display='none'; }

// ======= Storage =======
let files=JSON.parse(localStorage.getItem('files')||'{"\/":{}}');
let path=['/'], selectedItems=[], activeFilter=null, isGrid=false, searchQuery='', sortOrder='name';

function updateStorageInfo(){
    const used=calculateStorageUsed();
    const storage=document.getElementById('storageInfo');
    if(storage) storage.innerText=`Used: ${used} / Total: 100 MB`;
    const modalStorage=document.getElementById('modalStorageInfo');
    if(modalStorage) modalStorage.innerText=`Used: ${used} / Total: 100 MB`;
}

function calculateStorageUsed(){
    let total=0;
    function flatten(obj){
        let arr=[];
        for(let k in obj){
            if(typeof obj[k]==='object'){
                if(obj[k].content) arr.push(obj[k]);
                else arr=arr.concat(flatten(obj[k]));
            }
        }
        return arr;
    }
    flatten(files['/']).forEach(f=>{if(f.size) total+=f.size;});
    return (total/(1024*1024)).toFixed(2)+' MB';
}

// ======= File Manager Navigation =======
function goBackManager(){
    if(path.length>1){ path.pop(); renderFiles(); return; }
    showToast('Already at root folder');
}
function getCurrentFolder(){ let f=files['/']; for(let i=1;i<path.length;i++) f=f[path[i]]; return f; }
function navigateTo(index){ path=path.slice(0,index+1); renderFiles(); }
function renderBreadcrumb(){
    const bc=document.getElementById('breadcrumb'); if(!bc) return;
    bc.innerHTML='';
    path.forEach((p,i)=>{
        let span=document.createElement('span');
        span.innerText=(i===0?'Root':p);
        span.onclick=()=>navigateTo(i);
        bc.appendChild(span);
        if(i<path.length-1) bc.appendChild(document.createTextNode(' / '));
    });
}

// ======= File Operations =======
function renderFiles(){
    renderBreadcrumb();
    updateStorageInfo();
    const fileArea=document.getElementById('fileArea');
    if(!fileArea) return;
    fileArea.innerHTML='';
    selectedItems=[]; updateFabIcon(); toggleFileOperations(false);
    const folderObj=getCurrentFolder();
    let items=Object.keys(folderObj).map(name=>{
        let isFolder=typeof folderObj[name]==='object'&&!folderObj[name].content;
        return {name,isFolder,obj:folderObj[name]};
    });

    // Filters
    items=items.filter(item=>{
        if(!item.isFolder && activeFilter){
            let ext=item.name.split('.').pop().toLowerCase();
            if(activeFilter==='images' && !['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return false;
            if(activeFilter==='documents' && !['pdf','doc','docx','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return false;
            if(activeFilter==='videos' && !['mp4','mov','avi','webm','mkv'].includes(ext)) return false;
            if(activeFilter==='others' && ['jpg','jpeg','png','gif','webp','svg','bmp','pdf','doc','docx','txt','xlsx','xls','pptx','csv','md','mp4','mov','avi','webm','mkv'].includes(ext)) return false;
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
        div.innerHTML=`
            <span class="file-checkbox"><input type="checkbox" onchange="toggleSelect(this,'${item.name}',${item.isFolder})"></span>
            <span class="file-icon">${getFileIcon(item.name,item.isFolder)}</span>
            <div class="file-info">
                <span class="file-name">${item.name}</span>
                <span class="file-meta">${item.isFolder?'Folder':(item.obj.size?formatBytes(item.obj.size):'')}</span>
            </div>
        `;
        if(item.isFolder){
            div.onclick=e=>{
                if(e.target.tagName.toLowerCase()!=='input'){ path.push(item.name); renderFiles(); }
            };
        } else {
            div.querySelector('.file-info').onclick=()=>previewFile(item.name);
            div.querySelector('.file-icon').onclick=()=>previewFile(item.name);
        }
        div.querySelector('.file-info').ondblclick=()=>showDetails(item.name,item.isFolder);
        fileArea.appendChild(div);
    });
    if(fileArea) fileArea.style.gridTemplateColumns=isGrid?'repeat(auto-fill,minmax(180px,1fr))':'repeat(auto-fill,minmax(240px,1fr))';
    const viewIcon=document.getElementById('viewIcon');
    if(viewIcon) viewIcon.innerText=isGrid?'grid_view':'view_list';
}

// ======= File Utilities =======
function getFileIcon(name,isFolder){
    if(isFolder) return '<span class="material-symbols-outlined">folder</span>';
    let ext=name.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return '<span class="material-symbols-outlined">image</span>';
    if(['pdf','doc','docx','txt','xlsx','xls','pptx','csv','md'].includes(ext)) return '<span class="material-symbols-outlined">description</span>';
    if(['mp4','mov','avi','webm','mkv'].includes(ext)) return '<span class="material-symbols-outlined">movie</span>';
    return '<span class="material-symbols-outlined">insert_drive_file</span>';
}
function formatBytes(bytes){ if(bytes<1024)return bytes+' B'; else if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB'; else return (bytes/(1024*1024)).toFixed(2)+' MB'; }

// ======= Search, Filter & Sort =======
function searchFiles(q){ searchQuery=q; renderFiles(); }
function filterFiles(type){ activeFilter=type; highlightFilterButton(type); renderFiles(); }
function highlightFilterButton(type){
    document.querySelectorAll('.filter-btn').forEach(btn=>btn.classList.remove('active'));
    const btn=document.getElementById('filter'+type.charAt(0).toUpperCase()+type.slice(1));
    if(btn) btn.classList.add('active');
}
function sortFiles(){ sortOrder=sortOrder==='name'?'size':'name'; renderFiles(); showToast('Sorted by '+(sortOrder==='name'?'Name':'Size')); }
function toggleView(){ isGrid=!isGrid; renderFiles(); }

// ======= FAB & Selection =======
function fabAction(){
    if(selectedItems.length>0){
        document.getElementById('fileOperations').style.display='flex';
        document.getElementById('fabMenu').style.display='none';
    } else {
        const fabMenu=document.getElementById('fabMenu');
        if(fabMenu) fabMenu.style.display=fabMenu.style.display==='flex'?'none':'flex';
        const operations=document.getElementById('fileOperations');
        if(operations) operations.style.display='none';
    }
}
function updateFabIcon(){
    const fab=document.getElementById('fabBtn');
    if(!fab) return;
    fab.innerHTML=selectedItems.length>0?'<span class="material-symbols-outlined">edit</span>':'<span class="material-symbols-outlined">add</span>';
}
function toggleSelect(cb,name,isFolder){
    if(cb.checked) selectedItems.push({name,isFolder});
    else selectedItems=selectedItems.filter(i=>i.name!==name||i.isFolder!==isFolder);
    updateFabIcon();
    toggleFileOperations(false);
}
function toggleFileOperations(show){ const op=document.getElementById('fileOperations'); if(op) op.style.display=show?'flex':'none'; }
function cancelSelection(){ selectedItems=[]; document.querySelectorAll('#fileArea input[type=checkbox]').forEach(cb=>cb.checked=false); updateFabIcon(); toggleFileOperations(false); }

// ======= CRUD Operations =======
function createFolder(){
    const name=prompt('Folder Name:'); if(!name||name.includes('/')) return showToast('Invalid folder name');
    const f=getCurrentFolder();
    if(f[name]) return showToast('Already exists');
    f[name]={}; localStorage.setItem('files',JSON.stringify(files)); renderFiles(); showToast('Folder created');
}
function uploadFile(){ document.getElementById('fileInput').click(); const fabMenu=document.getElementById('fabMenu'); if(fabMenu) fabMenu.style.display='none'; }
function handleFileUpload(e){
    const f=getCurrentFolder();
    for(const file of e.target.files){
        const reader=new FileReader();
        reader.onload=function(ev){ f[file.name]={content:ev.target.result,size:file.size,type:file.type,lastModified:file.lastModified}; localStorage.setItem('files',JSON.stringify(files)); renderFiles(); showToast('File uploaded: '+file.name); };
        reader.readAsDataURL(file);
    }
    e.target.value='';
}
function confirmDeleteSelected(){ if(selectedItems.length===0) return showToast('No items selected'); if(confirm('Delete selected?')) deleteSelected(); }
function deleteSelected(){ const f=getCurrentFolder(); selectedItems.forEach(i=>delete f[i.name]); selectedItems=[]; localStorage.setItem('files',JSON.stringify(files)); renderFiles(); showToast('Deleted'); }
function renameSelected(){ 
    if(selectedItems.length!==1) return showToast('Select one item'); 
    const oldName=selectedItems[0].name; const newName=prompt('New name:',oldName); 
    if(!newName||newName.includes('/')) return showToast('Invalid name'); 
    const f=getCurrentFolder(); if(f[newName]) return showToast('Name exists'); 
    f[newName]=f[oldName]; delete f[oldName]; localStorage.setItem('files',JSON.stringify(files)); renderFiles(); showToast('Renamed'); 
}
function downloadSelected(){ selectedItems.forEach(i=>{ const f=getCurrentFolder()[i.name]; if(!i.isFolder){ const a=document.createElement('a'); a.href=f.content; a.download=i.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); } }); cancelSelection(); showToast('Downloaded'); }
function previewSelected(){ if(selectedItems.length!==1) return showToast('Select one item'); previewFile(selectedItems[0].name); selectedItems=[]; updateFabIcon(); toggleFileOperations(false); }
function previewFile(name){
    const f=getCurrentFolder()[name]; if(!f) return showToast('File not found!');
    const modal=document.getElementById('previewModal'); const content=document.getElementById('previewContent'); if(!modal||!content) return;
    content.innerHTML=`<h4>${name}</h4>`;
    let ext=name.split('.').pop().toLowerCase();
    if(['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) content.innerHTML+=`<img src="${f.content}" alt="${name}" style="border-radius:12px;box-shadow:0 4px 18px rgba(25,118,210,0.13);"/>`;
    else if(['pdf'].includes(ext)) content.innerHTML+=`<iframe src="${f.content}" style="width:100%;height:70vh;border:none;"></iframe>`;
    else if(['txt','md','js','json','css','html','csv'].includes(ext)){
        let reader=new FileReader();
        reader.onload=function(ev){ content.innerHTML+=`<pre style="width:100%;max-height:60vh;">${ev.target.result}</pre>`; };
        reader.readAsText(dataURLtoBlob(f.content));
    } else content.innerHTML+=`<p style="color:var(--color-muted);">Preview not available</p><a href="${f.content}" download="${name}" class="filter-btn" style="margin-top:12px;">Download</a>`;
    modal.style.display='flex';
}
function showDetails(name,isFolder){
    const f=getCurrentFolder()[name]; if(!f) return showToast('File not found!');
    let html=`<h3>Details for: ${name}</h3><ul style="font-size:15px;line-height:1.6;margin:14px 0 0 0;">`;
    html+=`<li>Type: ${isFolder?'Folder':(f.type||'Unknown')}</li>`;
    html+=`<li>Size: ${isFolder?'N/A':formatBytes(f.size||0)}</li>`;
    html+=`<li>Last Modified: ${isFolder?'N/A':(f.lastModified?new Date(f.lastModified).toLocaleString():'N/A')}</li>`;
    html+=`<li>Path: ${path.join('/')}/${name}</li></ul>`;
    const modal=document.getElementById('detailsContent'); if(modal) modal.innerHTML=html;
    const container=document.getElementById('detailsModal'); if(container) container.style.display='flex';
}

// ======= Utilities =======
function dataURLtoBlob(dataurl){
    var arr=dataurl.split(','), mime=arr[0].match(/:(.*?);/)[1], bstr=atob(arr[1]), n=bstr.length, u8arr=new Uint8Array(n);
    while(n--){ u8arr[n]=bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
}
function showToast(msg){
    const t=document.getElementById('toast'); if(!t) return;
    t.innerText=msg; t.style.display='block'; setTimeout(()=>{ t.style.display='none'; },1800);
}
// ======= Drag & Drop =======
document.addEventListener('dragover', function(e) { e.preventDefault(); }, false);
document.addEventListener('drop', function(e) {
    const localPageActive = document.getElementById('localPage')?.classList.contains('active');
    const cloudPageActive = document.getElementById('cloudPage')?.classList.contains('active');
    if(localPageActive || cloudPageActive){
        e.preventDefault();
        if(e.dataTransfer.files && e.dataTransfer.files.length){
            document.getElementById('fileInput').files = e.dataTransfer.files;
            handleFileUpload({target:{files:e.dataTransfer.files}});
        }
    }
}, false);

// ======= Initial Page Load =======
if(window.location.hash){
    let page=window.location.hash.replace('#','');
    if(document.getElementById(page)) showPage(page);
} else showPage('homePage');

function showPage(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const page=document.getElementById(id);
    if(page) page.classList.add('active');
    updateFABVisibility(id);
    if(id==='localPage' || id==='cloudPage') renderFiles();
}

// ======= FAB Visibility Control =======
function updateFABVisibility(pageId){
    const fab=document.getElementById('fab');
    if(!fab) return;
    if(pageId==='localPage' || pageId==='cloudPage') fab.style.display='flex';
    else fab.style.display='none';
}

// ======= Back to Dashboard =======
function goDashboard(){
    if(confirm('Go back to Dashboard?')) showPage('homePage');
}

// ======= File Filter Buttons =======
function clearFilters(){ activeFilter=null; document.querySelectorAll('.filter-btn').forEach(btn=>btn.classList.remove('active')); renderFiles(); }

// ======= End of script.js =======
