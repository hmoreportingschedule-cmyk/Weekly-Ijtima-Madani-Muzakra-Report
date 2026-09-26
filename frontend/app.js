const API_URL="https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";
let session=null,locations=[],progressType="Ijtima",progressRows=[];

const $=id=>document.getElementById(id);
const msg=(id,t,ok=false)=>{if($(id)){ $(id).textContent=t;$(id).style.color=ok?"#087f5b":"#c92a2a"; }};
async function api(action,payload={}){
  if(!API_URL.startsWith("http"))throw Error("Google Apps Script URL is not configured.");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload}),signal:controller.signal,cache:"no-store"});
    if(!r.ok)throw Error("Server error: "+r.status);
    const d=await r.json();if(!d.ok)throw Error(d.error||"Request failed");return d;
  }catch(e){if(e.name==="AbortError")throw Error("Server response is taking too long.");throw e}
  finally{clearTimeout(timer)}
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clock(){const d=new Date();$("clock").textContent=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" • "+d.toLocaleTimeString("en-IN",{hour12:true})}
setInterval(clock,1000);clock();


async function login(){
  $("loginBtn").disabled=true;$("loginBtn").textContent="Logging in…";msg("loginMsg","Connecting…",true);
  try{
    const d=await api("login",{username:$("username").value.trim(),password:$("password").value});
    session=d.user;$("loginCard").hidden=true;$("dashboard").hidden=false;$("notificationBell").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;$("roleBadge").textContent=session.role;
    buildNav();
    // Do not block login on the large master dataset. Load it after UI is visible.
    setTimeout(loadLocationsFast,30);setTimeout(loadMyReports,120);
  }catch(e){msg("loginMsg",e.message)}finally{$("loginBtn").disabled=false;$("loginBtn").textContent="Login"}
}
$("loginBtn").onclick=login;$("password").onkeydown=e=>{if(e.key==="Enter")login()};

$("logoutBtn").onclick=async()=>{
  try{if(session?.token)await api("logout",{sessionToken:session.token})}catch(e){}
  session=null;locations=[];
  $("dashboard").hidden=true;$("loginCard").hidden=false;$("notificationBell").hidden=true;
  $("username").value="";$("password").value="";$("loginMsg").textContent="";
  document.querySelectorAll(".tab").forEach(x=>x.hidden=true);
  window.scrollTo({top:0,behavior:"smooth"});
};

if($("showChangePassword"))$("showChangePassword").onclick=()=>{$("changePasswordBox").hidden=false;$("cpUserId").value=$("username").value.trim();$("cpOld").focus()};
if($("closeChangePassword"))$("closeChangePassword").onclick=()=>{$("changePasswordBox").hidden=true;$("changePasswordMsg").textContent=""};
if($("changePasswordBtn"))$("changePasswordBtn").onclick=async()=>{
  try{
    const uid=$("cpUserId").value.trim(),oldp=$("cpOld").value,newp=$("cpNew").value,conf=$("cpConfirm").value;
    if(!uid||!oldp||!newp)throw Error("User ID, Old Password and New Password are required.");
    if(newp!==conf)throw Error("New Password and Confirm Password do not match.");
    if(newp.length<6)throw Error("New Password must be at least 6 characters.");
    const d=await api("changePasswordPreLogin",{userId:uid,oldPassword:oldp,newPassword:newp});
    msg("changePasswordMsg",d.message,true);
    $("cpOld").value="";$("cpNew").value="";$("cpConfirm").value="";
    setTimeout(()=>{$("changePasswordBox").hidden=true},1200);
  }catch(e){msg("changePasswordMsg",e.message)}
};

$("changePasswordInside").onclick=async()=>{
  try{
    const oldp=$("inOldPassword").value,newp=$("inNewPassword").value,conf=$("inConfirmPassword").value;
    if(!oldp||!newp)throw Error("Old Password and New Password are required.");
    if(newp!==conf)throw Error("New Password and Confirm Password do not match.");
    const d=await api("changePassword",{sessionToken:session.token,oldPassword:oldp,newPassword:newp});
    msg("profileMsg",d.message,true);$("inOldPassword").value="";$("inNewPassword").value="";$("inConfirmPassword").value="";
  }catch(e){msg("profileMsg",e.message)}
};


