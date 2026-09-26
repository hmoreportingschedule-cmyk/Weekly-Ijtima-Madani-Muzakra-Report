// Set this to your deployed Google Apps Script Web App URL.
const API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
let session = null, locations = [];

const $ = id => document.getElementById(id);
const msg = (id, text, ok=false) => { $(id).textContent=text; $(id).style.color=ok ? "#087f5b" : "#c92a2a"; };

async function api(action, payload={}) {
  if (!API_URL.startsWith("http")) throw new Error("Set API_URL in frontend/app.js first.");
  const r = await fetch(API_URL, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action,...payload})});
  const data = await r.json();
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

function currentThursday(){
  const d=new Date(), day=d.getDay(), diff=(4-day+7)%7;
  d.setDate(d.getDate()+diff);
  return d.toISOString().slice(0,10);
}
$("weekLabel").textContent="Reporting Thursday: "+currentThursday();

$("loginBtn").onclick=async()=>{
  try{
    const data=await api("login",{username:$("username").value.trim(),password:$("password").value});
    session=data.user; locations=data.locations||[];
    $("loginCard").hidden=true; $("dashboard").hidden=false;
    $("welcome").textContent="Welcome, "+session.name;
    $("roleBadge").textContent=session.role;
    $("adminTab").hidden=session.role!=="Admin";
    populateLocations();
    msg("loginMsg","");
  }catch(e){msg("loginMsg",e.message)}
};

$("logoutBtn").onclick=()=>location.reload();
$("refreshBtn").onclick=()=>location.reload();

document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>{x.hidden=true;x.classList.remove("active")});
  const t=$(b.dataset.tab); t.hidden=false; t.classList.add("active");
});

function unique(field){
  return [...new Set(locations.map(x=>x[field]).filter(Boolean))];
}
function fill(id, values){
  const s=$(id); s.innerHTML='<option value="">Select</option>'+values.map(v=>`<option>${esc(v)}</option>`).join("");
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function populateLocations(){
  fill("region",unique("region"));
  ["state","division","district","area","pincode"].forEach(x=>fill(x,[]));
}
function cascade(){
  const filters={region:$("region").value,state:$("state").value,division:$("division").value,district:$("district").value,area:$("area").value};
  let rows=locations.filter(r=>Object.entries(filters).every(([k,v])=>!v||String(r[k])===v));
  const chain=["state","division","district","area","pincode"];
  chain.forEach((f,i)=>fill(f,uniqueFrom(rows,f)));
}
function uniqueFrom(rows,f){return [...new Set(rows.map(x=>x[f]).filter(Boolean))]}
["region","state","division","district","area"].forEach(id=>$(id).onchange=cascade);

function volunteerRow(){
  const d=document.createElement("div"); d.className="vol";
  d.innerHTML='<input class="vname" placeholder="Volunteer Name"><input class="vmobile" placeholder="Mobile"><button type="button" class="secondary">Remove</button>';
  d.querySelector("button").onclick=()=>d.remove(); $("volunteers").appendChild(d);
}
$("addVolunteer").onclick=volunteerRow;

async function saveReport(status){
  const p=$("participants").value;
  if(p==="" || !Number.isInteger(Number(p)) || Number(p)<0) return msg("reportMsg","Participants must be a whole number.");
  const area=$("area").value; if(!area) return msg("reportMsg","Please select Area.");
  const volunteers=[...document.querySelectorAll(".vol")].map(x=>({name:x.querySelector(".vname").value.trim(),mobile:x.querySelector(".vmobile").value.trim()}));
  try{
    await api("saveReport",{sessionToken:session.token,report:{weekDate:currentThursday(),region:$("region").value,state:$("state").value,division:$("division").value,district:$("district").value,area,pincode:$("pincode").value,participants:Number(p),volunteers,status}});
    msg("reportMsg",status==="Draft"?"Draft saved.":"Report submitted successfully.",true);
  }catch(e){msg("reportMsg",e.message)}
}
$("saveDraft").onclick=()=>saveReport("Draft");
$("submitReport").onclick=()=>saveReport("Submitted");

$("loadProgress").onclick=async()=>{
  try{
    const d=await api("progress",{sessionToken:session.token,from:$("fromDate").value,to:$("toDate").value,level:$("progressLevel").value});
    $("progressResult").innerHTML=`<h3>Total Participants: ${Number(d.total||0).toLocaleString()}</h3><pre>${esc(JSON.stringify(d.rows||[],null,2))}</pre>`;
  }catch(e){$("progressResult").textContent=e.message}
};
$("loadNotifications").onclick=async()=>{
  try{
    const d=await api("notifications",{sessionToken:session.token,weekDate:currentThursday()});
    $("notificationResult").innerHTML=`<h3>Pending: ${d.pending.length}</h3><pre>${esc(JSON.stringify(d.pending,null,2))}</pre>`;
  }catch(e){$("notificationResult").textContent=e.message}
};
$("setupInfo").onclick=async()=>{
  try{$("adminResult").textContent=JSON.stringify(await api("systemInfo",{sessionToken:session.token}),null,2)}
  catch(e){$("adminResult").textContent=e.message}
};
