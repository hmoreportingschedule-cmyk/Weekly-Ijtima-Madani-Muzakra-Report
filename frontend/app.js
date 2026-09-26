const API_URL="https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";
let session=null,locations=[],progressType="Ijtima",progressRows=[];

const $=id=>document.getElementById(id);
const msg=(id,t,ok=false)=>{if($(id)){ $(id).textContent=t;$(id).style.color=ok?"#087f5b":"#c92a2a"; }};
async function api(action,payload={}){
  if(!API_URL.startsWith("http"))throw Error("Set API_URL in frontend/app.js");
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload})});
  const d=await r.json();if(!d.ok)throw Error(d.error||"Request failed");return d;
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clock(){const d=new Date();$("clock").textContent=d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" • "+d.toLocaleTimeString("en-IN",{hour12:true})}
setInterval(clock,1000);clock();
$("refreshBtn").onclick=$("loginRefreshBtn").onclick=()=>location.reload();

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

function buildNav(){
  $("nav").innerHTML="";
  if(session.role==="Admin"){addNav("adminTab","Admin");addNav("progressTab","Progress Report");$("adminTab").hidden=false}
  else{addNav("userTab","Reports");addNav("progressTab","Progress Report");$("userTab").hidden=false}
  $("nav").querySelector("button")?.click();
}
function addNav(id,label){const b=document.createElement("button");b.textContent=label;b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.hidden=true);$(id).hidden=false;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active")};$("nav").appendChild(b)}
document.addEventListener("click",e=>{const p=e.target.dataset.panel;if(!p)return;document.querySelectorAll(".panel").forEach(x=>x.hidden=true);$(p).hidden=false});

async function loadLocationsFast(){try{const d=await api("getLocations",{sessionToken:session.token});locations=d.locations||[];setupCascades();setupUserCascades();if(session.role!=="Admin")document.querySelector('[data-panel="userIjtima"]')?.click()}catch(e){msg("loginMsg",e.message)}}

function uniq(rows,key){return [...new Set(rows.map(x=>x[key]).filter(Boolean))]}
function fill(id,vals){if(!$(id))return;$(id).innerHTML='<option value="">Select</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}
function currentFilters(){return{country:$("rCountry").value,region:$("rRegion").value,state:$("rState").value,division:$("rDivision").value,district:$("rDistrict").value,area:$("rArea").value,locality:$("rLocality").value,masjidName:$("rMasjid").value,pincode:$("rPincode").value}}
function filtered(){const f=currentFilters();return locations.filter(r=>Object.entries(f).every(([k,v])=>!v||String(r[k])===v))}
function setupCascades(){
  const c=[["rCountry","country"],["rRegion","region"],["rState","state"],["rDivision","division"],["rDistrict","district"],["rArea","area"],["rLocality","locality"],["rMasjid","masjidName"],["rPincode","pincode"],["rDay","ijtimaDay"]];
  fill("rCountry",uniq(locations,"country"));c.forEach(([id,key])=>$(id).onchange=()=>cascade(id,key));
}
function cascade(id,key){
  const c=[["rCountry","country"],["rRegion","region"],["rState","state"],["rDivision","division"],["rDistrict","district"],["rArea","area"],["rLocality","locality"],["rMasjid","masjidName"],["rPincode","pincode"],["rDay","ijtimaDay"]];
  const i=c.findIndex(x=>x[0]===id),rows=filtered();
  for(let j=i+1;j<c.length;j++)fill(c[j][0],uniq(rows,c[j][1]));
  const r=filtered()[0];if(r&&id!=="rDay"){$("rDay").value=r.ijtimaDay||"";showIjtimaDate(r.ijtimaDay)}
}
function showIjtimaDate(day){
  const wanted=String(day||"Thursday");$("ijtimaDateInfo").textContent=`This Masjid's Ijtima Day: ${wanted}`;
  $("nextReportDate").textContent="Next reporting date: "+nextDateForDay(wanted);
}
function nextDateForDay(day){const names=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],idx=names.findIndex(x=>x.toLowerCase()===String(day).toLowerCase()),n=idx<0?4:idx,d=new Date(),diff=(n-d.getDay()+7)%7;d.setDate(d.getDate()+diff);return d.toISOString().slice(0,10)}

function volRow(target){const d=document.createElement("div");d.className="vol";d.innerHTML='<input class="vname" placeholder="Volunteer Name"><input class="vmobile" placeholder="Mobile"><input class="vdetails" placeholder="Details"><button type="button" class="secondary">Remove</button>';d.querySelector("button").onclick=()=>d.remove();$(target).appendChild(d)}
$("addVolunteer").onclick=()=>volRow("volunteers");$("addVolunteerOnly").onclick=()=>volRow("volunteerOnlyRows");

async function submitIjtima(status){
  const r=filtered()[0],p=$("participants").value;if(!r)return msg("reportMsg","Please select a valid Masjid.");
  if(p===""||!Number.isInteger(Number(p))||Number(p)<0)return msg("reportMsg","Participants must be a whole number.");
  const volunteers=[...document.querySelectorAll("#volunteers .vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim(),details:x.querySelector(".vdetails").value.trim()}));
  try{await api("saveReport",{sessionToken:session.token,type:"Ijtima",report:{weekDate:nextDateForDay(r.ijtimaDay),...r,participants:Number(p),volunteers,status}});msg("reportMsg",status==="Draft"?"Draft saved.":"Report submitted successfully.",true)}catch(e){msg("reportMsg",e.message)}
}
$("saveIjtimaDraft").onclick=()=>submitIjtima("Draft");$("submitIjtima").onclick=()=>submitIjtima("Submitted");

function downloadTemplate(type){
  const headers=type==="Ijtima"?["Country","Region","State","Division","District","Area","Locality","Masjid Name","Pincode","Ijtima Day"]:["Name","Mobile","Details"];
  const ws=XLSX.utils.aoa_to_sheet([headers, type==="Ijtima"?["India","","","","","","","Example Masjid","400001","Thursday"]:["Example Volunteer","9876543210",""]]);
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

$("submitMuzakra").onclick=async()=>{try{const p=$("mParticipants").value;if(!Number.isInteger(Number(p))||Number(p)<0)throw Error("Participants must be a whole number.");await api("saveReport",{sessionToken:session.token,type:"Muzakra",report:{weekDate:$("mDate").value,participants:Number(p),status:"Submitted"}});msg("muzakraUserMsg","Madani Muzakra report submitted separately.",true)}catch(e){msg("muzakraUserMsg",e.message)}};
$("submitVolunteer").onclick=async()=>{try{const rows=[...document.querySelectorAll("#volunteerOnlyRows .vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim(),details:x.querySelector(".vdetails").value.trim()}));const r=filtered()[0]||{};await api("saveVolunteer",{sessionToken:session.token,location:r,rows});msg("volunteerUserMsg","Volunteer data saved.",true)}catch(e){msg("volunteerUserMsg",e.message)}};

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