function buildNav(){
  $("nav").innerHTML="";
  addNav("profileTab","User Profile");
  if(session.role==="Admin"){addNav("adminTab","Admin");addNav("adminReportsTab","Reports");addNav("progressTab","Progress Report");$("adminTab").hidden=false;$("adminReportsTab").hidden=false;setTimeout(()=>document.querySelector('#nav button:nth-child(2)')?.click(),0)}
  else{addNav("userTab","Reports");addNav("progressTab","Progress Report");$("userTab").hidden=false;setTimeout(()=>document.querySelector('#nav button:nth-child(2)')?.click(),0)}
}
function addNav(id,label){const b=document.createElement("button");b.textContent=label;b.onclick=async()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=true);$(id).hidden=false;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(id==="profileTab")await loadProfileView();};$("nav").appendChild(b)}
async function loadProfileView(){try{const d=await api("profile",{sessionToken:session.token}),p=d.profile;["UserId","Username","Name","Role","Country","Region","State","Division","District","Area","Pincode","Locality","Masjid"].forEach(k=>{const el=$("profile"+k);if(el)el.textContent=p[k.charAt(0).toLowerCase()+k.slice(1)]||"All"});const initials=(p.name||p.username||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();$("profileInitials").textContent=initials;if(p.photoUrl){$("profilePhoto").src=p.photoUrl;$("profilePhoto").hidden=false;$("profileInitials").hidden=true}else{$("profilePhoto").hidden=true;$("profileInitials").hidden=false}}catch(e){msg("profileMsg",e.message)}}
document.addEventListener("click",e=>{const p=e.target.dataset.panel;if(!p)return;document.querySelectorAll(".panel").forEach(x=>x.hidden=true);$(p).hidden=false});

async function loadLocationsFast(){try{const d=await api("getLocations",{sessionToken:session.token});locations=d.locations||[];setupCascades();setupUserCascades();setupVolunteerCascades();if(session.role!=="Admin")document.querySelector('[data-panel="userIjtima"]')?.click()}catch(e){msg("loginMsg",e.message)}}

function uniq(rows,key){return [...new Set(rows.map(x=>x[key]).filter(Boolean))]}
function fill(id,vals){if(!$(id))return;$(id).innerHTML='<option value="">Select</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}
function currentFilters(){
  return {
    country:$("rCountry")?.value||"",
    region:$("rRegion")?.value||"",
    state:$("rState")?.value||"",
    division:$("rDivision")?.value||"",
    district:$("rDistrict")?.value||"",
    area:$("rArea")?.value||"",
    pincode:$("rPincode")?.value||"",
    locality:$("rLocality")?.value||"",
    masjidName:$("rMasjid")?.value||""
  };
}
function filtered(){
  const f=currentFilters();
  return locations.filter(r=>Object.entries(f).every(([k,v])=>!v||String(r[k]||"")===String(v)));
}
const LOCATION_LEVELS=[
  ["Country","country"],["Region","region"],["State","state"],["Division","division"],
  ["District","district"],["Area","area"],["Pincode","pincode"],["Locality","locality"],["Masjid","masjidName"]
];
function valuesForLocation(rows,key){
  return [...new Set(rows.map(r=>String(r[key]??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function parentRows(levelIndex, source=locations){
  let rows=source;
  for(let i=0;i<levelIndex;i++){
    const [id,key]=LOCATION_LEVELS[i];
    const el=$("r"+id);
    const value=el?.value||"";
    if(value) rows=rows.filter(r=>String(r[key]??"")===value);
  }
  return rows;
}
function resetLocationSelect(id, values, allLabel="All"){
  const el=$(id);if(!el)return;
  const old=el.value;
  el.innerHTML=`<option value="">${allLabel}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(values.includes(old))el.value=old;
}
function setupCascades(){
  LOCATION_LEVELS.forEach(([id,key],i)=>{
    const el=$("r"+id);if(!el)return;
    el.onchange=()=>updateReportCascade(i);
  });
  resetLocationSelect("rCountry",valuesForLocation(locations,"country"));
  for(let i=1;i<LOCATION_LEVELS.length;i++){
    const [id,key]=LOCATION_LEVELS[i];
    resetLocationSelect("r"+id,valuesForLocation(parentRows(i),""));
    resetLocationSelect("r"+id,valuesForLocation(parentRows(i),key));
  }
  if($("rDay"))$("rDay").innerHTML='<option value="">Select</option>';
}
function updateReportCascade(changedIndex){
  // Clear every lower level first; then populate it only from the selected parent chain.
  for(let i=changedIndex+1;i<LOCATION_LEVELS.length;i++){
    const [id,key]=LOCATION_LEVELS[i];
    resetLocationSelect("r"+id,valuesForLocation(parentRows(i),key));
  }
  const rows=filtered();
  if(rows.length){
    const r=rows[0];
    if($("rDay"))$("rDay").value=r.ijtimaDay||"";
    showIjtimaDate(r.ijtimaDay);
  }else if($("rDay")){
    $("rDay").value="";
    showIjtimaDate("");
  }
}

function showIjtimaDate(day){
  const wanted=String(day||"Thursday");$("ijtimaDateInfo").textContent=`This Masjid's Ijtima Day: ${wanted}`;
  $("nextReportDate").textContent="Next reporting date: "+nextDateForDay(wanted);
}
function nextDateForDay(day){const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],idx=names.findIndex(x=>x.toLowerCase()===String(day).toLowerCase()),n=idx<0?4:idx,d=new Date(),diff=(n-d.getDay()+7)%7;d.setDate(d.getDate()+diff);return d.toISOString().slice(0,10)}

function volRow(target){
  const d=document.createElement("div");d.className="vol";
  d.innerHTML='<input class="vname" placeholder="Volunteer Name"><input class="vmobile" placeholder="Mobile"><input class="vwhatsapp" placeholder="Whatsapp"><input class="vlevel" placeholder="Zimmedari Level"><button type="button" class="secondary">Remove</button>';
  d.querySelector("button").onclick=()=>d.remove();$(target).appendChild(d)
}
$("addVolunteer").onclick=()=>volRow("volunteers");$("addVolunteerOnly").onclick=()=>volRow("volunteerOnlyRows");

async function submitIjtima(status){
  const r=filtered()[0],p=$("participants").value;if(!r)return msg("reportMsg","Please select a valid Masjid.");
  if(p===""||!Number.isInteger(Number(p))||Number(p)<0)return msg("reportMsg","Participants must be a whole number.");
  const volunteers=[...document.querySelectorAll("#volunteers .vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim(),details:x.querySelector(".vdetails").value.trim()}));
  try{await api("saveReport",{sessionToken:session.token,type:"Ijtima",report:{weekDate:nextDateForDay(r.ijtimaDay),...r,participants:Number(p),volunteers,status}});msg("reportMsg",status==="Draft"?"Draft saved.":"Report submitted successfully.",true)}catch(e){msg("reportMsg",e.message)}
}
$("saveIjtimaDraft").onclick=()=>submitIjtima("Draft");$("submitIjtima").onclick=()=>submitIjtima("Submitted");

function downloadTemplate(type){
  const headers=type==="Ijtima"?["Country","Region","State","Division","District","Area","Locality","Masjid Name","Pincode","Ijtima Day"]:["Country","Region","State","Division","District","Area","Pincode","Masjid Name","Volunteer Name","Mobile","Whatsapp","Zimmedari Level"];
  const sample=type==="Ijtima"?["India","","","","","","","Example Masjid","400001","Thursday"]:["India","","","","","","400001","Example Masjid","Example Volunteer","9876543210","9876543210","Area Volunteer"];
  const ws=XLSX.utils.aoa_to_sheet([headers,sample]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,type==="Ijtima"?"Weekly Ijtima Master":"Volunteer Data");
  XLSX.writeFile(wb,type==="Ijtima"?"Weekly-Ijtima-Master-Format.xlsx":"Volunteer-Data-Format.xlsx");
}
$("downloadIjtimaTemplate").onclick=()=>downloadTemplate("Ijtima");
document.querySelectorAll("#downloadVolunteerTemplate").forEach(b=>b.onclick=()=>downloadTemplate("Volunteer"));

async function importFile(input,msgId,type){
  const f=input.files[0];if(!f)return msg(msgId,"Please select an Excel/CSV file.");
  try{const buf=await f.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:""});if(!rows.length)throw Error("File has no data.");await api("importData",{sessionToken:session.token,type,rows});msg(msgId,"Imported successfully. The selected file has been cleared from the form.",true);input.value="";if(type==="IjtimaMaster")loadLocationsFast()}catch(e){msg(msgId,e.message)}
}
$("importIjtima").onclick=()=>importFile($("ijtimaFile"),"ijtimaMsg","IjtimaMaster");
$("importVolunteer").onclick=()=>importFile($("volunteerFile"),"volunteerMsg","Volunteer");

function downloadTargetTemplate(){
  const headers=["Type","Period Type","Period","Country","Region","State","Division","District","Area","Pincode","Locality","Masjid Name","Target","Notes"];
  const sample=[
    ["Ijtima","Weekly",new Date().toISOString().slice(0,10),"India","","","","","","","","Example Masjid",100,"Weekly Ijtima target"],
    ["Muzakra","Monthly",new Date().toISOString().slice(0,7),"India","","","","","","","","",500,"Monthly Madani Muzakra target"],
    ["Ijtima","Yearly",String(new Date().getFullYear()),"India","","","","","","","","",5000,"Yearly Ijtima target"]
  ];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,...sample]),"Targets");
  XLSX.writeFile(wb,"Weekly-Ijtima-Targets-Format.xlsx");
}
$("downloadTargetTemplate").onclick=downloadTargetTemplate;
$("importTargets").onclick=async()=>{
  try{
    const f=$("targetFile").files[0];if(!f)throw Error("Select Target Excel/CSV file.");
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
    if(!rows.length)throw Error("Target file has no data.");
    const d=await api("importTargets",{sessionToken:session.token,rows});
    $("targetFile").value="";msg("targetMsg","Imported "+d.imported+" target rows for year(s): "+d.years.join(", "),true);
  }catch(e){msg("targetMsg",e.message)}
};


const USER_LEVELS=[
  ["Country","country"],["Region","region"],["State","state"],["Division","division"],
  ["District","district"],["Area","area"],["Pincode","pincode"],["Locality","locality"],["Masjid","masjidName"]
];
function norm(v){return String(v??"").trim().toLowerCase()}
function rowsForUserLevel(level){
  let rows=locations.slice();
  for(let i=0;i<level;i++){
    const [id,key]=USER_LEVELS[i],v=$("u"+id)?.value||"";
    if(v && norm(v)!=="all") rows=rows.filter(r=>norm(r[key])===norm(v));
  }
  return rows;
}
function userOptions(level){return valuesForLocation(rowsForUserLevel(level),USER_LEVELS[level][1])}
function resetUserSelect(id,values,label="All"){
  const el=$("u"+id);if(!el)return;
  const old=el.value;
  const vals=[...new Set((values||[]).map(v=>String(v).trim()).filter(Boolean))];
  el.innerHTML='<option value="">'+label+'</option>'+vals.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
  if(vals.some(v=>norm(v)===norm(old)))el.value=old;
}
function deepestUserSelection(){
  let d=-1;
  USER_LEVELS.forEach(([id],i)=>{const v=$("u"+id)?.value||"";if(v&&norm(v)!=="all")d=i});
  return d;
}
function updateAssignmentUI(){
  const d=deepestUserSelection();
  USER_LEVELS.forEach(([id],i)=>{
    const field=document.querySelector('.assignment-field[data-level="'+i+'"]');
    if(field)field.hidden=d>=0 && i<=d;
  });
  const ctx=$("userAssignmentContext"),btn=$("resetUserAssignment");
  if(d>=0){
    const parts=[];
    for(let i=0;i<=d;i++){const [id,label]=USER_LEVELS[i];const v=$("u"+id)?.value;if(v&&norm(v)!=="all")parts.push(label+": "+v)}
    ctx.hidden=false;ctx.textContent="Assigned: "+parts.join("  •  ");
    btn.hidden=false;
  }else{ctx.hidden=true;ctx.textContent="";btn.hidden=true}
}
function clearUserBelow(i){
  for(let j=i+1;j<USER_LEVELS.length;j++)resetUserSelect(USER_LEVELS[j][0],[],"All");
}
function updateUserCascade(changed){
  clearUserBelow(changed);
  for(let j=changed+1;j<USER_LEVELS.length;j++)resetUserSelect(USER_LEVELS[j][0],userOptions(j),"All");
  updateAssignmentUI();
}
function setupUserCascades(){
  USER_LEVELS.forEach(([id],i)=>{const el=$("u"+id);if(el)el.onchange=()=>updateUserCascade(i)});
  resetUserSelect("uCountry",valuesForLocation(locations,"country"),"All");
  for(let i=1;i<USER_LEVELS.length;i++)resetUserSelect(USER_LEVELS[i][0],userOptions(i),"All");
  updateAssignmentUI();
}
$("resetUserAssignment").onclick=()=>{
  USER_LEVELS.forEach(([id])=>resetUserSelect(id,[],"All"));
  resetUserSelect("uCountry",valuesForLocation(locations,"country"),"All");
  for(let i=1;i<USER_LEVELS.length;i++)resetUserSelect(USER_LEVELS[i][0],userOptions(i),"All");
  updateAssignmentUI();
};
$("saveUser").onclick=async()=>{
  try{
    const u={userId:$("uId").value.trim(),username:$("uUsername").value.trim(),name:$("uName").value.trim(),role:$("uRole").value,active:$("uActive").value,password:$("uPassword").value};
    if(!u.userId||!u.username)throw Error("User ID and Username are required.");
    USER_LEVELS.forEach(([id,key])=>u[key]=$("u"+id)?.value||"All");
    const d=await api("saveUser",{sessionToken:session.token,user:u});
    msg("userMsg",d.message,true);updateAssignmentUI();
  }catch(e){msg("userMsg",e.message)}
};
$("downloadUserTemplate").onclick=()=>{const headers=['User ID','Username','Password','Name','Role','Active','Country','Region','State','Division','District','Area','Pincode','Locality','Masjid Name'];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers]),'Users');XLSX.writeFile(wb,'Weekly-Ijtima-Users-Format.xlsx')};
$("importUsers").onclick=async()=>{try{const f=$("userFile").files[0];if(!f)throw Error('Select Excel/CSV file.');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const d=await api('importUsers',{sessionToken:session.token,rows});msg('userImportMsg','Imported '+d.imported+' users.',true);$("userFile").value=''}catch(e){msg('userImportMsg',e.message)}};

