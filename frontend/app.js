const APP_BUILD="FINAL60";
const API_URL="https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";
let session=null,locations=[],progressType="Ijtima",progressRows=[],publicReportToken="",publicSessionToken="",publicReportMeta=null,ijtimaCalendarReady=false;

const $=id=>document.getElementById(id);
const msg=(id,t,ok=false)=>{if($(id)){ $(id).textContent=t;$(id).style.color=ok?"#087f5b":"#c92a2a"; }};
async function api(action,payload={}){
  if(!API_URL.startsWith("http"))throw Error("Set API_URL in frontend/app.js");
  const body=JSON.stringify({action,...payload});
  const request=async(contentType)=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try{
      const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":contentType},body,cache:"no-store",redirect:"follow",signal:controller.signal});
      const text=await r.text();
      if(!r.ok && !text) throw Error(`Server returned HTTP ${r.status}.`);
      let d;
      try{d=JSON.parse(text)}catch(_){throw Error("Google Apps Script returned an invalid response. Please deploy the latest Code.gs Web App version.")}
      if(!d.ok)throw Error(d.error||"Request failed");
      return d;
    }catch(e){if(e.name==="AbortError")throw Error("Server response timed out. Please try again.");throw e}
    finally{clearTimeout(timer)}
  };
  try{return await request("text/plain;charset=utf-8")}catch(first){
    // Google Apps Script Web Apps occasionally behave differently with cached/proxy requests.
    // Retry once with another CORS-simple content type before showing the error.
    if(/Failed to fetch|NetworkError|Load failed|invalid response/i.test(String(first.message||first))){
      try{return await request("application/x-www-form-urlencoded;charset=UTF-8")}catch(second){throw second}
    }
    throw first;
  }
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clock(){
  const d=new Date();
  const text=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" • "+d.toLocaleTimeString("en-IN",{hour12:true});
  if($("clock"))$("clock").textContent=text;
  if($("dashboardClock"))$("dashboardClock").textContent=text;
}
setInterval(clock,1000);clock();



function publicApi(action,payload={}){ return api(action,payload); }
function isoToDisplay(iso){if(!iso)return '';const p=String(iso).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'';}
async function refreshPublicReportForDate(date){
  if(!publicReportToken||!publicSessionToken||!date)return;
  try{
    const info=await publicApi('ijtimaPublicInfo',{publicSessionToken,date});
    publicReportMeta=info;
    if(info.report){fillPublicReport(info.report);msg('reportMsg',info.canEdit?(info.report.status==='Submitted'?`Existing report loaded. Update allowed until 3 days after Ijtima.`:'Draft report loaded.'):`Previous report loaded — View Only.`,true);}
    else {fillPublicReport(null);['totalZimmedaran','totalMadarisWale','totalAwam','participants','totalRaatRukneWale','totalGadiyanAyi','alakaiDaura','langareRazawiyyah','jadwalIshraq'].forEach(id=>{if($(id))$(id).value='';});msg('reportMsg',info.canEdit?'No report found for this date. New report ready.':'No report found for this previous date.',true);}
    applyPublicReportAccess(info);
  }catch(e){msg('reportMsg',e.message);}
}
function applyPublicReportAccess(info){
  if(!publicReportToken)return;
  const canEdit=!!info?.canEdit;
  const save=$('saveIjtimaDraft'),sub=$('submitIjtima');
  if(save)save.disabled=!canEdit;
  if(sub){sub.disabled=!canEdit;sub.textContent=canEdit?(info?.report?.status==='Submitted'?'▣ Update Report':'▣ Submit Report'):'View Only';}
  ['totalZimmedaran','totalMadarisWale','totalAwam','totalRaatRukneWale','totalGadiyanAyi','alakaiDaura','langareRazawiyyah','jadwalIshraq'].forEach(id=>{if($(id))$(id).disabled=!canEdit;});
  const date=$('ijtimaDate');if(date)date.disabled=false;
  const btn=$('ijtimaDateCalendarBtn');if(btn)btn.disabled=false;
}

