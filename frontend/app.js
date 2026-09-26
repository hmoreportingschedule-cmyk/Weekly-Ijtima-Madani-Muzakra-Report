const API_URL="https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";
let session=null,locations=[],progressType="Ijtima",progressRows=[];

const $=id=>document.getElementById(id);
const msg=(id,t,ok=false)=>{if($(id)){ $(id).textContent=t;$(id).style.color=ok?"#087f5b":"#c92a2a"; }};
async function api(action,payload={}){
  if(!API_URL.startsWith("http"))throw Error("Set API_URL in frontend/app.js");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload}),signal:controller.signal});
    const d=await r.json();if(!d.ok)throw Error(d.error||"Request failed");return d;
  }catch(e){if(e.name==="AbortError")throw Error("Server response timed out. Please try again.");throw e}
  finally{clearTimeout(timer)}
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clock(){
  const d=new Date();
  const text=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" • "+d.toLocaleTimeString("en-IN",{hour12:true});
  if($("clock"))$("clock").textContent=text;
  if($("dashboardClock"))$("dashboardClock").textContent=text;
}
setInterval(clock,1000);clock();


async function login(){
  $("loginBtn").disabled=true;$("loginBtn").textContent="SIGNING IN…";msg("loginMsg","Connecting…",true);
  try{
    const d=await api("login",{username:$("username").value.trim(),password:$("password").value});
    session=d.user;$("loginCard").hidden=true;$("dashboard").hidden=false;
    $("notificationBell").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;
    $("roleBadge").textContent=session.role;
    $("sideUserName").textContent=session.name||session.username;
    $("sideUserRole").textContent=session.role;
    $("sideAvatar").textContent=(session.name||session.username||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    buildNav();
    setTimeout(loadLocationsFast,20);
  }catch(e){msg("loginMsg",e.message)}
  finally{$("loginBtn").disabled=false;$("loginBtn").textContent="SIGN IN"}
}
$("loginBtn").onclick=login;$("password").onkeydown=e=>{if(e.key==="Enter")login()};
$("showPassword").onchange=e=>{if($("password"))$("password").type=e.target.checked?"text":"password"};
$("resetPasswordOpen").onclick=()=>{$("resetPasswordPanel").hidden=false;$("resetUserId").value=$("username").value.trim();$("resetMsg").textContent=""};
$("resetCancel").onclick=()=>{$("resetPasswordPanel").hidden=true;$("resetMsg").textContent=""};
$("resetPasswordBtn").onclick=async()=>{
  try{
    const uid=$("resetUserId").value.trim(),oldP=$("resetOldPassword").value,newP=$("resetNewPassword").value,confirm=$("resetConfirmPassword").value;
    if(!uid||!oldP||!newP||!confirm)throw Error("Please fill all password fields.");
    if(newP!==confirm)throw Error("New password and confirmation do not match.");
    if(newP.length<6)throw Error("New password must be at least 6 characters.");
    $("resetPasswordBtn").disabled=true;
    const d=await api("changePassword",{userId:uid,oldPassword:oldP,newPassword:newP});
    msg("resetMsg",d.message,true);
    $("resetOldPassword").value="";$("resetNewPassword").value="";$("resetConfirmPassword").value="";
  }catch(e){msg("resetMsg",e.message)}
  finally{$("resetPasswordBtn").disabled=false}
};


function navButton(label, id, cls=""){
  const b=document.createElement("button");
  b.type="button"; b.textContent=label; b.className=cls;
  b.dataset.navTarget=id;
  b.onclick=()=>openPanel(id,b);
  return b;
}
function openPanel(id, button){
  document.querySelectorAll(".tab").forEach(x=>x.hidden=true);
  const target=$(id);
  if(target){
    const parentTab=target.closest(".tab");
    if(parentTab) parentTab.hidden=false;
    target.hidden=false;
  }
  document.querySelectorAll(".side-nav button").forEach(x=>x.classList.remove("active"));
  if(button) button.classList.add("active");
  const parent=button?.closest(".nav-group");
  if(parent) parent.classList.add("open");
  if(id && id!="adminTab" && id!="userTab"){
    const el=$(id); if(el && el.classList.contains("panel")) el.scrollIntoView({behavior:"smooth",block:"start"});
  }
}
function addNavGroup(label, children, defaultOpen=false){
  const group=document.createElement("div"); group.className="nav-group"+(defaultOpen?" open":"");
  const parent=document.createElement("button"); parent.type="button"; parent.className="nav-parent";
  parent.innerHTML=`<span>${esc(label)}</span><span class="chevron">›</span>`;
  parent.onclick=()=>{
    group.classList.toggle("open");
  };
  group.appendChild(parent);
  const childWrap=document.createElement("div"); childWrap.className="nav-children";
  children.forEach(item=>{
    const b=navButton(item.label,item.id,"nav-child");
    if(item.action)b.onclick=()=>item.action(b);
    childWrap.appendChild(b);
  });
  group.appendChild(childWrap); $("nav").appendChild(group); return group;
}
function addSimpleNav(label,id){
  const b=navButton(label,id,"nav-simple"); $("nav").appendChild(b); return b;
}
function addAssignedLocationNav(){
  if(!session || session.role==="Admin" || session.role==="HOD") return;
  const levels=[["Country","country"],["Region","region"],["State","state"],["Division","division"],["District","district"],["Area","area"],["Pincode","pincode"]];
  const assigned=levels.filter(([id])=>{const v=assignedValue(id);return v && v.toLowerCase()!=="all"});
  if(!assigned.length)return;
  const divider=document.createElement("div");divider.className="nav-divider";$('nav').appendChild(divider);
  const group=document.createElement("div");group.className="nav-group";
  const parent=document.createElement("button");parent.type="button";parent.className="nav-parent";parent.innerHTML='<span>Assigned Location</span><span class="chevron">›</span>';
  parent.onclick=()=>group.classList.toggle("open");group.appendChild(parent);
  const children=document.createElement("div");children.className="nav-children";
  assigned.forEach(([id])=>{const b=document.createElement("button");b.type="button";b.className="nav-child nav-location";b.textContent=`${id}: ${assignedValue(id)}`;b.onclick=()=>{const target=$('userIjtima');document.querySelectorAll('.tab').forEach(x=>x.hidden=true);target.hidden=false;target.scrollIntoView({behavior:'smooth',block:'start'});};children.appendChild(b)});
  group.appendChild(children);$('nav').appendChild(group);
}
function buildNav(){
  $("nav").innerHTML="";
  if(session.role==="Admin"){
    addNavGroup("User Management",[
      {label:"Create / Update User",id:"userManagementPanel"},
      {label:"Download User Excel Format",id:"userManagementPanel"},
      {label:"Upload Users",id:"userManagementPanel"}
    ],true);
    addNavGroup("Add Weekly Ijtima Report",[
      {label:"Master Import",id:"adminIjtima"},
      {label:"Excel Format",id:"adminIjtima"}
    ]);
    addNavGroup("Add Weekly Madani Muzakra Report",[
      {label:"Report Management",id:"adminMuzakra"}
    ]);
    addNavGroup("Volunteer Data",[
      {label:"Excel Import / Format",id:"adminVolunteer"}
    ]);
    addSimpleNav("Progress Report","progressTab");
    $("adminTab").hidden=false;
  }else{
    addSimpleNav("Add Weekly Ijtima Report","userIjtima");
    addSimpleNav("Add Weekly Madani Muzakra Report","userMuzakra");
    addSimpleNav("Volunteer Data","userVolunteer");
    addSimpleNav("Progress Report","progressTab");
    addAssignedLocationNav();
    $("userTab").hidden=false;
  }
  const first=$("nav").querySelector(".nav-child,.nav-simple");
  if(first) first.click();
}

document.addEventListener("click",e=>{
  const p=e.target.dataset.panel;if(!p)return;
  document.querySelectorAll(".panel").forEach(x=>x.hidden=true);
  $(p).hidden=false;
});

async function loadLocationsFast(){
  try{
    const d=await api("getLocations",{sessionToken:session.token});
    // IMPORTANT: locations always comes from the Google Sheet "Ijtima Master"
    // returned by the backend, already restricted to the logged-in user's access.
    locations=Array.isArray(d.locations)?d.locations:[];
    setupCascades();
    setupUserCascades();
    setupVolunteerCascades();
    applyAssignedLocationLocks();
    if(session.role!=="Admin" && session.role!=="HOD") document.querySelector('[data-panel="userIjtima"]')?.click();
  }catch(e){
    // Login has already completed; show the backend error in the dashboard instead of
    // putting the user back on the login card.
    msg("reportMsg",e.message);
  }
}

function assignedValue(header){
  if(!session) return "";
  const v=session[header] ?? session[header.toLowerCase()] ?? "";
  return String(v).trim();
}
function applyAssignedLocationLocks(){
  if(!session || session.role==="Admin" || session.role==="HOD") return;
  const levels=[
    ["Country","country"],["Region","region"],["State","state"],["Division","division"],
    ["District","district"],["Area","area"],["Pincode","pincode"],["Locality","locality"],["Masjid","masjidName"]
  ];
  ["r","v"].forEach(prefix=>{
    let deepest=-1;
    levels.forEach(([id],idx)=>{
      const el=$(prefix+id), assigned=assignedValue(id), wrap=el?.closest(".location-field");
      if(!el||!wrap)return;
      if(assigned && assigned.toLowerCase()!=="all"){
        el.value=assigned;
        el.disabled=true;
        wrap.classList.add("assigned-fixed");
        deepest=Math.max(deepest,idx);
      }else{
        el.disabled=false;
        wrap.classList.remove("assigned-fixed");
      }
    });
    if(deepest>=0){
      levels.forEach(([id],idx)=>{
        const wrap=$(prefix+id)?.closest(".location-field");
        if(wrap)wrap.classList.toggle("assigned-hidden",idx<=deepest);
      });
    }
  });
  // Rebuild cascades after assignments are applied so the first visible
  // dropdown starts exactly below the assigned level.
  setupVolunteerCascades();
  if(session.role!=="Admin" && session.role!=="HOD") updateReportCascade(Math.max(-1,levels.findIndex(([id])=>{const v=assignedValue(id);return v&&v.toLowerCase()!=="all";})));
}

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
    const value=$("r"+id)?.value||"";
    if(value) rows=rows.filter(r=>String(r[key]??"").trim()===String(value).trim());
  }
  return rows;
}
function resetLocationSelect(id,values,allLabel="All"){
  const el=$(id); if(!el) return;
  const old=el.value;
  el.innerHTML=`<option value="">${allLabel}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(values.includes(old)) el.value=old;
}
function setupCascades(){
  LOCATION_LEVELS.forEach(([id],i)=>{
    const el=$("r"+id);
    if(el) el.onchange=()=>updateReportCascade(i);
  });
  resetLocationSelect("rCountry",valuesForLocation(locations,"country"),"Select");
  for(let i=1;i<LOCATION_LEVELS.length;i++){
    const [id,key]=LOCATION_LEVELS[i];
    resetLocationSelect("r"+id,valuesForLocation(parentRows(i),key),"Select");
  }
  if($("rDay")) $("rDay").innerHTML='<option value="">Select</option>';
}
function updateReportCascade(changedIndex){
  const start=Math.max(0,changedIndex+1);
  for(let i=start;i<LOCATION_LEVELS.length;i++){
    const [id,key]=LOCATION_LEVELS[i];
    const values=valuesForLocation(parentRows(i),key);
    const assigned=assignedValue(id);
    resetLocationSelect("r"+id,values,"Select");
    if(assigned && assigned.toLowerCase()!=="all" && values.includes(assigned)){
      $("r"+id).value=assigned;
      $("r"+id).disabled=true;
    }
  }
  const rows=filtered();
  if(rows.length){
    const dayValues=[...new Set(rows.map(x=>String(x.ijtimaDay||"").trim()).filter(Boolean))];
    if($("rDay")){
      $("rDay").innerHTML='<option value="">Select</option>'+dayValues.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
      if(dayValues.length===1) $("rDay").value=dayValues[0];
    }
    showIjtimaDate(dayValues.length===1?dayValues[0]:"");
  }else if($("rDay")){
    $("rDay").innerHTML='<option value="">Select</option>';
    $("rDay").value=""; showIjtimaDate("");
  }
}

function showIjtimaDate(day){
  const wanted=String(day||"Thursday");$("ijtimaDateInfo").textContent=`This Masjid's Ijtima Day: ${wanted}`;
  $("nextReportDate").textContent="Next reporting date: "+nextDateForDay(wanted);
}
function nextDateForDay(day){const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],idx=names.findIndex(x=>x.toLowerCase()===String(day).toLowerCase()),n=idx<0?4:idx,d=new Date(),diff=(n-d.getDay()+7)%7;d.setDate(d.getDate()+diff);return d.toISOString().slice(0,10)}
function currentOrNextSaturday(){const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7));return d.toISOString().slice(0,10)}
function isSaturday(value){if(!value)return false;const d=new Date(value+"T00:00:00");return d.getDay()===6}