$("submitMuzakra").onclick=async()=>{try{const p=$("mParticipants").value;if(!Number.isInteger(Number(p))||Number(p)<0)throw Error("Participants must be a whole number.");await api("saveReport",{sessionToken:session.token,type:"Muzakra",report:{weekDate:$("mDate").value,participants:Number(p),status:"Submitted"}});msg("muzakraUserMsg","Madani Muzakra report submitted separately.",true)}catch(e){msg("muzakraUserMsg",e.message)}};
const VOL_LEVELS=[
  ["Country","country"],["Region","region"],["State","state"],["Division","division"],
  ["District","district"],["Area","area"],["Pincode","pincode"],["Masjid","masjidName"]
];
function volRowsFor(i){
  let rows=locations;
  for(let j=0;j<i;j++){
    const [id,key]=VOL_LEVELS[j],v=$("v"+id)?.value||"";
    if(v)rows=rows.filter(r=>String(r[key]??"")===String(v));
  }
  return rows;
}
function setupVolunteerCascades(){
  VOL_LEVELS.forEach(([id,key],i)=>{
    const el=$("v"+id);if(!el)return;
    el.onchange=()=>{
      for(let j=i+1;j<VOL_LEVELS.length;j++){
        const [nextId,nextKey]=VOL_LEVELS[j];
        resetLocationSelect("v"+nextId,valuesForLocation(volRowsFor(j),nextKey));
      }
    };
  });
  resetLocationSelect("vCountry",valuesForLocation(locations,"country"));
  for(let i=1;i<VOL_LEVELS.length;i++){
    const [id,key]=VOL_LEVELS[i];
    resetLocationSelect("v"+id,valuesForLocation(volRowsFor(i),key));
  }
}
$("submitVolunteer").onclick=async()=>{
  try{
    const location={
      country:$("vCountry")?.value||"",region:$("vRegion")?.value||"",state:$("vState")?.value||"",
      division:$("vDivision")?.value||"",district:$("vDistrict")?.value||"",area:$("vArea")?.value||"",
      pincode:$("vPincode")?.value||"",masjidName:$("vMasjid")?.value||""
    };
    if(!location.region||!location.state||!location.division||!location.district||!location.pincode)
      throw Error("Please select Country, Region, State, Division, District and Pincode.");
    const rows=[...document.querySelectorAll("#volunteerOnlyRows .vol")].map(x=>({
      name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim(),
      whatsapp:x.querySelector(".vwhatsapp").value.trim(),zimmedariLevel:x.querySelector(".vlevel").value.trim()
    })).filter(x=>x.name);
    if(!rows.length)throw Error("At least one volunteer is required.");
    await api("saveVolunteer",{sessionToken:session.token,location,rows});
    msg("volunteerUserMsg","Volunteer data saved successfully.",true);
  }catch(e){msg("volunteerUserMsg",e.message)}
};


