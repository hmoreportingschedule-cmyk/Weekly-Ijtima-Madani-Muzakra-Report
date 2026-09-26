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
    setTimeout(loadLocationsFast,30);
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

$("profileBtn").onclick=async()=>{
  document.querySelectorAll(".tab").forEach(x=>x.hidden=true);
  $("profileTab").hidden=false;
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  const btn=[...document.querySelectorAll(".tabs button")].find(x=>x.textContent==="User Profile");if(btn)btn.classList.add("active");
  try{
    const d=await api("profile",{sessionToken:session.token});
    const p=d.profile;
    ["UserId","Username","Name","Role","Country","Region","State","Division","District","Area","Pincode","Locality","Masjid"].forEach(k=>{
      const el=$("profile"+k);if(el)el.textContent=p[k.charAt(0).toLowerCase()+k.slice(1)]||"All";
    });
    const initials=(p.name||p.username||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    $("profileInitials").textContent=initials;
    if(p.photoUrl){$("profilePhoto").src=p.photoUrl;$("profilePhoto").hidden=false;$("profileInitials").hidden=true}
    else{$("profilePhoto").hidden=true;$("profileInitials").hidden=false}
  }catch(e){msg("profileMsg",e.message)}
};

$("showChangePassword").onclick=()=>{$("changePasswordBox").hidden=false;$("cpUserId").value=$("username").value.trim()};
$("closeChangePassword").onclick=()=>{$("changePasswordBox").hidden=true;$("changePasswordMsg").textContent=""};
$("changePasswordBtn").onclick=async()=>{
  try{
    const uid=$("cpUserId").value.trim(),oldp=$("cpOld").value,newp=$("cpNew").value,conf=$("cpConfirm").value;
    if(!uid||!oldp||!newp)throw Error("User ID, Old Password and New Password are required.");
    if(newp!==conf)throw Error("New Password and Confirm Password do not match.");
    if(newp.length<6)throw Error("New Password must be at least 6 characters.");
    const d=await api("changePasswordPreLogin",{userId:uid,oldPassword:oldp,newPassword:newp});
    msg("changePasswordMsg",d.message,true);
    $("cpOld").value="";$("cpNew").value="";$("cpConfirm").value="";
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
  if(session.role==="Admin"){addNav("adminTab","Admin");addNav("progressTab","Progress Report");$("adminTab").hidden=false}
  else{addNav("userTab","Reports");addNav("progressTab","Progress Report");$("userTab").hidden=false}
  $("nav").querySelector("button")?.click();
}
function addNav(id,label){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=true);$(id).hidden=false;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")};$("nav").appendChild(b)}
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

const USER_LEVELS=[
  ["Country","country"],["Region","region"],["State","state"],["Division","division"],
  ["District","district"],["Area","area"],["Pincode","pincode"],["Locality","locality"],["Masjid","masjidName"]
];

function userRowsFor(levelIndex){
  let rows=locations.slice();
  for(let j=0;j<levelIndex;j++){
    const [id,key]=USER_LEVELS[j];
    const value=$( "u"+id )?.value||"";
    if(value) rows=rows.filter(r=>String(r[key]??"").trim()===String(value).trim());
  }
  return rows;
}
function userOptions(levelIndex){
  const [,key]=USER_LEVELS[levelIndex];
  return valuesForLocation(userRowsFor(levelIndex),key);
}
function resetUserSelect(id, values, label="All"){
  const el=$(id); if(!el)return;
  const old=el.value;
  el.innerHTML='<option value="">'+label+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");
  if(values.includes(old))el.value=old;
}
function clearUserBelow(index){
  for(let j=index+1;j<USER_LEVELS.length;j++){
    const [id]=USER_LEVELS[j];
    resetUserSelect("u"+id,[],"All");
  }
}
function updateUserCascade(changedIndex){
  clearUserBelow(changedIndex);
  for(let j=changedIndex+1;j<USER_LEVELS.length;j++){
    const [id]=USER_LEVELS[j];
    resetUserSelect("u"+id,userOptions(j),"All");
  }
}
function setupUserCascades(){
  USER_LEVELS.forEach(([id],i)=>{
    const el=$("u"+id);
    if(el) el.onchange=()=>updateUserCascade(i);
  });
  USER_LEVELS.forEach(([id],i)=>resetUserSelect("u"+id,userOptions(i),"All"));
}

$("saveUser").onclick=async()=>{try{const u={userId:$("uId").value.trim(),username:$("uUsername").value.trim(),name:$("uName").value.trim(),role:$("uRole").value,active:$("uActive").value,password:$("uPassword").value};USER_LEVELS.forEach(([id])=>u[id.toLowerCase()==="masjid"?"masjidName":id.toLowerCase()]=$("u"+id)?.value||"All");const d=await api("saveUser",{sessionToken:session.token,user:u});msg("userMsg",d.message,true)}catch(e){msg("userMsg",e.message)}};
$("downloadUserTemplate").onclick=()=>{const headers=['User ID','Username','Password','Name','Role','Active','Country','Region','State','Division','District','Area','Pincode'];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers]),'Users');XLSX.writeFile(wb,'Weekly-Ijtima-Users-Format.xlsx')};
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

