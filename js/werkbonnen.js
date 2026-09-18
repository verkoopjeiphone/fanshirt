const SUPABASE_URL="https://oycmdwxmlhchftlunbem.supabase.co";
const SUPABASE_KEY="sb_publishable_jt7eY4iVp3rrT40D6toWpQ_1NcOO0mU";

let supabase=null;
let profile=null;

const $=id=>document.getElementById(id);
const loginView=$("loginView"),portalView=$("portalView"),loginMessage=$("loginMessage"),accessMessage=$("accessMessage");

function showLogin(message=""){loginView.hidden=false;portalView.hidden=true;loginMessage.textContent=message}
function showPortal(){loginView.hidden=true;portalView.hidden=false}
function setLoginError(message){loginMessage.textContent=message;loginMessage.classList.add("error")}

async function loadProfile(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){showLogin();return false}
  const {data:userRow,error:userError}=await supabase.from("gebruiker").select("id,naam,email,actief,rol,organisatie_id,organisatie:organisatie_id(id,naam,actieve_modules)").eq("id",user.id).maybeSingle();
  if(userError) throw userError;
  if(!userRow){await supabase.auth.signOut();showLogin("Je account is nog niet gekoppeld aan een Normly-gebruiker.");return false}
  if(!userRow.actief){await supabase.auth.signOut();showLogin("Je Normly-account is gedeactiveerd.");return false}
  const org=userRow.organisatie;
  if(!org||!(org.actieve_modules||[]).includes("werkbonnen")){await supabase.auth.signOut();showLogin("Werkbonnen is voor jouw organisatie nog niet geactiveerd.");return false}
  const {data:wbRole,error:roleError}=await supabase.from("werkbon_gebruiker").select("rol").eq("gebruiker_id",user.id).maybeSingle();
  if(roleError) throw roleError;
  if(!wbRole){await supabase.auth.signOut();showLogin("Je account heeft nog geen Werkbonnen-rol.");return false}
  profile={...userRow,werkbonRol:wbRole.rol};
  $("userBadge").textContent=userRow.naam||userRow.email||user.email;
  $("welcomeTitle").textContent="Overzicht";
  $("orgLabel").textContent=org.naam;
  $("roleLabel").textContent=wbRole.rol;
  showPortal();
  await loadWorkorders();
  return true;
}

async function loadWorkorders(){
  accessMessage.textContent="";
  accessMessage.classList.remove("error");
  const {data,error}=await supabase.from("werkbon").select("id,nummer,titel,omschrijving,prioriteit,status,gepland_op,gepland_van,gepland_tot,klant:klant_id(naam)").order("gepland_op",{ascending:true}).order("nummer",{ascending:false});
  if(error){accessMessage.textContent="Werkbonnen konden niet worden geladen: "+error.message;accessMessage.classList.add("error");return}
  const rows=data||[];
  const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Amsterdam"});
  $("openCount").textContent=rows.filter(r=>!["afgerond","gefactureerd"].includes(r.status)).length;
  $("todayCount").textContent=rows.filter(r=>r.gepland_op===today).length;
  $("doneCount").textContent=rows.filter(r=>["afgerond","gefactureerd"].includes(r.status)).length;
  const container=$("workorders");
  if(!rows.length){container.innerHTML='<div class="empty">Er zijn nog geen werkbonnen beschikbaar.</div>';return}
  container.innerHTML=rows.map(r=>{
    const date=r.gepland_op?new Intl.DateTimeFormat("nl-NL",{dateStyle:"medium"}).format(new Date(r.gepland_op+"T00:00:00")):"Nog niet gepland";
    const klant=r.klant?.naam?" · "+escapeHtml(r.klant.naam):"";
    return '<article class="workorder"><div><h3>'+escapeHtml(r.nummer)+" — "+escapeHtml(r.titel)+'</h3><p>'+date+klant+'</p></div><span class="status">'+escapeHtml(r.status.replaceAll("_"," "))+"</span></article>";
  }).join("");
}

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

window.NormlyLogin=async function(e){
  e.preventDefault();
  loginMessage.classList.remove("error");
  loginMessage.textContent="Bezig met inloggen...";
  if(!supabase){
    setLoginError("De loginmodule is niet goed geladen. Ik heb dit geblokkeerd zodat je gegevens niet in de URL terechtkomen.");
    return false;
  }
  const email=$("email").value.trim(),password=$("password").value;
  try{
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setLoginError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");return false}
    await loadProfile();
  }catch(err){
    console.error(err);
    await supabase.auth.signOut();
    setLoginError("Er ging iets mis bij het laden van je Werkbonnen-profiel: "+(err?.message||"onbekende fout"));
  }
  return false;
};

async function init(){
  if(!window.supabase?.createClient){
    setLoginError("De Supabase-loginmodule kon niet worden geladen. Controleer je internetverbinding en probeer opnieuw.");
    return;
  }
  supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  $("logoutButton").addEventListener("click",async()=>{await supabase.auth.signOut();profile=null;showLogin("Je bent uitgelogd.")});
  $("refreshButton").addEventListener("click",loadWorkorders);
  $("resetButton").addEventListener("click",async()=>{
    const email=$("email").value.trim();
    if(!email){loginMessage.textContent="Vul eerst je e-mailadres in.";return}
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});
    loginMessage.textContent=error?"Wachtwoord resetten is niet gelukt.":"Als dit account bestaat, ontvang je een e-mail om je wachtwoord te wijzigen.";
  });
  supabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT")showLogin()});
  try{await loadProfile()}catch(err){console.error(err);setLoginError("Het portaal kon niet worden geladen: "+(err?.message||"onbekende fout"))}
}

init();
