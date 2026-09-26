function setupUserCascades(){
  const c=[["uCountry","country"],["uRegion","region"],["uState","state"],["uDivision","division"],["uDistrict","district"],["uArea","area"],["uPincode","pincode"]];
  fill("uCountry",uniq(locations,"country"));
  c.forEach(([id,key],i)=>{
    $(id).onchange=()=>{
      const f={country:$("uCountry").value,region:$("uRegion").value,state:$("uState").value,division:$("uDivision").value,district:$("uDistrict").value,area:$("uArea").value,pincode:$("uPincode").value};
      const rows=locations.filter(r=>Object.entries(f).every(([k,v])=>!v||String(r[k])===v));
      for(let j=i+1;j<c.length;j++)fill(c[j][0],uniq(rows,c[j][1]));
    };
  });
}
function userLocationFiltersFromRow(r){
  $("uCountry").value=r.country||"";
  $("uCountry").dispatchEvent(new Event("change"));
  ["uRegion","uState","uDivision","uDistrict","uArea","uPincode"].forEach((id)=>{if(r[id.slice(1).toLowerCase()]!==undefined){}});
}
async function saveUserForm(){
  try{
    const u={
      userId:$("uId").value.trim(),username:$("uUsername").value.trim(),name:$("uName").value.trim(),
      role:$("uRole").value,active:$("uActive").value,password:$("uPassword").value,
      country:$("uCountry").value||"All",region:$("uRegion").value||"All",state:$("uState").value||"All",
      division:$("uDivision").value||"All",district:$("uDistrict").value||"All",area:$("uArea").value||"All",pincode:$("uPincode").value||"All"
    };
    const d=await api("saveUser",{sessionToken:session.token,user:u});
    msg("userMsg",d.message,true);
  }catch(e){msg("userMsg",e.message)}
}
$("saveUser").onclick=saveUserForm;

function downloadUserTemplate(){
  const headers=["User ID","Username","Password","Name","Role","Active","Country","Region","State","Division","District","Area","Pincode"];
  const ws=XLSX.utils.aoa_to_sheet([headers,["USER-001","demo","ChangeMe123!","Demo User","User","TRUE","India","","","","","",""]]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Users");
  XLSX.writeFile(wb,"Weekly-Ijtima-Users-Format.xlsx");
}
$("downloadUserTemplate").onclick=downloadUserTemplate;

$("importUsers").onclick=async()=>{
  const f=$("userFile").files[0];if(!f)return msg("userImportMsg","Please select an Excel/CSV user file.");
  try{
    const buf=await f.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
    if(!rows.length)throw Error("User file has no data.");
    const d=await api("importUsers",{sessionToken:session.token,rows});
    msg("userImportMsg",`Uploaded ${d.imported} user(s) successfully.`,true);$("userFile").value="";
  }catch(e){msg("userImportMsg",e.message)}
};

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
$("loadNotifications").onclick=async()=>{try{const d=await api("notifications",{sessionToken:session.token,weekDate:nextDateForDay("Thursday")});$("notificationResult").innerHTML=`<h3>Pending: ${d.pending.length}</h3><pre>${esc(JSON.stringify(d.pending,null,2))}</pre>`}catch(e){$("notificationResult").textContent=e.message}};