function periodLabel(date,mode){const d=new Date(date);if(mode==="year")return d.getFullYear();if(mode==="month")return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return date}
function aggregate(rows,mode){const m={};rows.forEach(r=>{const k=periodLabel(r.date,mode);m[k]=(m[k]||0)+(Number(r.participants)||0)});return Object.entries(m).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))).map(([label,value])=>({label,value}))}
function drawChart(data){const c=$("progressChart"),ctx=c.getContext("2d"),w=c.width=c.clientWidth*devicePixelRatio,h=c.height=280*devicePixelRatio;ctx.clearRect(0,0,w,h);if(!data.length)return;const max=Math.max(...data.map(x=>x.value),1),pad=35*devicePixelRatio,bw=(w-pad*2)/data.length*.65;data.forEach((x,i)=>{const x0=pad+i*((w-pad*2)/data.length)+(((w-pad*2)/data.length)-bw)/2,y=h-pad-(x.value/max)*(h-pad*2);ctx.fillStyle="#0d766e";ctx.fillRect(x0,y,bw,h-pad-y);ctx.fillStyle="#23343a";ctx.font=`${11*devicePixelRatio}px Arial`;ctx.textAlign="center";ctx.fillText(String(x.value),x0+bw/2,y-6*devicePixelRatio);ctx.fillText(String(x.label),x0+bw/2,h-pad+16*devicePixelRatio)});ctx.strokeStyle="#d7e0e3";ctx.beginPath();ctx.moveTo(pad,h-pad);ctx.lineTo(w-pad,h-pad);ctx.stroke()}
async function loadProgress(){
  try{
    const d=await api("progress",{sessionToken:session.token,type:progressType,from:$("fromDate").value,to:$("toDate").value});
    progressRows=d.rows||[];const mode=$("compareMode").value,data=aggregate(progressRows,mode);drawChart(data);
    const previous=data.length>1?data[data.length-2].value:null,current=data.length?data[data.length-1].value:0,change=previous===null?"—":(current-previous);
    $("progressSummary").innerHTML=`<div class="stat"><b>Total</b><strong>${Number(d.total||0).toLocaleString()}</strong></div><div class="stat"><b>Records</b><strong>${d.count}</strong></div><div class="stat"><b>Latest vs Previous</b><strong>${change==="—"?"—":(change>=0?"+":"")+change.toLocaleString()}</strong></div>`;
    $("progressResult").innerHTML=`<h3>${progressType==="Ijtima"?"Weekly Ijtima":"Madani Muzakra"} — ${mode==="week"?"Week to Week":mode==="month"?"Month to Month":"Year to Year"}</h3><table><thead><tr><th>Period</th><th>Participants</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.label)}</td><td>${Number(x.value).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
  }catch(e){$("progressResult").textContent=e.message}
}
$("loadProgress").onclick=loadProgress;
$("progressIjtimaBtn").onclick=()=>{progressType="Ijtima";$("progressIjtimaBtn").classList.add("active");$("progressMuzakraBtn").classList.remove("active");loadProgress()};
$("progressMuzakraBtn").onclick=()=>{progressType="Muzakra";$("progressMuzakraBtn").classList.add("active");$("progressIjtimaBtn").classList.remove("active");loadProgress()};
async function loadNotifications(){try{const d=await api('notifications',{sessionToken:session.token});const list=d.pending||[];const badge=$('notificationBadge');badge.textContent=list.length;badge.hidden=!list.length;$('notificationResult').innerHTML='<h3>Pending: '+list.length+'</h3><table><thead><tr><th>Masjid</th><th>Due Date</th><th>Message</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+esc(x.masjidName)+'</td><td>'+esc(x.dueDate)+'</td><td>'+esc(x.message)+'</td></tr>').join('')+'</tbody></table>'}catch(e){$('notificationResult').textContent=e.message}}
$('notificationBell').onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.hidden=true);$('notificationTab').hidden=false;loadNotifications()};
$('closeNotifications').onclick=()=>{document.querySelector('.tabs button')?.click()};