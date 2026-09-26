const API_URL="PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
let session=null,locations=[],locationLoaded=false;
const $=id=>document.getElementById(id);
const msg=(id,t,ok=false)=>{$(id).textContent=t;$(id).style.color=ok?"#087f5b":"#c92a2a"};
async function api(action,payload={}){
  if(!API_URL.startsWith("http"))throw Error("Set API_URL in frontend/app.js");
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload})});
  const d=await r.json();if(!d.ok)throw Error(d.error||"Request failed");return d;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function nextThursday(d=new Date()){const x=new Date(d),day=x.getDay();x.setDate(x.getDate()+((4-day+7)%7));return x.toISOString().slice(0,10)}
function dayName(d){return["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}
$("weekLabel").textContent="Reporting date is selected from the Masjid's Ijtima Day.";
$("refreshBtn").onclick=$("loginRefreshBtn").onclick=()=>location.reload();

async function login(){
  try{
    // Fast path: login only returns user; master location data is loaded separately.
    const d=await api("login",{username:$("username").value.trim(),password:$("password").value});
    session=d.user;
    $("loginCard").hidden=true;$("dashboard").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;
    $("roleBadge").textContent=session.role;
    buildNav();
    await loadLocationsFast();
  }catch(e){msg("loginMsg",e.message)}
}
$("loginBtn").onclick=login;
$("password").onkeydown=e=>{if(e.key==="Enter")login()};

function buildNav(){
  $("nav").innerHTML="";
  if(session.role==="Admin"){
    addNav("adminTab","Admin");
    addNav("progressTab","Progress Report");
    addNav("notificationTab","Notifications");
    $("adminTab").hidden=false;
  }else{
    addNav("userTab","Reports");
    addNav("progressTab","Progress Report");
    addNav("notificationTab","Notifications");
    $("userTab").hidden=false;
  }
  $("nav").querySelector("button")?.click();
}
function addNav(id,label){
  const b=document.createElement("button");b.textContent=label;
  b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=true);$(id).hidden=false;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")};
  $("nav").appendChild(b);
}
document.addEventListener("click",e=>{
  const p=e.target.dataset.panel;if(!p)return;
  document.querySelectorAll(".panel").forEach(x=>x.hidden=true);
  $(p).hidden=false;
});

async function loadLocationsFast(){
  try{
    const d=await api("getLocations",{sessionToken:session.token});
    locations=d.locations||[];locationLoaded=true;
    if(session.role!=="Admin") document.querySelector('[data-panel="userIjtima"]')?.click();
    setupCascades();
  }catch(e){msg("loginMsg",e.message)}
}
function uniq(rows,key){return [...new Set(rows.map(x=>x[key]).filter(Boolean))]}
function fill(id,vals){$(id).innerHTML='<option value="">Select</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}
function filtered(){
  const fs={country:$("rCountry").value,region:$("rRegion").value,state:$("rState").value,division:$("rDivision").value,district:$("rDistrict").value,area:$("rArea").value,locality:$("rLocality").value,masjidName:$("rMasjid").value,pincode:$("rPincode").value};
  return locations.filter(r=>Object.entries(fs).every(([k,v])=>!v||String(r[k])===v));
}
function setupCascades(){
  const chain=[["rCountry","country"],["rRegion","region"],["rState","state"],["rDivision","division"],["rDistrict","district"],["rArea","area"],["rLocality","locality"],["rMasjid","masjidName"],["rPincode","pincode"],["rDay","ijtimaDay"]];
  fill("rCountry",uniq(locations,"country"));
  chain.forEach(([id,key])=>{$(id).onchange=()=>cascadeFrom(id,key);});
}
function cascadeFrom(id,key){
  const chain=[["rCountry","country"],["rRegion","region"],["rState","state"],["rDivision","division"],["rDistrict","district"],["rArea","area"],["rLocality","locality"],["rMasjid","masjidName"],["rPincode","pincode"],["rDay","ijtimaDay"]];
  const i=chain.findIndex(x=>x[0]===id);let rows=filtered();
  for(let j=i+1;j<chain.length;j++)fill(chain[j][0],uniq(rows,chain[j][1]));
  if(id==="rMasjid"||id==="rPincode"){
    const r=filtered()[0]; if(r){$("rDay").value=r.ijtimaDay||"";showIjtimaDate(r.ijtimaDay)}
  }
}
function showIjtimaDate(day){
  const wanted=String(day||"Thursday").trim();
  $("ijtimaDateInfo").textContent=`This Masjid's Ijtima Day: ${wanted}. The report date will be the next ${wanted}.`;
}
function reportDateForDay(day){
  const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const idx=names.findIndex(x=>x.toLowerCase()===String(day||"Thursday").toLowerCase());
  const n=idx<0?4:idx,x=new Date(),diff=(n-x.getDay()+7)%7;
  x.setDate(x.getDate()+diff);return x.toISOString().slice(0,10);
}
function volRow(target="volunteers"){
  const d=document.createElement("div");d.className="vol";
  d.innerHTML='<input class="vname" placeholder="Volunteer Name"><input class="vmobile" placeholder="Mobile"><button type="button" class="secondary">Remove</button>';
  d.querySelector("button").onclick=()=>d.remove();$(target).appendChild(d);
}
$("addVolunteer").onclick=()=>volRow("volunteers");
$("addVolunteerOnly").onclick=()=>volRow("volunteerOnlyRows");

async function submitIjtima(status){
  const r=filtered()[0],p=$("participants").value;
  if(!r)return msg("reportMsg","Please select a valid Masjid.");
  if(p===""||!Number.isInteger(Number(p))||Number(p)<0)return msg("reportMsg","Participants must be a whole number.");
  const date=reportDateForDay(r.ijtimaDay);
  const volunteers=[...document.querySelectorAll("#volunteers .vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim()}));
  try{await api("saveReport",{sessionToken:session.token,type:"Ijtima",report:{weekDate:date,country:r.country,region:r.region,state:r.state,division:r.division,district:r.district,area:r.area,locality:r.locality,masjidName:r.masjidName,pincode:r.pincode,ijtimaDay:r.ijtimaDay,participants:Number(p),volunteers,status}});msg("reportMsg",status==="Draft"?"Draft saved.":"Report submitted successfully.",true)}catch(e){msg("reportMsg",e.message)}
}
$("saveIjtimaDraft").onclick=()=>submitIjtima("Draft");
$("submitIjtima").onclick=()=>submitIjtima("Submitted");

async function importFile(input,msgId,type){
  const f=input.files[0];if(!f)return msg(msgId,"Please select an Excel/CSV file.");
  try{
    const buf=await f.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
    if(!rows.length)throw Error("File has no data.");
    await api("importData",{sessionToken:session.token,type,rows});
    msg(msgId,"Imported successfully. The browser upload is not retained as a server file.",true);
    input.value="";
  }catch(e){msg(msgId,e.message)}
}
$("importIjtima").onclick=()=>importFile($("ijtimaFile"),"ijtimaMsg","IjtimaMaster");
$("importMuzakra").onclick=()=>importFile($("muzakraFile"),"muzakraMsg","MuzakraMaster");
$("importVolunteer").onclick=()=>importFile($("volunteerFile"),"volunteerMsg","Volunteer");

$("saveUser").onclick=async()=>{
  try{
    const u={userId:$("uId").value.trim(),username:$("uUsername").value.trim(),name:$("uName").value.trim(),role:$("uRole").value,active:$("uActive").value,password:$("uPassword").value,region:$("uRegion").value.trim(),state:$("uState").value.trim(),division:$("uDivision").value.trim(),district:$("uDistrict").value.trim(),area:$("uArea").value.trim(),pincode:$("uPincode").value.trim()};
    const d=await api("saveUser",{sessionToken:session.token,user:u});msg("userMsg",d.message||"User saved.",true);
  }catch(e){msg("userMsg",e.message)}
};
$("loadUsers").onclick=async()=>{
  try{const d=await api("listUsers",{sessionToken:session.token});$("usersResult").innerHTML="<pre>"+esc(JSON.stringify(d.users,null,2))+"</pre>"}catch(e){msg("userMsg",e.message)}
};

$("submitMuzakra").onclick=async()=>{
  try{const p=$("mParticipants").value;if(!Number.isInteger(Number(p))||Number(p)<0)throw Error("Participants must be a whole number.");await api("saveReport",{sessionToken:session.token,type:"Muzakra",report:{weekDate:$("mDate").value,participants:Number(p),status:"Submitted"}});msg("muzakraUserMsg","Report submitted.",true)}catch(e){msg("muzakraUserMsg",e.message)}
};
$("submitVolunteer").onclick=async()=>{
  try{const rows=[...document.querySelectorAll("#volunteerOnlyRows .vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim()}));await api("saveVolunteer",{sessionToken:session.token,rows});msg("volunteerUserMsg","Volunteer data saved.",true)}catch(e){msg("volunteerUserMsg",e.message)}
};

$("loadProgress").onclick=async()=>{try{const d=await api("progress",{sessionToken:session.token,from:$("fromDate").value,to:$("toDate").value});$("progressResult").innerHTML=`<h3>Total Participants: ${Number(d.total||0).toLocaleString()}</h3><pre>${esc(JSON.stringify(d.rows||[],null,2))}</pre>`}catch(e){$("progressResult").textContent=e.message}};
$("loadNotifications").onclick=async()=>{try{const d=await api("notifications",{sessionToken:session.token,weekDate:nextThursday()});$("notificationResult").innerHTML=`<h3>Pending: ${d.pending.length}</h3><pre>${esc(JSON.stringify(d.pending,null,2))}</pre>`}catch(e){$("notificationResult").textContent=e.message}};