function volRow(target){const d=document.createElement("div");d.className="vol";d.innerHTML='<input class="vname" placeholder="Volunteer Name"><input class="vmobile" placeholder="Mobile"><input class="vdetails" placeholder="Details"><button type="button" class="secondary">Remove</button>';d.querySelector("button").onclick=()=>d.remove();$(target).appendChild(d)}
if($("addVolunteer"))$("addVolunteer").onclick=()=>volRow("volunteers");
if($("addVolunteerOnly"))$("addVolunteerOnly").onclick=()=>volRow("volunteerOnlyRows");

async function submitIjtima(status){
  const r=filtered()[0],p=$("participants").value;if(!r)return msg("reportMsg","Please select a valid Masjid.");
  if(p===""||!Number.isInteger(Number(p))||Number(p)<0)return msg("reportMsg","Participants must be a whole number.");
  const volunteers=[];
  try{await api("saveReport",{sessionToken:session.token,type:"Ijtima",report:{weekDate:nextDateForDay(r.ijtimaDay),...r,participants:Number(p),volunteers,status}});msg("reportMsg",status==="Draft"?"Draft saved.":"Report submitted successfully.",true)}catch(e){msg("reportMsg",e.message)}
}
$("saveIjtimaDraft").onclick=()=>submitIjtima("Draft");$("submitIjtima").onclick=()=>submitIjtima("Submitted");

