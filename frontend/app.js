const API_URL = "https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";

const $ = id => document.getElementById(id);
function togglePassword(){ $("password").type = $("password").type === "password" ? "text" : "password"; }

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id=$("userId").value.trim(), pw=$("password").value;
  $("loginMsg").textContent="Connecting…";
  try{
    // Backend integration hook. If the existing Apps Script endpoint returns a compatible
    // login response, it is used. Otherwise the UI remains available for local testing.
    const url=API_URL+"?action=login&userId="+encodeURIComponent(id)+"&password="+encodeURIComponent(pw);
    const res=await fetch(url,{method:"GET",cache:"no-store"});
    const data=await res.json();
    if(String(data.status).toLowerCase()==="success" || data.token || data.user){
      localStorage.setItem("weeklySession",JSON.stringify(data));
      openApp(data.user||{userId:id,name:id,role:"User"});
    }else{
      $("loginMsg").textContent="Aapne Galat User ID Ya Password Add Kiya Hai.";
    }
  }catch(err){
    // Fast local fallback for the currently configured demo administrator.
    if(id==="admin" && pw==="Admin@2026!"){
      openApp({userId:"admin",name:"System Administrator",role:"Admin"});
    }else{
      $("loginMsg").textContent="Aapne Galat User ID Ya Password Add Kiya Hai.";
    }
  }
});
function openApp(user){
  $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
  $("sideName").textContent=user.name||user.username||user.userId||"User";
  $("sideRole").textContent=user.role||"User";
  $("welcomeText").textContent="Welcome, "+(user.name||user.username||user.userId||"User");
}
function logout(){localStorage.removeItem("weeklySession");$("appView").classList.add("hidden");$("loginView").classList.remove("hidden");$("password").value="";$("loginMsg").textContent="";}
function showReset(){$("resetModal").classList.remove("hidden")} function hideReset(){$("resetModal").classList.add("hidden")}
function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(page).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
function nextSaturday(){
  const d=new Date(); const day=d.getDay(); const add=(6-day+7)%7; d.setDate(d.getDate()+add);
  return d.toISOString().slice(0,10);
}
$("satDate").value=nextSaturday(); $("satDate").min=nextSaturday(); $("satDate").max=nextSaturday();
setInterval(()=>{const d=new Date();$("clock").textContent=d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+" • "+d.toLocaleTimeString("en-IN");},1000);
const saved=localStorage.getItem("weeklySession"); if(saved){try{openApp(JSON.parse(saved).user||JSON.parse(saved))}catch(e){}}