let editingReportId=null,editingReportType='Ijtima';
function reportEditButton(r,type,admin=false){
  const allowed=admin||Number(r.editCount||0)<3;
  return allowed?`<button class="secondary report-edit-btn" data-report-id="${esc(r.reportId)}" data-report-type="${type}">Edit</button>`:`<span class="edit-limit">3/3 edits used</span>`;
}
function reportTable(rows,type,admin=false){
  if(!rows.length)return '<div class="notification-empty">No reports found for the selected period.</div>';
  return `<div class="table-wrap"><table class="progress-table"><thead><tr><th>Date</th><th>Masjid</th><th>Participants</th><th>Status</th><th>Edits</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.masjidName||'Madani Muzakra')}</td><td>${fmt(r.participants)}</td><td>${esc(r.status)}</td><td>${admin?'Unlimited':String(r.editCount)+'/3'}</td><td>${reportEditButton(r,type,admin)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function loadMyReports(){
  try{const from=$('myFromDate')?.value||'1900-01-01',to=$('myToDate')?.value||'2999-12-31';const d=await api('listReports',{sessionToken:session.token,type:'Ijtima',from,to});$('myReportsResult').innerHTML=reportTable(d.reports,'Ijtima',false);bindReportEditors();}catch(e){$('myReportsResult').innerHTML=`<div class="error-box">${esc(e.message)}</div>`}
}
function bindReportEditors(){document.querySelectorAll('.report-edit-btn').forEach(b=>b.onclick=()=>openReportEditor(b.dataset.reportId,b.dataset.reportType));}
async function openReportEditor(id,type){
  try{const d=await api('listReports',{sessionToken:session.token,type,from:'1900-01-01',to:'2999-12-31'});const r=(d.reports||[]).find(x=>x.reportId===id);if(!r)throw Error('Report not found.');
    editingReportId=id;editingReportType=type;
    if(type==='Ijtima'){
      $('editReportDate').value=r.date;$('editParticipants').value=r.participants;$('editMasjid').value=r.masjidName||'';$('editReportId').value=id;$('editReportType').value=type;
    }else{$('editReportDate').value=r.date;$('editParticipants').value=r.participants;$('editMasjid').value='Madani Muzakra';$('editReportId').value=id;$('editReportType').value=type;}
    $('reportEditModal').hidden=false;
  }catch(e){alert(e.message)}
}
$('closeReportEditor').onclick=()=>{$('reportEditModal').hidden=true};$('closeReportEditor2').onclick=()=>{$('reportEditModal').hidden=true};
$('saveReportEdit').onclick=async()=>{try{const type=$('editReportType').value,id=$('editReportId').value,date=$('editReportDate').value,p=Number($('editParticipants').value);if(!date||!Number.isInteger(p)||p<0)throw Error('Valid date and whole-number participants required.');const payload={reportId:id,weekDate:date,participants:p,status:'Submitted'};if(type==='Ijtima'){const d=await api('listReports',{sessionToken:session.token,type,from:'1900-01-01',to:'2999-12-31'});const r=(d.reports||[]).find(x=>x.reportId===id);Object.assign(payload,{country:r.country,region:r.region,state:r.state,division:r.division,district:r.district,area:r.area,locality:r.locality,masjidName:r.masjidName,pincode:r.pincode,ijtimaDay:r.ijtimaDay,volunteers:JSON.parse(r.volunteers||'[]')});}const d=await api('updateReport',{sessionToken:session.token,type,report:payload});msg('editReportMsg',d.message,true);setTimeout(()=>{$('reportEditModal').hidden=true;loadMyReports();loadAdminReports()},500)}catch(e){msg('editReportMsg',e.message)}};
async function loadAdminReports(){try{const type=adminReportType,from=$('adminFromDate').value||'1900-01-01',to=$('adminToDate').value||'2999-12-31';const d=await api('listReports',{sessionToken:session.token,type,from,to});$('adminReportsResult').innerHTML=reportTable(d.reports,type,true);bindReportEditors();}catch(e){$('adminReportsResult').innerHTML=`<div class="error-box">${esc(e.message)}</div>`}}
let adminReportType='Ijtima';
$('loadAdminReports').onclick=loadAdminReports;
$('adminReportIjtimaBtn').onclick=()=>{adminReportType='Ijtima';$('adminReportIjtimaBtn').classList.add('active');$('adminReportMuzakraBtn').classList.remove('active');loadAdminReports()};
$('adminReportMuzakraBtn').onclick=()=>{adminReportType='Muzakra';$('adminReportMuzakraBtn').classList.add('active');$('adminReportIjtimaBtn').classList.remove('active');loadAdminReports()};
$('loadMyReports').onclick=loadMyReports;

function periodLabel(date,mode){const d=new Date(date);if(mode==="year")return String(d.getFullYear());if(mode==="month")return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return String(date).slice(0,10)}
function fmt(n){return Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0})}
function pct(n){return n==null?"—":Number(n).toLocaleString("en-IN",{maximumFractionDigits:1})+"%"}
let charts={};
function destroyChart(id){if(charts[id]){charts[id].destroy();charts[id]=null}}
function makeProgressCharts(rows){
  const labels=rows.map(x=>x.period);
  destroyChart("progressChart");destroyChart("trendChart");destroyChart("achievementChart");
  const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"top"},tooltip:{mode:"index",intersect:false}},scales:{y:{beginAtZero:true,grid:{color:"#e8eeee"}}}};
  charts.progressChart=new Chart($("progressChart"),{type:"bar",data:{labels,datasets:[
    {label:"Actual",data:rows.map(x=>x.actual),borderRadius:7},
    {label:"Target",data:rows.map(x=>x.target),borderRadius:7}
  ]},options:common});
  charts.trendChart=new Chart($("trendChart"),{type:"line",data:{labels,datasets:[
    {label:"Actual",data:rows.map(x=>x.actual),tension:.35,borderWidth:3,pointRadius:3},
    {label:"Target",data:rows.map(x=>x.target),tension:.35,borderWidth:3,pointRadius:3}
  ]},options:common});
  charts.achievementChart=new Chart($("achievementChart"),{type:"bar",data:{labels,datasets:[
    {label:"Achievement %",data:rows.map(x=>x.achievement),borderRadius:7}
  ]},options:{...common,scales:{y:{beginAtZero:true,max:100,ticks:{callback:v=>v+"%"},grid:{color:"#e8eeee"}}}}});
}
async function loadProgress(){
  try{
    const mode=$("compareMode").value;
    const d=await api("progress",{sessionToken:session.token,type:progressType,from:$("fromDate").value,to:$("toDate").value,mode});
    const rows=d.rows||[];
    const title=progressType==="Ijtima"?"Weekly Ijtima":"Madani Muzakra";
    makeProgressCharts(rows);
    const latest=rows.length?rows[rows.length-1]:null;
    const prev=rows.length>1?rows[rows.length-2]:null;
    const change=latest&&prev?latest.actual-prev.actual:null;
    const avgTarget=d.averageTarget||0,avgActual=d.averageActual||0;
    $("progressSummary").innerHTML=
      `<div class="stat stat-primary"><b>Total Actual</b><strong>${fmt(d.total)}</strong><span>Participants</span></div>
       <div class="stat"><b>Total Target</b><strong>${fmt(d.targetTotal)}</strong><span>Selected period</span></div>
       <div class="stat"><b>Achievement</b><strong>${pct(d.targetTotal?d.total/d.targetTotal*100:null)}</strong><span>Actual vs target</span></div>
       <div class="stat"><b>Average Actual</b><strong>${fmt(avgActual)}</strong><span>Average per ${mode}</span></div>
       <div class="stat"><b>Average Target</b><strong>${fmt(avgTarget)}</strong><span>Average per ${mode}</span></div>
       <div class="stat"><b>Average vs Average</b><strong>${pct(d.averageAchievement)}</strong><span>${change==null?"Latest comparison unavailable":(change>=0?"+":"")+fmt(change)+" vs previous"}</span></div>`;

    const modeText=mode==="week"?"Week to Week":mode==="month"?"Month to Month":"Year to Year";
    $("progressResult").innerHTML=
      `<div class="result-head"><div><span class="eyebrow">REPORT ANALYSIS</span><h3>${title} — ${modeText}</h3></div><div class="result-badge">${rows.length} Periods</div></div>
       <div class="table-wrap"><table class="progress-table"><thead><tr><th>Period</th><th>Actual</th><th>Target</th><th>Variance</th><th>Achievement</th></tr></thead>
       <tbody>${rows.map(x=>`<tr><td><b>${esc(x.period)}</b></td><td>${fmt(x.actual)}</td><td>${fmt(x.target)}</td><td class="${x.variance<0?"negative":"positive"}">${x.variance>0?"+":""}${fmt(x.variance)}</td><td>${pct(x.achievement)}</td></tr>`).join("")}</tbody></table></div>`;
  }catch(e){$("progressResult").innerHTML=`<div class="error-box">${esc(e.message)}</div>`}
}
$("loadProgress").onclick=loadProgress;
$("progressIjtimaBtn").onclick=()=>{progressType="Ijtima";$("progressIjtimaBtn").classList.add("active");$("progressMuzakraBtn").classList.remove("active");loadProgress()};
$("progressMuzakraBtn").onclick=()=>{progressType="Muzakra";$("progressMuzakraBtn").classList.add("active");$("progressIjtimaBtn").classList.remove("active");loadProgress()};
async function loadNotifications(){try{const d=await api('notifications',{sessionToken:session.token});const list=d.pending||[];const badge=$('notificationBadge');badge.textContent=list.length;badge.hidden=!list.length;$('notificationResult').innerHTML='<h3>Pending: '+list.length+'</h3><table><thead><tr><th>Masjid</th><th>Due Date</th><th>Message</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+esc(x.masjidName)+'</td><td>'+esc(x.dueDate)+'</td><td>'+esc(x.message)+'</td></tr>').join('')+'</tbody></table>'}catch(e){$('notificationResult').textContent=e.message}}
$('notificationBell').onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.hidden=true);$('notificationTab').hidden=false;loadNotifications()};
$('closeNotifications').onclick=()=>{document.querySelector('.tabs button')?.click()};