function downloadTemplate(type){
  const headers=type==="Ijtima"?["Country","Region","State","Division","District","Area","Locality","Masjid Name","Pincode","Ijtima Day"]:["Country","Region","State","Division","District","Area","Pincode","Masjid Name","Name","Mobile","Details"];
  const ws=XLSX.utils.aoa_to_sheet([headers, type==="Ijtima"?["India","","","","","","","Example Masjid","400001","Thursday"]:["India","","","","","","400001","Example Masjid","Example Volunteer","9876543210",""]]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,type==="Ijtima"?"Weekly Ijtima Master":"Volunteer Data");
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

function setupUserCascades(){
 const fields=['Country','Region','State','Division','District','Area','Pincode'];
 function update(i){const chosen={};fields.slice(0,i+1).forEach(k=>chosen[k]=document.getElementById('u'+k).value);
   const matching=locations.filter(r=>fields.slice(0,i+1).every(k=>!chosen[k]||String(r[k.toLowerCase()]||'')===chosen[k]));
   for(let x=i+1;x<fields.length;x++){const el=document.getElementById('u'+fields[x]);if(!el)continue;const opts=[...new Set(matching.map(r=>String(r[fields[x].toLowerCase()]||'')).filter(Boolean))].sort();el.innerHTML='<option value="">All</option>'+opts.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')}}
 fields.forEach((k,i)=>{const el=document.getElementById('u'+k);if(el)el.onchange=()=>update(i)});
 const first=document.getElementById('uCountry');if(first){const opts=[...new Set(locations.map(r=>r.country).filter(Boolean))].sort();first.innerHTML='<option value="">All</option>'+opts.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');update(0)}
}
$("saveUser").onclick=async()=>{try{const u={userId:$("uId").value.trim(),username:$("uUsername").value.trim(),name:$("uName").value.trim(),role:$("uRole").value,active:$("uActive").value,password:$("uPassword").value};['Country','Region','State','Division','District','Area','Pincode'].forEach(k=>u[k.toLowerCase()]=$("u"+k)?.value||'All');const d=await api('saveUser',{sessionToken:session.token,user:u});msg('userMsg',d.message,true)}catch(e){msg('userMsg',e.message)}};
$("downloadUserTemplate").onclick=()=>{const headers=['User ID','Username','Password','Name','Role','Active','Country','Region','State','Division','District','Area','Pincode'];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers]),'Users');XLSX.writeFile(wb,'Weekly-Ijtima-Users-Format.xlsx')};
$("importUsers").onclick=async()=>{try{const f=$("userFile").files[0];if(!f)throw Error('Select Excel/CSV file.');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const d=await api('importUsers',{sessionToken:session.token,rows});msg('userImportMsg','Imported '+d.imported+' users.',true);$("userFile").value=''}catch(e){msg('userImportMsg',e.message)}};

function setupMuzakraDate(){
  const el=$("mDate");if(!el)return;
  if(!el.value)el.value=currentOrNextSaturday();
  el.onchange=()=>{
    if(!isSaturday(el.value)){
      msg("muzakraUserMsg","Weekly Madani Muzakra sirf Saturday ko hota hai. Please Saturday ki date select karein.");
      el.value=currentOrNextSaturday();
    }else msg("muzakraUserMsg","");
  };
}
setupMuzakraDate();
$("submitMuzakra").onclick=async()=>{try{
  const date=$("mDate").value;
  if(!isSaturday(date))throw Error("Weekly Madani Muzakra ki report sirf Saturday ki date par add ki ja sakti hai.");
  const p=$("mParticipants").value;if(!Number.isInteger(Number(p))||Number(p)<0)throw Error("Participants must be a whole number.");
  await api("saveReport",{sessionToken:session.token,type:"Muzakra",report:{weekDate:date,participants:Number(p),status:"Submitted"}});
  msg("muzakraUserMsg","Madani Muzakra report submitted successfully.",true);
}catch(e){msg("muzakraUserMsg",e.message)}};
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
        const assigned=assignedValue(nextId);
        if(assigned&&assigned.toLowerCase()!=="all"&&valuesForLocation(volRowsFor(j),nextKey).includes(assigned)){
          $("v"+nextId).value=assigned;$("v"+nextId).disabled=true;
        }
      }
    };
  });
  VOL_LEVELS.forEach(([id,key],i)=>{
    const values=valuesForLocation(volRowsFor(i),key);
    resetLocationSelect("v"+id,values);
    const assigned=assignedValue(id);
    if(assigned&&assigned.toLowerCase()!=="all"&&values.includes(assigned)){
      $("v"+id).value=assigned;$("v"+id).disabled=true;
    }
  });
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
      name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim(),details:x.querySelector(".vdetails").value.trim()
    })).filter(x=>x.name);
    if(!rows.length)throw Error("At least one volunteer is required.");
    await api("saveVolunteer",{sessionToken:session.token,location,rows});
    msg("volunteerUserMsg","Volunteer data saved successfully.",true);
  }catch(e){msg("volunteerUserMsg",e.message)}
};

