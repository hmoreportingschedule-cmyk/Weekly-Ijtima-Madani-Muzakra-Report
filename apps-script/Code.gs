const CONFIG = {
  USER_SHEET: 'Users',
  LOCATION_SHEET: 'Locations',
  REPORT_SHEET_PREFIX: 'Weekly Ijtima Report ',
  LOG_SHEET: 'Audit Log',
  NOTIFY_SHEET: 'Notifications',
  DRIVE_ROOT: 'Weekly Ijtima Dashboard',
  PHOTO_FOLDER: 'User Photo',
  REPORT_FOLDER: 'Report Files Weekly Ijtima'
};

function doPost(e){
  try{
    const body=JSON.parse(e.postData.contents||'{}');
    const result=route_(body);
    return json_(result);
  }catch(err){ return json_({ok:false,error:String(err.message||err)}) }
}
function doGet(){return json_({ok:true,service:'Weekly Ijtima Dashboard',status:'online'})}
function json_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}

function route_(b){
  switch(b.action){
    case 'setup': return setupSystem();
    case 'login': return login_(b);
    case 'saveReport': return saveReport_(b);
    case 'progress': return progress_(b);
    case 'notifications': return notifications_(b);
    case 'systemInfo': return systemInfo_(b);
    default: throw new Error('Unknown action');
  }
}

function ss_(){return SpreadsheetApp.getActiveSpreadsheet()}
function sheet_(name){return ss_().getSheetByName(name)}

function setupSystem(){
  const ss=ss_();
  const users=ensureSheet_(CONFIG.USER_SHEET,['User ID','Username','Password Hash','Name','Role','Active','Photo URL','Region','State','Division','District','Area','Pincode']);
  ensureSheet_(CONFIG.LOCATION_SHEET,['Region','State','Division','District','Area','Pincode']);
  ensureSheet_(CONFIG.LOG_SHEET,['Timestamp','User ID','Action','Details']);
  ensureSheet_(CONFIG.NOTIFY_SHEET,['Timestamp','Week Date','Location','User ID','Status']);
  ensureDrive_();
  createDefaultAdmin_(users);
  return {ok:true,message:'System initialized',year:new Date().getFullYear(),adminUsername:'admin',adminPassword:'Admin@2026!'};
}

function createDefaultAdmin_(users){
  const values=users.getDataRange().getValues();
  const headers=values[0]||[];
  const ui=Object.fromEntries(headers.map((x,i)=>[x,i]));
  const exists=values.slice(1).some(r=>String(r[ui['Username']]||'').toLowerCase()==='admin');
  if(!exists){
    users.appendRow([
      'ADMIN-001',
      'admin',
      hash_('Admin@2026!'),
      'System Administrator',
      'Admin',
      true,
      '',
      '','','','','',''
    ]);
  }
}

function ensureSheet_(name,headers){
  let s=sheet_(name); if(!s)s=ss_().insertSheet(name);
  if(s.getLastRow()===0)s.getRange(1,1,1,headers.length).setValues([headers]);
  return s;
}

function ensureDrive_(){
  const root=findOrCreateFolder_(CONFIG.DRIVE_ROOT,DriveApp.getRootFolder());
  findOrCreateFolder_(CONFIG.PHOTO_FOLDER,root);
  findOrCreateFolder_(CONFIG.REPORT_FOLDER,root);
  return root.getId();
}
function findOrCreateFolder_(name,parent){
  const it=parent.getFoldersByName(name);
  return it.hasNext()?it.next():parent.createFolder(name);
}

function login_(b){
  if(!b.username||!b.password)throw new Error('Username and password required');
  const s=sheet_(CONFIG.USER_SHEET), rows=s.getDataRange().getValues();
  const h=rows.shift(), idx=Object.fromEntries(h.map((x,i)=>[x,i]));
  const u=rows.find(r=>String(r[idx.Username])===String(b.username)&&String(r[idx['Active']]).toLowerCase()!=='false');
  if(!u || String(u[idx['Password Hash']])!==hash_(b.password))throw new Error('Invalid username or password');
  const token=Utilities.getUuid();
  CacheService.getScriptCache().put('sess_'+token,JSON.stringify({userId:u[idx['User ID']],username:u[idx.Username],name:u[idx.Name],role:u[idx.Role]}),21600);
  const locations=locationAccess_(u[idx['User ID']],u[idx.Role]);
  return {ok:true,user:{token,name:u[idx.Name],role:u[idx.Role],userId:u[idx['User ID']]},locations};
}