async function refreshUserReportForDate(date){
  if(publicReportToken||!session?.token||!date)return;
  try{
    const rows=filtered();if(!rows.length)return;
    const info=await api('ijtimaUserInfo',{sessionToken:session.token,date,report:{masjidName:rows[0].masjidName,pincode:rows[0].pincode}});
    publicReportMeta=info;
    if(info.report){fillPublicReport(info.report);msg('reportMsg',info.canEdit?(info.report.status==='Submitted'?'Existing report loaded. Update Report is available until 3 days after Ijtima.':'Draft report loaded.'):'Previous report loaded — View Only.',true);}
    else {['totalZimmedaran','totalMadarisWale','totalAwam','participants','totalRaatRukneWale','totalGadiyanAyi','alakaiDaura','langareRazawiyyah','jadwalIshraq'].forEach(id=>{if($(id))$(id).value='';});msg('reportMsg',info.canEdit?'No report found for this Ijtima date. New report ready.':'No report found for this previous date.',true);}
    const save=$('saveIjtimaDraft'),sub=$('submitIjtima'),canEdit=!!info.canEdit;
    if(save)save.disabled=!canEdit;
    if(sub){sub.disabled=!canEdit;sub.textContent=canEdit?(info.report?.status==='Submitted'?'▣ Update Report':'▣ Submit Report'):'View Only';}
    ['totalZimmedaran','totalMadarisWale','totalAwam','totalRaatRukneWale','totalGadiyanAyi','alakaiDaura','langareRazawiyyah','jadwalIshraq'].forEach(id=>{if($(id))$(id).disabled=!canEdit;});
  }catch(e){msg('reportMsg',e.message);}
}
function mostRecentIjtimaDateClient(day){
  const idx=ijtimaDayIndex(day);if(idx<0)return '';
  const d=new Date(),diff=(d.getDay()-idx+7)%7;d.setDate(d.getDate()-diff);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fillPublicReport(rep){
  if(!rep)return;
  const set=(id,v)=>{if($(id))$(id).value=v??''};
  set('rDay',rep.ijtimaDay); setIjtimaDateValue(rep.date||'');
  set('totalZimmedaran',rep.totalZimmedaran); set('totalMadarisWale',rep.totalMadarisWale); set('totalAwam',rep.totalAwam); set('participants',rep.participants); set('totalRaatRukneWale',rep.totalRaatRukneWale); set('totalGadiyanAyi',rep.totalGadiyanAyi); set('alakaiDaura',rep.alakaiDaura); set('langareRazawiyyah',rep.langareRazawiyyah); set('jadwalIshraq',rep.jadwalIshraq);
}
async function openPublicIjtimaLink(token){
  publicReportToken=token;publicSessionToken='';publicReportMeta=null;
  $('loginCard').hidden=false;$('dashboard').hidden=true;
  $('username').value='';$('password').value='';
  $('username').placeholder='Enter Contact Number';$('password').placeholder='Enter Contact Number';
  $('loginMsg').textContent='';
  const title=document.querySelector('.login-form-card h2'),sub=document.querySelector('.login-form-card .login-subtitle');
  if(title)title.textContent='Masjid Report Login';
  if(sub)sub.textContent='User ID & Password dono Contact Number hain';
  $('resetPasswordOpen')?.setAttribute('hidden','hidden');
  $('loginBtn').textContent='↪  Open Report';
}
async function startPublicDashboard(info){
  session={token:'',userId:'PUBLIC',username:info.master.submitterContact,name:info.master.submitterName||info.master.masjidName,role:'Public'};
  locations=[info.master];
  $('loginCard').hidden=true;$('dashboard').hidden=false;$('notificationBell').hidden=true;
  $('welcome').textContent='Weekly Ijtima Report — '+info.master.masjidName;
  $('roleBadge').textContent='Direct Report Link';$('sideUserName').textContent=info.master.submitterName||info.master.masjidName;$('sideUserRole').textContent='Direct Link';$('sideAvatar').textContent='IJ';
  buildNav();document.querySelector('[data-panel="userIjtima"]')?.click();
  ['rCountry','rRegion','rState','rDivision','rDistrict','rArea','rPincode','rLocality','rMasjid'].forEach((id,i)=>{const keys=['country','region','state','division','district','area','pincode','locality','masjidName'];if($(id)){$(id).value=info.master[keys[i]]||'';$(id).disabled=true;}});
  const masterDay=String(info.master.ijtimaDay||'').trim();
  if($('rDay')){$('rDay').innerHTML='<option value="'+esc(masterDay)+'">'+esc(masterDay)+'</option>';$('rDay').value=masterDay;$('rDay').disabled=true;}
  setupIjtimaCalendar();
  const date=String(info.date||'').trim();
  if(date){const p=date.split('-');if(p.length===3)ijtimaCalendarMonth=new Date(Number(p[0]),Number(p[1])-1,1);setIjtimaDateValue(date);}else{showIjtimaDate(masterDay);}
  renderIjtimaCalendar();
  await refreshPublicReportForDate(date);
}

async function login(){
  const username=$("username").value.trim(),password=$("password").value;
  if(!username||!password){msg("loginMsg","Please enter User ID and Password.");return;}
  $("loginBtn").disabled=true;$("loginBtn").textContent="Signing in…";msg("loginMsg","Connecting to reporting server…",true);
  try{
    if(publicReportToken){
      const d=await api("ijtimaPublicLogin",{reportToken:publicReportToken,username,password});
      publicSessionToken=d.accessToken;
      await startPublicDashboard(d);
      return;
    }
    const d=await api("login",{username,password});
    if(!d||!d.user)throw Error("Login response is missing user details.");
    session=d.user;localStorage.setItem("ijtimaDashboardSession",JSON.stringify(session));$("loginCard").hidden=true;$("dashboard").hidden=false;
    $("notificationBell").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;
    $("roleBadge").textContent=session.role;
    $("sideUserName").textContent=session.name||session.username;
    $("sideUserRole").textContent=session.role;
    $("sideAvatar").textContent=(session.name||session.username||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    buildNav();
    setupMuzakraDate(); setTimeout(loadLocationsFast,20);
  }catch(e){msg("loginMsg",e.message||"Login failed. Please try again.");}
  finally{$("loginBtn").disabled=false;$("loginBtn").textContent="↪  Login"}
}
$("loginBtn").onclick=login;$("password").onkeydown=e=>{if(e.key==="Enter")login()};
$("showPassword").onchange=e=>{if($("password"))$("password").type=e.target.checked?"text":"password"};
$("togglePasswordBtn").onclick=()=>{const p=$("password");if(!p)return;const show=p.type==="password";p.type=show?"text":"password";$("togglePasswordBtn").textContent=show?"◉":"◌"};
setupIjtimaCalendar();
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


function buildNav(){
  $("nav").innerHTML="";
  if(session.role==="Admin"){
    addNav("adminTab","User Management");
    addNav("userTab","Add Weekly Ijtima Report",()=>document.querySelector('[data-panel="userIjtima"]')?.click());
    addNav("userTab","Add Weekly Madani Muzakra Report",()=>document.querySelector('[data-panel="userMuzakra"]')?.click());
    addNav("userTab","Volunteer Data",()=>document.querySelector('[data-panel="userVolunteer"]')?.click());
    addNav("progressTab","Progress Report");
    $("adminTab").hidden=false;
  }else{
    addNav("userTab","Add Weekly Ijtima Report",()=>document.querySelector('[data-panel="userIjtima"]')?.click());
    addNav("userTab","Add Weekly Madani Muzakra Report",()=>document.querySelector('[data-panel="userMuzakra"]')?.click());
    addNav("userTab","Volunteer Data",()=>document.querySelector('[data-panel="userVolunteer"]')?.click());
    addNav("progressTab","Progress Report");
    $("userTab").hidden=false;
  }
  $("nav").querySelector("button")?.click();
}
function addNav(id,label){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=true);$(id).hidden=false;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")};$("nav").appendChild(b)}
document.addEventListener("click",e=>{const p=e.target.dataset.panel;if(!p)return;document.querySelectorAll(".panel").forEach(x=>x.hidden=true);$(p).hidden=false});

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

  // The first assigned location is the user's access boundary. Everything
  // above and including that boundary is fixed/hidden; only lower levels
  // remain selectable.
  const assignedIndex=levels.findIndex(([id])=>{
    const v=assignedValue(id);
    return v && v.toLowerCase()!=="all";
  });

  ["r","v"].forEach(prefix=>{
    let rows=locations;
    levels.forEach(([id,key],i)=>{
      const el=$(prefix+id); if(!el) return;
      const wrap=el.closest(".location-field");
      const assigned=assignedValue(id);

      if(assigned && assigned.toLowerCase()!=="all"){
        el.value=assigned;
        el.disabled=true;
        if(wrap) wrap.classList.add("assigned-fixed");
      }else{
        el.disabled=false;
        if(wrap) wrap.classList.remove("assigned-fixed");
      }

      // Hide Country/Region/etc. once that level is the assigned boundary.
      // Lower levels stay visible so the user can continue selecting downwards.
      if(wrap){
        const shouldHide=assignedIndex>=0 && i<=assignedIndex;
        wrap.classList.toggle("assigned-hidden",shouldHide);
      }

      if(assigned && assigned.toLowerCase()!=="all"){
        rows=rows.filter(r=>String(r[key]??"").trim()===assigned);
      }
    });

    // Rebuild only the visible child dropdowns from the already restricted
    // master rows. Assigned fields retain their fixed values.
    for(let i=0;i<levels.length;i++){
      const [id,key]=levels[i],el=$(prefix+id);
      if(!el) continue;
      const wrap=el.closest(".location-field");
      if(wrap?.classList.contains("assigned-hidden")) continue;
      const vals=valuesForLocation(rows,key);
      const current=el.value;
      if(vals.length){
        el.innerHTML='<option value="">Select</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
        if(vals.includes(current)) el.value=current;
      }
    }
  });

  updateReportCascade(-1);
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
    resetLocationSelect("r"+id,values,"Select");
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

let ijtimaCalendarMonth=new Date();
function normalizeIjtimaDay(day){
  const key=String(day||"").trim().toLowerCase().replace(/\s+/g," ");
  const map={
    sunday:"Sunday",sunday:"Sunday",
    monday:"Monday",mon:"Monday",
    tuesday:"Tuesday",tue:"Tuesday",tues:"Tuesday",
    wednesday:"Wednesday",wed:"Wednesday",
    thursday:"Thursday",thu:"Thursday",thurs:"Thursday",thursdays:"Thursday",thur:"Thursday",thurday:"Thursday",thrusday:"Thursday",thursdy:"Thursday",thursady:"Thursday",
    friday:"Friday",fri:"Friday",
    saturday:"Saturday",sat:"Saturday"
  };
  if(map[key])return map[key];
  if(key.includes("thursday")||key.includes("jumerat")||key.includes("jumeraat"))return "Thursday";
  return String(day||"").trim();
}
function ijtimaDayIndex(day){
  const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const normalized=normalizeIjtimaDay(day);
  return names.findIndex(n=>n.toLowerCase()===normalized.toLowerCase());
}
function activeIjtimaDayName(){
  const select=$("rDay");
  if(!select)return "";
  const raw=String(select.value||select.options?.[select.selectedIndex]?.textContent||"").trim();
  return normalizeIjtimaDay(raw);
}
function activeIjtimaDayIndex(){ return ijtimaDayIndex(activeIjtimaDayName()); }
function isoToDisplay(iso){
  const m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:"";
}
function displayToIso(v){
  const m=String(v||"").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:"";
}
function setIjtimaDateValue(iso){
  const el=$("ijtimaDate");if(!el)return;
  el.dataset.iso=iso||"";
  el.value=isoToDisplay(iso);
  renderIjtimaCalendar();
}
function todayIso_(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function isoCompare_(a,b){return String(a).localeCompare(String(b));}
function renderIjtimaCalendar(){
  const box=$("ijtimaCalendar"),input=$("ijtimaDate");if(!box||!input)return;
  const wantedName=activeIjtimaDayName();
  const wanted=ijtimaDayIndex(wantedName);
  if(wanted<0){box.hidden=true;return;}
  input.dataset.allowedDay=String(wanted);
  input.dataset.allowedName=wantedName;

  const y=ijtimaCalendarMonth.getFullYear(),m=ijtimaCalendarMonth.getMonth();
  const monthName=ijtimaCalendarMonth.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const first=new Date(Date.UTC(y,m,1));
  const days=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const offset=first.getUTCDay();
  const selected=input.dataset.iso||"";
  let html=`<div class="ijtima-calendar-head"><button type="button" class="ijtima-calendar-nav" data-cal-nav="-1">‹</button><div class="ijtima-calendar-title">${monthName}</div><button type="button" class="ijtima-calendar-nav" data-cal-nav="1">›</button></div>`;
  html+='<div class="ijtima-calendar-week"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="ijtima-calendar-grid">';

  // IMPORTANT: Use a normal 7-column calendar grid with leading blanks.
  // Do NOT force dates into columns with CSS. This keeps every date under
  // its real weekday: Fri dates in Fri, Thu dates in Thu, etc.
  for(let i=0;i<offset;i++) html+='<span class="ijtima-calendar-empty" aria-hidden="true"></span>';

  const today=new Date();
  for(let day=1;day<=days;day++){
    const date=new Date(Date.UTC(y,m,day));
    const weekdayIndex=date.getUTCDay();
    const dayName=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][weekdayIndex];
    const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const allowed=weekdayIndex===wanted;
    const isFuture=isoCompare_(iso,todayIso_())>0;
    const selectable=allowed && (!publicReportToken || !isFuture);
    const sel=iso===selected;
    const todayCls=(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===day)?" today":"";
    html+=`<button type="button" class="ijtima-calendar-day${selectable?" allowed":""}${sel?" selected":""}${todayCls}" data-iso="${iso}" data-weekday="${dayName}" data-weekday-index="${weekdayIndex}" ${selectable?"":"disabled"}>${day}</button>`;
  }
  html+='</div><div class="ijtima-calendar-note">Sirf <b>'+esc(wantedName)+'</b> ki dates select ki ja sakti hain.</div>';
  box.innerHTML=html;
  box.querySelectorAll("[data-cal-nav]").forEach(b=>b.onclick=()=>{
    ijtimaCalendarMonth.setMonth(ijtimaCalendarMonth.getMonth()+Number(b.dataset.calNav));
    renderIjtimaCalendar();
  });
  box.querySelectorAll(".ijtima-calendar-day.allowed").forEach(b=>b.onclick=()=>{
    setIjtimaDateValue(b.dataset.iso);
    if(publicReportToken)refreshPublicReportForDate(b.dataset.iso);else refreshUserReportForDate(b.dataset.iso);
    box.hidden=true;
    input.setAttribute("aria-expanded","false");
    msg("reportMsg","");
  });
}
function openIjtimaCalendar(){
  const input=$("ijtimaDate"),box=$("ijtimaCalendar");if(!input||!box)return;
  const day=activeIjtimaDayName();
  if(!day || ijtimaDayIndex(day)<0){msg("reportMsg","Ijtima Day pehle select/confirm hona zaroori hai.");return;}
  const existing=input.dataset.iso;
  if(existing){const p=existing.split("-");if(p.length===3)ijtimaCalendarMonth=new Date(Number(p[0]),Number(p[1])-1,1)}
  else ijtimaCalendarMonth=new Date();
  renderIjtimaCalendar();
  box.hidden=false;
  input.setAttribute("aria-expanded","true");
}
function closeIjtimaCalendar(){const box=$("ijtimaCalendar"),input=$("ijtimaDate");if(box)box.hidden=true;if(input)input.setAttribute("aria-expanded","false")}
function showIjtimaDate(day){
  const wanted=String(day||"").trim();
  $("ijtimaDateInfo") && ($("ijtimaDateInfo").textContent=wanted?`Only ${wanted} ki date select ki ja sakti hai.`:"Select a Masjid to determine the Ijtima Day.");
  setIjtimaDateForDay(wanted);
}
function syncIjtimaCalendarToDayField(){
  const day=activeIjtimaDayName();
  if(day)showIjtimaDate(day);
}
function setIjtimaDateForDay(day){
  const el=$("ijtimaDate");if(!el)return;
  const wantedName=String(day||"").trim();
  const wanted=ijtimaDayIndex(wantedName);
  el.disabled=false;
  el.required=wanted>=0;
  el.dataset.allowedDay=wanted>=0?String(wanted):"";
  el.dataset.allowedName=wanted>=0?wantedName:"";
  if(wanted<0){setIjtimaDateValue("");closeIjtimaCalendar();return;}
  if(el.dataset.iso){
    const p=el.dataset.iso.split("-");
    const d=p.length===3?new Date(Date.UTC(Number(p[0]),Number(p[1])-1,Number(p[2]))):null;
    const currentName=d&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat("en-US",{weekday:"long",timeZone:"UTC"}).format(d):"";
    if(!d || currentName.toLowerCase()!==wantedName.toLowerCase())setIjtimaDateValue("");
  }
  renderIjtimaCalendar();
}
function setupIjtimaCalendar(){
  const input=$("ijtimaDate"),btn=$("ijtimaDateCalendarBtn");if(!input||!btn)return;
  input.onclick=openIjtimaCalendar;btn.onclick=openIjtimaCalendar;
  if(ijtimaCalendarReady)return;
  ijtimaCalendarReady=true;
  document.addEventListener("click",e=>{if(!$("ijtimaDatePicker")?.contains(e.target))closeIjtimaCalendar()});
  const dayField=$("rDay");
  if(dayField)dayField.addEventListener("change",syncIjtimaCalendarToDayField);
  setIjtimaDateValue(input.dataset.iso||"");
}

function nextSaturday(){
  const d=new Date(),diff=(6-d.getDay()+7)%7;
  d.setDate(d.getDate()+diff);return d.toISOString().slice(0,10);
}
function setupMuzakraDate(){
  const el=$("mDate"); if(!el)return;
  const saturday=nextSaturday();el.value=saturday;el.min="2020-01-04";el.step="7";
  el.onchange=()=>{
    if(!el.value)return;
    const d=new Date(el.value+"T00:00:00");
    if(d.getDay()!==6){msg("muzakraUserMsg","Weekly Madani Muzakra sirf Saturday ko hota hai. Please Saturday select karein.");el.value=nextSaturday();}
    else $("muzakraUserMsg").textContent="";
  };
}
function limitDigits(id,max){
  const el=$(id); if(!el)return;
  el.addEventListener("input",()=>{
    const clean=String(el.value||"").replace(/\D/g,"").slice(0,max);
    if(el.value!==clean)el.value=clean;
    updateIjtimaParticipantTotal();
  });
}
function updateIjtimaParticipantTotal(){
  const z=Number($("totalZimmedaran")?.value||0),m=Number($("totalMadarisWale")?.value||0),a=Number($("totalAwam")?.value||0);
  if($("participants"))$("participants").value=z+m+a;
}
["totalZimmedaran","totalMadarisWale","totalAwam","totalRaatRukneWale"].forEach(id=>limitDigits(id,4));
limitDigits("totalGadiyanAyi",3);
function setYesNoStyle(id){
  const el=$(id);if(!el)return;
  el.classList.remove("yes-choice","no-choice");
  if(el.value==="Yes")el.classList.add("yes-choice");
  if(el.value==="No")el.classList.add("no-choice");
}
["alakaiDaura","langareRazawiyyah","jadwalIshraq"].forEach(id=>$(id)?.addEventListener("change",()=>setYesNoStyle(id)));
async function submitIjtima(status){
  const rows=filtered();
  if(!rows.length)return msg("reportMsg","Please select all Masjid Information fields and choose a valid Masjid.");
  const r=rows[0];

  // Every selectable location field is mandatory. Assigned/locked fields are
  // already present in the filtered master row, so this also covers those.
  const requiredLocations=[
    ["Country",r.country],["Region",r.region],["State",r.state],["Division",r.division],
    ["District",r.district],["Area",r.area],["Pincode",r.pincode],["Locality",r.locality],["Masjid",r.masjidName]
  ];
  const missingLocation=requiredLocations.find(([_,v])=>!String(v??"").trim());
  if(missingLocation)return msg("reportMsg",`${missingLocation[0]} select karna mandatory hai.`);

  // Normalize both the master-data day and the selected day before validating.
  // Thursday may arrive from older/master data as Thu/Thurs/Jumerat (or with
  // minor spelling variations), while the calendar uses the normalized name.
  const allowedDayRaw=String(r.ijtimaDay||"").trim();
  const allowedDay=normalizeIjtimaDay(allowedDayRaw);
  if(!allowedDay || ijtimaDayIndex(allowedDay)<0)return msg("reportMsg","Ijtima Day is not available for this Masjid.");
  const dayValueRaw=String($("rDay")?.value||"").trim();
  const dayValue=normalizeIjtimaDay(dayValueRaw);
  if(!dayValue || ijtimaDayIndex(dayValue)<0)return msg("reportMsg","Ijtima Day select hona mandatory hai.");
  if(dayValue.toLowerCase()!==allowedDay.toLowerCase())return msg("reportMsg",`Sirf ${allowedDay} ka Ijtima allowed hai.`);

  const date=String($("ijtimaDate")?.dataset.iso||displayToIso($("ijtimaDate")?.value)||"").trim();
  if(!date)return msg("reportMsg","Report Date select karna mandatory hai.");
  const pdate=date.split("-");
  if(pdate.length!==3 || !/^\d{4}-\d{2}-\d{2}$/.test(date))return msg("reportMsg","Please select a valid report date.");
  const d=new Date(Date.UTC(Number(pdate[0]),Number(pdate[1])-1,Number(pdate[2])));
  const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  if(!Number.isFinite(d.getTime()) || d.getUTCFullYear()!==Number(pdate[0]) || d.getUTCMonth()!==Number(pdate[1])-1 || d.getUTCDate()!==Number(pdate[2]))
    return msg("reportMsg","Please select a valid report date.");
  if(names[d.getUTCDay()].toLowerCase()!==allowedDay.toLowerCase())
    return msg("reportMsg",`Sirf ${allowedDay} ki date select karein.`);

  // All numeric entry fields are mandatory. Zero is a valid entered value.
  const raw={
    z:String($("totalZimmedaran")?.value??"").trim(),
    m:String($("totalMadarisWale")?.value??"").trim(),
    a:String($("totalAwam")?.value??"").trim(),
    night:String($("totalRaatRukneWale")?.value??"").trim(),
    cars:String($("totalGadiyanAyi")?.value??"").trim()
  };
  if(!raw.z)return msg("reportMsg","Total Zimmedaran fill karna mandatory hai.");
  if(!raw.m)return msg("reportMsg","Total Madaris Wale fill karna mandatory hai.");
  if(!raw.a)return msg("reportMsg","Total Awam fill karna mandatory hai.");
  if(!raw.night)return msg("reportMsg","Total Raat Rukne Wale fill karna mandatory hai.");
  if(!raw.cars)return msg("reportMsg","Total Gadiyan Ayi fill karna mandatory hai.");

  const z=Number(raw.z),m=Number(raw.m),a=Number(raw.a),night=Number(raw.night),cars=Number(raw.cars),p=z+m+a;
  if(!Number.isInteger(z)||z<0||z>9999)return msg("reportMsg","Total Zimmedaran mein 0 se 9999 tak whole number enter karein.");
  if(!Number.isInteger(m)||m<0||m>9999)return msg("reportMsg","Total Madaris Wale mein 0 se 9999 tak whole number enter karein.");
  if(!Number.isInteger(a)||a<0||a>9999)return msg("reportMsg","Total Awam mein 0 se 9999 tak whole number enter karein.");
  if(!Number.isInteger(night)||night<0||night>9999)return msg("reportMsg","Total Raat Rukne Wale mein 0 se 9999 tak whole number enter karein.");
  if(!Number.isInteger(cars)||cars<0||cars>999)return msg("reportMsg","Total Gadiyan Ayi mein 0 se 999 tak whole number enter karein.");

  const alakai=String($("alakaiDaura")?.value||"").trim();
  const langare=String($("langareRazawiyyah")?.value||"").trim();
  const ishraq=String($("jadwalIshraq")?.value||"").trim();
  if(!alakai)return msg("reportMsg","Alakai Daura ka jawab select karna mandatory hai.");
  if(!langare)return msg("reportMsg","Langare Razawiyyah ka jawab select karna mandatory hai.");
  if(!ishraq)return msg("reportMsg","Jadwal Ishraq ka jawab select karna mandatory hai.");

  const draftBtn=$("saveIjtimaDraft"),submitBtn=$("submitIjtima");
  draftBtn.disabled=true; submitBtn.disabled=true;
  try{
    const result=await api(publicReportToken?"ijtimaPublicSave":"saveReport",{
      sessionToken:session.token,
      publicToken:publicReportToken||undefined,
      publicSessionToken:publicSessionToken||undefined,
      reportToken:publicReportToken||undefined,
      type:"Ijtima",
      report:{
        weekDate:date, country:r.country,region:r.region,state:r.state,division:r.division,
        district:r.district,area:r.area,locality:r.locality,masjidName:r.masjidName,pincode:r.pincode,
        ijtimaDay:allowedDay,participants:p,totalZimmedaran:z,totalMadarisWale:m,totalAwam:a,
        totalRaatRukneWale:night,totalGadiyanAyi:cars,alakaiDaura:alakai,
        langareRazawiyyah:langare,jadwalIshraq:ishraq,volunteers:[],status
      }
    });
    if(result.reportId)window._lastIjtimaReportId=result.reportId;
    if(publicReportToken){
      await refreshPublicReportForDate(date);
      msg("reportMsg",status==="Submitted"?"Report saved successfully. Update Report is available only within 3 days of the Ijtima date.":"Draft saved successfully.",true);
    }else{
      await refreshUserReportForDate(date);
      msg("reportMsg",status==="Submitted"?"Report submitted successfully. Update Report is available only within 3 days of the Ijtima date.":"Draft saved successfully.",true);
    }
  }catch(e){
    draftBtn.disabled=false; submitBtn.disabled=false;
    msg("reportMsg",e.message||"Report save failed.");
  }
}

function lockSubmittedIjtima(){
  const box=$("userIjtima"); if(!box)return;
  box.dataset.submittedLocked="1";
  box.querySelectorAll("input,select,button").forEach(el=>{el.disabled=true;});
  const btn=$("submitIjtima"); if(btn)btn.textContent="✓ Report Submitted";
  const draft=$("saveIjtimaDraft"); if(draft)draft.textContent="✓ Submitted";
}
$("saveIjtimaDraft").onclick=()=>submitIjtima("Draft");
$("submitIjtima").onclick=()=>submitIjtima("Submitted");

function downloadTemplate(type){
  const headers=type==="Ijtima"?["Country","Region","State","Division","District","Area","Locality","Masjid Name","Pincode","Ijtima Day","Report Token","Report Submitter Name","Report Submitter Contact"]:["Country","Region","State","Division","District","Area","Pincode","Masjid Name","Name","Mobile","Details"];
  const ws=XLSX.utils.aoa_to_sheet([headers, type==="Ijtima"?["India","","","","","","","Example Masjid","400001","Thursday","","Example Submitter","9876543210"]:["India","","","","","","400001","Example Masjid","Example Volunteer","9876543210",""]]);
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

$("submitMuzakra").onclick=async()=>{
  try{
    const date=$("mDate").value;
    if(!date)throw Error("Please select a Saturday.");
    const day=new Date(date+"T00:00:00").getDay();
    if(day!==6)throw Error("Weekly Madani Muzakra sirf Saturday ko submit kiya ja sakta hai.");
    const maq=Number($("mMaqamat").value||0),p=Number($("mParticipants").value||0);
    if(!Number.isInteger(maq)||maq<0||maq>9999)throw Error("Maqamat mein maximum 4 digits allowed hain.");
    if(!Number.isInteger(p)||p<0||p>9999)throw Error("Participants mein maximum 4 digits allowed hain.");
    if(maq>p)throw Error("Maqamat ki tadad Participants se zyada nahi ho sakti.");
    await api("saveReport",{sessionToken:session.token,type:"Muzakra",report:{weekDate:date,maqamat:maq,participants:p,status:"Submitted"}});
    msg("muzakraUserMsg","Madani Muzakra report submitted separately.",true);
  }catch(e){msg("muzakraUserMsg",e.message)}
};
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
$("loadProgress").onclick=loadProgress;
$("progressIjtimaBtn").onclick=()=>{progressType="Ijtima";$("progressIjtimaBtn").classList.add("active");$("progressMuzakraBtn").classList.remove("active");loadProgress()};
$("progressMuzakraBtn").onclick=()=>{progressType="Muzakra";$("progressMuzakraBtn").classList.add("active");$("progressIjtimaBtn").classList.remove("active");loadProgress()};
async function loadNotifications(){try{const d=await api('notifications',{sessionToken:session.token});const list=d.pending||[];const badge=$('notificationBadge');badge.textContent=list.length;badge.hidden=!list.length;$('notificationResult').innerHTML='<h3>Pending: '+list.length+'</h3><table><thead><tr><th>Masjid</th><th>Due Date</th><th>Message</th></tr></thead><tbody>'+list.map(x=>'<tr><td>'+esc(x.masjidName)+'</td><td>'+esc(x.dueDate)+'</td><td>'+esc(x.message)+'</td></tr>').join('')+'</tbody></table>'}catch(e){$('notificationResult').textContent=e.message}}
$('notificationBell').onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.hidden=true);$('notificationTab').hidden=false;loadNotifications()};
$('closeNotifications').onclick=()=>{document.querySelector('.tabs button')?.click()};
$("refreshBtn").onclick=()=>{
  $("refreshBtn").disabled=true;$("refreshBtn").textContent="↻ Refreshing…";
  window.location.reload();
};
$("logoutBtn").onclick=()=>{
  localStorage.removeItem("ijtimaDashboardSession");
  session=null;locations=[];document.querySelectorAll(".tab").forEach(x=>x.hidden=true);
  $("dashboard").hidden=true;$("loginCard").hidden=false;$("password").value="";$("loginMsg").textContent="";
};
$("mobileMenu").onclick=()=>document.querySelector(".app-sidebar")?.classList.toggle("open");

async function loadIjtimaLinks(){
  try{
    const base=window.location.origin+window.location.pathname.replace(/\/[^\/]*$/,'');
    const d=await api('ijtimaLinks',{sessionToken:session.token,baseUrl:base});
    const rows=d.links||[];
    $('ijtimaLinksResult').innerHTML='<div class="table-wrap"><table><thead><tr><th>Masjid</th><th>Day</th><th>Submitter Name</th><th>Contact Number</th><th>Report Link</th><th>Share Link</th></tr></thead><tbody>'+rows.map((x,i)=>`<tr><td>${esc(x.masjidName)}</td><td>${esc(x.ijtimaDay)}</td><td><input class="ijtima-submitter-name" data-token="${esc(x.token)}" value="${esc(x.submitterName||'')}" placeholder="Submitter Name"></td><td><input class="ijtima-submitter-contact" data-token="${esc(x.token)}" value="${esc(x.submitterContact||'')}" placeholder="Contact Number" inputmode="tel"></td><td><a href="${esc(x.url)}" target="_blank" rel="noopener">Open Report</a></td><td><button type="button" class="secondary save-ijtima-contact" data-token="${esc(x.token)}" data-link="${esc(x.url)}">Share Link</button></td></tr>`).join('')+'</tbody></table></div>';
    document.querySelectorAll('.save-ijtima-contact').forEach(b=>b.onclick=async()=>{
      const token=b.dataset.token,name=document.querySelector(`.ijtima-submitter-name[data-token="${CSS.escape(token)}"]`)?.value.trim()||'',contact=document.querySelector(`.ijtima-submitter-contact[data-token="${CSS.escape(token)}"]`)?.value.trim()||'';
      b.disabled=true;b.textContent='Saving…';
      try{await api('saveIjtimaContact',{sessionToken:session.token,reportToken:token,submitterName:name,submitterContact:contact});await navigator.clipboard.writeText(b.dataset.link||'');b.textContent='Share Link Copied ✓';setTimeout(()=>{b.textContent='Share Link';b.disabled=false},1500);}catch(e){b.disabled=false;b.textContent='Share Link';msg('ijtimaMsg',e.message);}
    });
  }catch(e){msg('ijtimaMsg',e.message);}
}
$('generateIjtimaLinks')?.addEventListener('click',loadIjtimaLinks);
function detectPublicIjtimaLink(){
  const token=new URLSearchParams(window.location.search).get('reportToken');
  if(token){openPublicIjtimaLink(token);return true;} return false;
}

async function restoreSavedSession(){
  try{
    const raw=localStorage.getItem("ijtimaDashboardSession");
    if(!raw)return;
    const saved=JSON.parse(raw);
    if(!saved||!saved.token)return;
    session=saved;
    $("loginCard").hidden=true;
    $("dashboard").hidden=false;
    $("notificationBell").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;
    $("roleBadge").textContent=session.role;
    $("sideUserName").textContent=session.name||session.username;
    $("sideUserRole").textContent=session.role;
    $("sideAvatar").textContent=(session.name||session.username||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    buildNav();
    setupMuzakraDate();
    await loadLocationsFast();
  }catch(e){
    localStorage.removeItem("ijtimaDashboardSession");
    session=null;
    $("dashboard").hidden=true;
    $("loginCard").hidden=false;
  }
}

setTimeout(()=>{if(!detectPublicIjtimaLink())restoreSavedSession();},0);