function periodLabel(date,mode){const d=new Date(date);if(mode==="year")return d.getFullYear();if(mode==="month")return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");return date}
function aggregate(rows,mode){const m={};rows.forEach(r=>{const k=periodLabel(r.date,mode);m[k]=(m[k]||0)+(Number(r.participants)||0)});return Object.entries(m).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))).map(([label,value])=>({label,value}))}
function drawChart(data){
  const c=$("progressChart"),ctx=c.getContext("2d"),ratio=window.devicePixelRatio||1,w=c.clientWidth||900,h=320;
  c.width=w*ratio;c.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle="#718087";ctx.font="14px Arial";ctx.fillText("No report data found for the selected period.",24,42);return}
  const max=Math.max(...data.map(x=>Number(x.value)||0),1),pad={l:48,r:22,t:25,b:48};
  const innerW=w-pad.l-pad.r,innerH=h-pad.t-pad.b,step=innerW/data.length,bw=Math.max(12,step*.48);
  ctx.strokeStyle="#e6eeee";ctx.lineWidth=1;ctx.fillStyle="#718087";ctx.font="11px Arial";ctx.textAlign="right";
  for(let g=0;g<=4;g++){const y=pad.t+innerH-(innerH*g/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(Math.round(max*g/4).toLocaleString(),pad.l-8,y+4)}
  const points=[];
  data.forEach((x,i)=>{
    const val=Number(x.value)||0,x0=pad.l+i*step+(step-bw)/2,y=pad.t+innerH-(val/max)*innerH;
    ctx.fillStyle="#0b8b7d";ctx.fillRect(x0,y,bw,pad.t+innerH-y);
    const px=x0+bw/2;points.push([px,y]);
    ctx.fillStyle="#17343a";ctx.font="700 10px Arial";ctx.textAlign="center";ctx.fillText(val.toLocaleString(),px,y-7);
    ctx.fillStyle="#718087";ctx.font="10px Arial";ctx.fillText(String(x.label),px,h-pad.b+18);
  });
  if(points.length>1){
    ctx.strokeStyle="#ef8b32";ctx.lineWidth=2.5;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
    points.forEach(p=>{ctx.fillStyle="#ef8b32";ctx.beginPath();ctx.arc(p[0],p[1],3.5,0,Math.PI*2);ctx.fill()});
  }
}
async function loadProgress(){
  try{
    const d=await api("progress",{sessionToken:session.token,type:progressType,from:$("fromDate").value,to:$("toDate").value});
    progressRows=d.rows||[];const mode=$("compareMode").value,data=aggregate(progressRows,mode);drawChart(data);
    const previous=data.length>1?data[data.length-2].value:null,current=data.length?data[data.length-1].value:0,change=previous===null?"—":(current-previous);
    $("progressSummary").innerHTML=`<div class="stat"><b>Total</b><strong>${Number(d.total||0).toLocaleString()}</strong></div><div class="stat"><b>Records</b><strong>${d.count}</strong></div><div class="stat"><b>Latest vs Previous</b><strong>${change==="—"?"—":(change>=0?"+":"")+change.toLocaleString()}</strong></div>`;
    $("progressResult").innerHTML=`<h3>${progressType==="Ijtima"?"Weekly Ijtima":"Madani Muzakra"} — ${mode==="week"?"Week to Week":mode==="month"?"Month to Month":"Year to Year"}</h3><table><thead><tr><th>Period</th><th>Participants</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.label)}</td><td>${Number(x.value).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
  }catch(e){$("progressResult").textContent=e.message}
}
function setupProgressDates(){
  const from=$("fromDate"),to=$("toDate");if(!from||!to)return;
  if(!from.value){const d=new Date();d.setMonth(d.getMonth()-12);from.value=d.toISOString().slice(0,10)}
  if(!to.value)to.value=new Date().toISOString().slice(0,10);
}
setupProgressDates();
$("loadProgress").onclick=loadProgress;
$("progressIjtimaBtn").onclick=()=>{progressType="Ijtima";$("progressIjtimaBtn").classList.add("active");$("progressMuzakraBtn").classList.remove("active");setupProgressDates();loadProgress()};
$("progressMuzakraBtn").onclick=()=>{progressType="Muzakra";$("progressMuzakraBtn").classList.add("active");$("progressIjtimaBtn").classList.remove("active");setupProgressDates();loadProgress()};
async function loadNotifications(){try{const d=await api('notifications',{sessionToken:session.token});const list=d.pending||[];const badge=$('notificationBadge');badge.textContent=list.length;badge.hidden=!list.length;$('notificationResult').innerHTML='<h3>Pending: '+list.length+'</h3><table><thead><tr><th>Masjid</th><th>Due Date</th><th>Message</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+esc(x.masjidName)+'</td><td>'+esc(x.dueDate)+'</td><td>'+esc(x.message)+'</td></tr>').join('')+'</tbody></table>'}catch(e){$('notificationResult').textContent=e.message}}
$('notificationBell').onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.hidden=true);$('notificationTab').hidden=false;loadNotifications()};
$('closeNotifications').onclick=()=>{document.querySelector('.tabs button')?.click()};
$("logoutBtn").onclick=()=>{
  session=null;locations=[];document.querySelectorAll(".tab").forEach(x=>x.hidden=true);
  $("dashboard").hidden=true;$("loginCard").hidden=false;$("password").value="";$("loginMsg").textContent="";
};
$("mobileMenu").onclick=()=>document.querySelector(".app-sidebar")?.classList.toggle("open");