function locationAccess_(userId,role){
  const s=sheet_(CONFIG.LOCATION_SHEET); if(!s)return [];
  const rows=s.getDataRange().getValues(); const h=rows.shift();
  const ix=Object.fromEntries(h.map((x,i)=>[x,i]));
  if(role==='Admin'||role==='HOD')return rows.map(r=>({region:r[ix.Region],state:r[ix.State],division:r[ix.Division],district:r[ix.District],area:r[ix.Area],pincode:r[ix.Pincode]}));
  // User assignment columns can be added to Users: Region, State, Division, District, Area, Pincode.
  const us=sheet_(CONFIG.USER_SHEET), ur=us.getDataRange().getValues(), uh=ur.shift(), ui=Object.fromEntries(uh.map((x,i)=>[x,i]));
  const u=ur.find(r=>String(r[ui['User ID']])===String(userId)); if(!u)return [];
  const fields=['Region','State','Division','District','Area','Pincode'];
  return rows.filter(r=>fields.every(f=>!ui[f]||!u[ui[f]]||String(r[ix[f]])===String(u[ui[f]])||f==='Pincode'&&String(u[ui[f]])==='All'))
    .map(r=>({region:r[ix.Region],state:r[ix.State],division:r[ix.Division],district:r[ix.District],area:r[ix.Area],pincode:r[ix.Pincode]}));
}

function auth_(token){
  const x=CacheService.getScriptCache().get('sess_'+token);
  if(!x)throw new Error('Session expired. Please login again.');
  return JSON.parse(x);
}
function reportSheet_(year){
  return ensureSheet_(CONFIG.REPORT_SHEET_PREFIX+year,['Report ID','Week Date','User ID','Region','State','Division','District','Area','Pincode','Participants','Volunteers JSON','Status','Timestamp']);
}
function saveReport_(b){
  const u=auth_(b.sessionToken), r=b.report||{};
  if(!r.weekDate||!r.area)throw new Error('Week and Area are required');
  if(!Number.isInteger(Number(r.participants))||Number(r.participants)<0)throw new Error('Participants must be a whole number');
  const allowed=locationAccess_(u.userId,u.role);
  if(u.role!=='Admin'&&u.role!=='HOD'&&!allowed.some(x=>String(x.area)===String(r.area)&&String(x.pincode)===String(r.pincode)))throw new Error('This location is not assigned to your account');
  const s=reportSheet_(new Date(r.weekDate).getFullYear());
  const rows=s.getDataRange().getValues();
  const duplicate=rows.slice(1).some(x=>String(x[1])===String(r.weekDate)&&String(x[2])===String(u.userId)&&String(x[7])===String(r.area));
  if(duplicate&&r.status==='Submitted')throw new Error('This weekly report already exists for this Area.');
  s.appendRow([Utilities.getUuid(),r.weekDate,u.userId,r.region,r.state,r.division,r.district,r.area,r.pincode,Number(r.participants),JSON.stringify(r.volunteers||[]),r.status||'Submitted',new Date()]);
  log_(u.userId,'SAVE_REPORT',JSON.stringify(r));
  return {ok:true};
}

function progress_(b){
  const u=auth_(b.sessionToken), from=b.from||'1900-01-01', to=b.to||'2999-12-31';
  const out=[]; let total=0;
  Object.keys({}).length; // no-op
  const years=[...new Set([new Date(from).getFullYear(),new Date(to).getFullYear()])];
  years.forEach(y=>{
    const s=sheet_(CONFIG.REPORT_SHEET_PREFIX+y); if(!s)return;
    const rows=s.getDataRange().getValues(); rows.shift();
    rows.forEach(r=>{
      const d=String(r[1]); if(d<from||d>to)return;
      total+=Number(r[9])||0; out.push({date:d,region:r[3],state:r[4],division:r[5],district:r[6],area:r[7],participants:Number(r[9])||0});
    });
  });
  return {ok:true,total,rows:out};
}

function notifications_(b){
  const u=auth_(b.sessionToken), allowed=locationAccess_(u.userId,u.role), week=b.weekDate;
  const year=new Date(week).getFullYear(), s=sheet_(CONFIG.REPORT_SHEET_PREFIX+year);
  const submitted=new Set();
  if(s){s.getDataRange().getValues().slice(1).forEach(r=>{if(String(r[1])===String(week))submitted.add(String(r[7])+'|'+String(r[8]))})}
  const pending=allowed.filter(x=>!submitted.has(String(x.area)+'|'+String(x.pincode)));
  return {ok:true,pending};
}
function systemInfo_(b){auth_(b.sessionToken); return {ok:true,year:new Date().getFullYear(),driveRoot:CONFIG.DRIVE_ROOT,photoFolder:CONFIG.PHOTO_FOLDER,reportFolder:CONFIG.REPORT_FOLDER}}
function log_(uid,a,d){sheet_(CONFIG.LOG_SHEET).appendRow([new Date(),uid,a,d])}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('')}

function doOptions(){return ContentService.createTextOutput('ok')}
