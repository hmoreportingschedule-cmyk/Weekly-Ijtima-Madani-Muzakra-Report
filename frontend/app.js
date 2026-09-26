const API_URL = "https://script.google.com/macros/s/AKfycbwbP22HW0lrV4vSjelbiiURjcn9E_MH1DphI5caVWMX8nwmcnkClw4kH_i9QxBXSOiqmA/exec";

const $ = id => document.getElementById(id);

function togglePassword(){
  $("password").type = $("password").type === "password" ? "text" : "password";
}

function isLoginSuccess(data){
  if (!data) return false;
  if (typeof data === "string"){
    const s = data.trim().toLowerCase();
    if (s === "success" || s === "true" || s === "ok" || s.includes('"success":true')) return true;
    try { return isLoginSuccess(JSON.parse(data)); } catch(e) {}
    return false;
  }
  if (data.success === true || data.authenticated === true || data.ok === true) return true;
  const status = String(data.status ?? data.result ?? data.message ?? "").toLowerCase();
  if (["success","successful","ok","true","login successful","authenticated"].includes(status)) return true;
  if (data.token || data.user || data.userData || data.userDetails) return true;
  return false;
}

function getUser(data, fallbackId){
  if (!data || typeof data !== "object") {
    return {userId:fallbackId, name:fallbackId, role:"User"};
  }
  const u = data.user || data.userData || data.userDetails || data;
  return {
    ...u,
    userId: u.userId || u.username || u.id || fallbackId,
    name: u.name || u.fullName || u.username || u.userId || fallbackId,
    role: u.role || u.userRole || "User"
  };
}

async function callLoginEndpoint(id, pw){
  const params = new URLSearchParams({
    action: "login",
    userId: id,
    username: id,
    password: pw
  });

  const url = API_URL + "?" + params.toString();
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow"
  });

  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch(e) {}

  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
  return data;
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("userId").value.trim();
  const pw = $("password").value;

  if (!id || !pw) {
    $("loginMsg").textContent = "User ID aur Password enter karein.";
    return;
  }

  const btn = $("loginForm").querySelector('button[type="submit"]');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "SIGNING IN…";
  $("loginMsg").textContent = "Checking login…";
  $("loginMsg").className = "msg";

  try {
    const data = await callLoginEndpoint(id, pw);

    if (isLoginSuccess(data)) {
      const user = getUser(data, id);
      localStorage.setItem("weeklySession", JSON.stringify({ ...data, user }));
      openApp(user);
    } else {
      $("loginMsg").textContent = "Aapne Galat User ID Ya Password Add Kiya Hai.";
      $("loginMsg").className = "msg error";
    }
  } catch (err) {
    // Keep the original demo fallback for local testing only.
    if (id === "admin" && pw === "Admin@2026!") {
      const user = {userId:"admin", name:"System Administrator", role:"Admin"};
      localStorage.setItem("weeklySession", JSON.stringify({user}));
      openApp(user);
    } else {
      $("loginMsg").textContent =
        "Login server se connection nahi ho raha. Google Apps Script Web App deployment/URL check karein.";
      $("loginMsg").className = "msg error";
      console.error("Login error:", err);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
});

function openApp(user){
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("sideName").textContent = user.name || user.username || user.userId || "User";
  $("sideRole").textContent = user.role || "User";
  $("welcomeText").textContent = "Welcome, " + (user.name || user.username || user.userId || "User");
}

function logout(){
  localStorage.removeItem("weeklySession");
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("password").value = "";
  $("loginMsg").textContent = "";
}

function showReset(){ $("resetModal").classList.remove("hidden"); }
function hideReset(){ $("resetModal").classList.add("hidden"); }

function showPage(page){
  document.querySelectorAll(".page").forEach(x => x.classList.add("hidden"));
  const target = $(page);
  if (target) target.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(x =>
    x.classList.toggle("active", x.dataset.page === page)
  );
  window.scrollTo({top:0, behavior:"smooth"});
}

document.querySelectorAll(".nav-item").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

function nextSaturday(){
  const d = new Date();
  const day = d.getDay();
  const add = (6 - day + 7) % 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0,10);
}

if ($("satDate")) {
  $("satDate").value = nextSaturday();
  $("satDate").min = nextSaturday();
  $("satDate").max = nextSaturday();
}

function updateClock(){
  if (!$("clock")) return;
  const d = new Date();
  $("clock").textContent =
    d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) +
    " • " + d.toLocaleTimeString("en-IN");
}
updateClock();
setInterval(updateClock, 1000);

const saved = localStorage.getItem("weeklySession");
if (saved){
  try {
    const parsed = JSON.parse(saved);
    openApp(parsed.user || parsed);
  } catch(e) {
    localStorage.removeItem("weeklySession");
  }
}
