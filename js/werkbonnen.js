
const SUPABASE_URL="https://oycmdwxmlhchftlunbem.supabase.co";
const SUPABASE_KEY="sb_publishable_jt7eY4iVp3rrT40D6toWpQ_1NcOO0mU";
const PHOTO_BUCKET="werkbon-fotos";
let accessToken=sessionStorage.getItem("normly_workbon_access")||"",sessionUser=JSON.parse(sessionStorage.getItem("normly_workbon_user")||"null"),profile=null,wbRole=null,customers=[],contacts=[],objects=[],employees=[],currentWorkorder=null,signatureCanvas=null,signatureDrawing=false;
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

const DEMO_INPUTS=[
 {type:"mail",source:"E-mail",klant:"DEMO-1002",title:"Storing bouwplaatsverlichting",body:"Goedemiddag, op onze bouwplaats aan de westzijde vallen sinds vanochtend meerdere lichtarmaturen uit. Kunnen jullie de voeding en armaturen controleren en de storing oplossen? Graag vandaag als dat lukt.\n\nGroet, Sophie de Ruiter",priority:"hoog",soort:"Storing"},
 {type:"mail",source:"E-mail",klant:"DEMO-1005",title:"Lekkage kelder De Horizon",body:"Er is een vochtplek ontstaan bij een leidingdoorvoer in de kelder. Willen jullie de oorzaak controleren en indien mogelijk een tijdelijke maatregel uitvoeren? De sleutelhouder kan op locatie komen.\n\nMet vriendelijke groet, Peter Visser",priority:"spoed",soort:"Storing"},
 {type:"tekening",source:"Tekening",klant:"DEMO-1003",title:"Inspectie laadperron 3",body:"Tekening gemarkeerd met LP-03. Controleer de technische voorzieningen rond het laadperron en noteer eventuele afwijkingen in de werkbon. Meetrapport meenemen.",priority:"normaal",soort:"Inspectie"},
 {type:"tekening",source:"Tekening",klant:"DEMO-1001",title:"Onderhoud LBK-01",body:"Technische ruimte dak. Luchtbehandelingskast LBK-01. Reinig filters, controleer ventilator en riemaandrijving. Vervang filters indien nodig.",priority:"normaal",soort:"Onderhoud"},
 {type:"mail",source:"E-mail",klant:"DEMO-1004",title:"Klimaatklacht tweede verdieping",body:"In drie kantoorruimten op de tweede verdieping is het te warm. Graag regeling, sensoren en luchtverdeling controleren. Bel Lisa kort voor aankomst.",priority:"hoog",soort:"Storing"}
];
function renderDemoInputs(){
 const el=$("demoInputs"); if(!el)return;
 el.innerHTML=DEMO_INPUTS.map((x,i)=>'<article class="input-card"><div class="input-card-head"><span class="input-type">'+esc(x.source)+'</span><span class="priority priority-'+esc(x.priority)+'">'+esc(x.priority)+'</span></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.body.slice(0,145))+(x.body.length>145?'…':'')+'</p>'+(x.type==='tekening'?'<div class="drawing-mini"><span>TECHNISCHE TEKENING</span><i></i><b></b><em>LP / LBK</em></div>':'<div class="mail-mini"><strong>Van</strong><span>'+esc(x.klant==='DEMO-1002'?'Sophie de Ruiter':x.klant==='DEMO-1005'?'Peter Visser':'Techniek / beheer')+'</span><small>Opdracht ontvangen</small></div>')+'<button class="secondary input-action" data-input-index="'+i+'">Maak werkbon van deze input</button></article>').join('');
 document.querySelectorAll('.input-action').forEach(b=>b.onclick=()=>createFromDemoInput(Number(b.dataset.inputIndex)));
}
async function createFromDemoInput(i){
 const x=DEMO_INPUTS[i]; if(!x)return;
 try{
  const k=customers.find(c=>c.klantnummer===x.klant), cp=contacts.find(c=>c.klant_id===k?.id), o=objects.find(o=>o.klant_id===k?.id);
  const date=new Date();date.setDate(date.getDate()+1);
  const p={organisatie_id:profile.organisatie_id,klant_id:k?.id||null,contactpersoon_id:cp?.id||null,object_id:o?.id||null,titel:'DEMO | '+x.title,omschrijving:x.body,soort_werk:x.soort,prioriteit:x.priority,status:'concept',gepland_op:date.toISOString().slice(0,10),aangemaakt_door:profile.id,opmerking_intern:'Bron: '+x.source+'. Demo-voorbeeld: Normly maakt een eerste werkbonvoorstel op basis van de ontvangen input.',factuurstatus:'te_factureren'};
  const made=await rest('werkbon',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(p)});
  await list(); if(made?.[0]?.id)await openWorkorder(made[0].id);
 }catch(e){err($("accessMessage"),e.message||'Werkbonvoorstel maken mislukt.')}
}
function openInputModal(){
 $("inputMessage").textContent='';
 $("inputForm").reset();
 $("inputCustomer").innerHTML='<option value="">Geen klant</option>'+customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.naam)+'</option>').join('');
 openModal('inputModal');
}
async function createFromManualInput(e){
 e.preventDefault();
 try{
  const title=$("inputSubject").value.trim()||'Nieuwe opdracht vanuit input';
  const body=$("inputBody").value.trim(); if(!body)throw new Error('Vul de inhoud van de opdracht in.');
  const k=customers.find(c=>c.id===$("inputCustomer").value), cp=contacts.find(c=>c.klant_id===k?.id), o=objects.find(o=>o.klant_id===k?.id);
  const file=$("inputFile").files?.[0];
  const lower=(title+' '+body).toLowerCase();
  const soort=lower.includes('inspect')||lower.includes('tekening')?'Inspectie':lower.includes('onderhoud')||lower.includes('filter')?'Onderhoud':lower.includes('lekk')||lower.includes('storing')||lower.includes('uitval')?'Storing':'Werkzaamheden';
  const priority=lower.includes('spoed')||lower.includes('vandaag')?'spoed':lower.includes('urgent')||lower.includes('direct')?'hoog':'normaal';
  const p={organisatie_id:profile.organisatie_id,klant_id:k?.id||null,contactpersoon_id:cp?.id||null,object_id:o?.id||null,titel:'DEMO | '+title,omschrijving:body,soort_werk:soort,prioriteit:priority,status:'concept',aangemaakt_door:profile.id,opmerking_intern:'Bron: '+$("inputType").value+(file?' · Bijlage: '+file.name:'')+'. Demo-voorstel; controleer de voorgestelde gegevens voordat de werkbon wordt ingepland.',factuurstatus:'te_factureren'};
  const made=await rest('werkbon',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(p)});
  closeModal('inputModal');await list();if(made?.[0]?.id)await openWorkorder(made[0].id);
 }catch(e){err($("inputMessage"),e.message||'Werkbonvoorstel maken mislukt.')}
}
\nconst ROLE_LABELS={monteur:"Monteur",leidinggevende:"Leidinggevende",planner:"Planner",beheerder:"Beheerder"};
const STATUS_LABELS={concept:"Concept",ingepland:"Ingepland",onderweg:"Onderweg",in_uitvoering:"In uitvoering",wacht_op_klant:"Wacht op klant",afgerond:"Afgerond",gefactureerd:"Gefactureerd"};
const STATUS_ORDER=["concept","ingepland","onderweg","in_uitvoering","wacht_op_klant","afgerond","gefactureerd"];
const apiHeaders=()=>({apikey:SUPABASE_KEY,Authorization:"Bearer "+accessToken,"Content-Type":"application/json"});
async function rest(path,opt={}){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...opt,headers:{...apiHeaders(),...(opt.headers||{})}}),b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.message||b?.hint||b?.error_description||"Databaseverzoek mislukt.");return b}
async function authRequest(email,password){const r=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.msg||b.error_description||b.message||"Inloggen mislukt.");return b}
function showLogin(m=""){$("loginView").hidden=false;$("portalView").hidden=true;$("loginMessage").textContent=m;$("loginMessage").classList.remove("error")}
function showPortal(){$("loginView").hidden=true;$("portalView").hidden=false}
function err(target,m){target.textContent=m;target.classList.add("error")}
function office(){return["leidinggevende","planner","beheerder"].includes(wbRole)}
function admin(){return["planner","beheerder"].includes(wbRole)}

async function loadProfile(){
 if(!accessToken||!sessionUser?.id)return false;
 const u=(await rest("gebruiker?select=id,naam,email,actief,rol,organisatie_id,organisatie:organisatie_id(id,naam,actieve_modules)&id=eq."+encodeURIComponent(sessionUser.id)))?.[0];
 if(!u||!u.actief)throw new Error("Je Normly-account is niet actief of niet gekoppeld.");
 if(!u.organisatie||(u.organisatie.actieve_modules||[]).indexOf("werkbonnen")<0)throw new Error("Werkbonnen is voor jouw organisatie nog niet geactiveerd.");
 const rr=await rest("werkbon_gebruiker?select=rol&gebruiker_id=eq."+encodeURIComponent(u.id));wbRole=rr?.[0]?.rol;if(!wbRole)throw new Error("Je account heeft nog geen Werkbonnen-rol.");
 profile=u;$("userBadge").textContent=u.naam||u.email||"";$("orgLabel").textContent=u.organisatie.naam||"";$("roleLabel").textContent=ROLE_LABELS[wbRole]||wbRole;$("newWorkorderButton").hidden=!office();$("manageButton").hidden=!admin();showPortal();await refs();renderDemoInputs();await list();return true
}
async function refs(){
 [customers,employees]=await Promise.all([
  rest("werkbon_klant?select=id,naam,klantnummer,adres,postcode,plaats,email,telefoon,actief&actief=eq.true&order=naam.asc"),
  rest("gebruiker?select=id,naam,email,actief,organisatie_id&organisatie_id=eq."+encodeURIComponent(profile.organisatie_id)+"&actief=eq.true&order=naam.asc")
 ]);
 [contacts,objects]=await Promise.all([
  rest("werkbon_contactpersoon?select=id,klant_id,naam,functie,email,telefoon&order=naam.asc"),
  rest("werkbon_object?select=id,klant_id,type,naam,identificatie,merk,model,bouwjaar,locatie_omschrijving,notitie,actief&actief=eq.true&order=naam.asc")
 ]);
 renderSelects()
}
function renderSelects(){
 $("newCustomer").innerHTML='<option value="">Geen klant</option>'+customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.naam)+(c.klantnummer?" · "+esc(c.klantnummer):"")+"</option>").join("");
 $("customerManageList").innerHTML=customers.length?customers.map(c=>'<div class="manage-row"><div><strong>'+esc(c.naam)+'</strong><small>'+esc([c.adres,c.postcode,c.plaats].filter(Boolean).join(", "))+"</small></div></div>").join(""):'<div class="empty">Nog geen klanten.</div>';
 dependentSelects()
}
function dependentSelects(){
 const cid=$("newCustomer").value;
 $("newObject").innerHTML='<option value="">Geen object</option>'+objects.filter(o=>!cid||o.klant_id===cid).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.naam)+(o.locatie_omschrijving?" · "+esc(o.locatie_omschrijving):"")+"</option>").join("");
 $("newContact").innerHTML='<option value="">Geen contactpersoon</option>'+contacts.filter(c=>!cid||c.klant_id===cid).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.naam)+(c.functie?" · "+esc(c.functie):"")+"</option>").join("")
}
async function list(){
 const rows=await rest("werkbon?select=id,nummer,titel,prioriteit,status,gepland_op,gepland_van,gepland_tot,klant:klant_id(naam),object:object_id(naam,locatie_omschrijving)&order=gepland_op.asc.nullslast&order=nummer.desc")||[];
 const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Amsterdam"});
 $("openCount").textContent=rows.filter(r=>!["afgerond","gefactureerd"].includes(r.status)).length;
 $("todayCount").textContent=rows.filter(r=>r.gepland_op===today).length;
 $("doneCount").textContent=rows.filter(r=>["afgerond","gefactureerd"].includes(r.status)).length;
 $("plannedCount").textContent=rows.filter(r=>["ingepland","onderweg","in_uitvoering"].includes(r.status)).length;
 $("workorders").innerHTML=rows.length?rows.map(r=>{const d=r.gepland_op?new Intl.DateTimeFormat("nl-NL",{dateStyle:"medium"}).format(new Date(r.gepland_op+"T00:00:00")):"Nog niet gepland",t=r.gepland_van?" · "+r.gepland_van.slice(0,5)+(r.gepland_tot?"–"+r.gepland_tot.slice(0,5):""):"";return '<button class="workorder" type="button" data-id="'+esc(r.id)+'"><div><div class="workorder-top"><strong>'+esc(r.nummer)+'</strong><span class="priority priority-'+esc(r.prioriteit)+'">'+esc(r.prioriteit)+'</span></div><h3>'+esc(r.titel)+'</h3><p>'+esc(r.klant?.naam||"Geen klant")+" · "+esc(d+t)+(r.object?.locatie_omschrijving?" · "+esc(r.object.locatie_omschrijving):"")+'</p></div><span class="status status-'+esc(r.status)+'">'+esc(STATUS_LABELS[r.status]||r.status)+"</span></button>"}).join(""):'<div class="empty"><strong>Nog geen werkbonnen</strong><span>Maak de eerste werkbon aan.</span></div>';
 document.querySelectorAll(".workorder").forEach(x=>x.onclick=()=>openWorkorder(x.dataset.id))
}
async function createWorkorder(e){
 e.preventDefault();$("saveNewWorkorder").disabled=true;
 try{const p={organisatie_id:profile.organisatie_id,klant_id:$("newCustomer").value||null,contactpersoon_id:$("newContact").value||null,object_id:$("newObject").value||null,titel:$("newTitle").value.trim(),omschrijving:$("newDescription").value.trim()||null,soort_werk:$("newType").value.trim()||null,prioriteit:$("newPriority").value,status:$("newDate").value?"ingepland":"concept",gepland_op:$("newDate").value||null,gepland_van:$("newFrom").value||null,gepland_tot:$("newTo").value||null,aangemaakt_door:profile.id,opmerking_intern:$("newInternal").value.trim()||null,factuurstatus:$("newInvoice").value};if(!p.titel)throw new Error("Vul een titel in.");const made=await rest("werkbon",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify(p)});closeModal("newModal");await list();if(made?.[0]?.id)await openWorkorder(made[0].id)}catch(e){err($("newMessage"),e.message||"Werkbon aanmaken mislukt.")}finally{$("saveNewWorkorder").disabled=false}
}
async function openWorkorder(id){
 try{currentWorkorder=(await rest("werkbon?select=*,klant:klant_id(id,naam,adres,postcode,plaats,email,telefoon),contact:contactpersoon_id(id,naam,functie,email,telefoon),object:object_id(id,naam,type,identificatie,merk,model,locatie_omschrijving)&id=eq."+encodeURIComponent(id)))?.[0];if(!currentWorkorder)throw new Error("Werkbon niet gevonden.");
 const q=encodeURIComponent(id),[a,h,m,p,l]=await Promise.all([
  rest("werkbon_toewijzing?select=werkbon_id,gebruiker_id,hoofduitvoerder,gebruiker:gebruiker_id(id,naam,email)&werkbon_id=eq."+q),
  rest("werkbon_uur?select=id,gebruiker_id,datum,soort,minuten,omschrijving,gebruiker:gebruiker_id(naam)&werkbon_id=eq."+q+"&order=datum.desc,created_at.desc"),
  rest("werkbon_materiaal?select=id,omschrijving,artikelnummer,aantal,eenheid&werkbon_id=eq."+q+"&order=created_at.desc"),
  rest("werkbon_foto?select=id,storage_pad,fase,omschrijving,created_at&werkbon_id=eq."+q+"&order=created_at.desc"),
  rest("werkbon_statuslog?select=id,van_status,naar_status,toelichting,created_at,gebruiker:gebruiker_id(naam)&werkbon_id=eq."+q+"&order=created_at.desc")
 ]);renderDetail(a||[],h||[],m||[],p||[],l||[]);openModal("detailModal")}catch(e){err($("accessMessage"),e.message||"Werkbon kon niet worden geopend.")}
}
function renderDetail(a,h,m,p,l){
 const w=currentWorkorder;$("detailTitle").textContent=(w.nummer||"")+" · "+(w.titel||"");$("detailStatus").textContent=STATUS_LABELS[w.status]||w.status;$("detailStatus").className="status status-"+w.status;$("detailCustomer").textContent=w.klant?.naam||"Geen klant";$("detailLocation").textContent=w.object?(w.object.naam+(w.object.locatie_omschrijving?" · "+w.object.locatie_omschrijving:"")):"Geen object/locatie";$("detailDescription").textContent=w.omschrijving||"Geen omschrijving.";
 $("executionText").value=w.uitvoering_omschrijving||"";$("customerNote").value=w.opmerking_klant||"";$("internalNote").value=w.opmerking_intern||"";$("invoiceReference").value=w.factuur_referentie||"";$("invoiceStatus").value=w.factuurstatus||"niet_factureren";$("detailSaveBasic").hidden=false;$("invoiceBox").hidden=!admin();
 $("detailStatusSelect").innerHTML=STATUS_ORDER.map(s=>'<option value="'+s+'"'+(s===w.status?" selected":"")+'>'+STATUS_LABELS[s]+"</option>").join("");$("detailStatusSelect").disabled=false;if(wbRole==="monteur")["concept","ingepland","gefactureerd"].forEach(s=>{const o=$("detailStatusSelect").querySelector('option[value="'+s+'"]');if(o)o.disabled=true});
 $("assignmentList").innerHTML=employees.map(e=>{const x=a.find(v=>v.gebruiker_id===e.id);return '<label class="check-row"><input type="checkbox" data-employee="'+esc(e.id)+'"'+(x?" checked":"")+(office()?"":" disabled")+"><span>"+esc(e.naam||e.email)+"</span></label>"}).join("")||'<div class="empty">Geen actieve medewerkers.</div>';
 $("hoursList").innerHTML=h.length?h.map(x=>'<div class="data-row"><div><strong>'+esc(x.gebruiker?.naam||"Medewerker")+'</strong><small>'+esc(x.datum)+" · "+esc(x.soort)+'</small></div><span>'+formatMin(x.minuten)+'</span><button class="icon-button delete-hour" data-id="'+esc(x.id)+'" type="button">×</button></div>').join(""):'<div class="empty">Nog geen uren.</div>';
 $("materialList").innerHTML=m.length?m.map(x=>'<div class="data-row"><div><strong>'+esc(x.omschrijving)+'</strong><small>'+esc(x.artikelnummer||"Geen artikelnummer")+'</small></div><span>'+esc(x.aantal+" "+x.eenheid)+'</span><button class="icon-button delete-material" data-id="'+esc(x.id)+'" type="button">×</button></div>').join(""):'<div class="empty">Nog geen materialen.</div>';
 $("photoList").innerHTML=p.length?p.map(x=>'<div class="photo-row"><span>'+esc(x.fase)+'</span><div><strong>'+esc(x.omschrijving||"Foto")+'</strong><small>'+esc(new Date(x.created_at).toLocaleString("nl-NL"))+'</small></div></div>').join(""):'<div class="empty">Nog geen foto’s.</div>';
 $("statusLog").innerHTML=l.length?l.map(x=>'<div class="timeline-row"><span class="timeline-dot"></span><div><strong>'+esc(STATUS_LABELS[x.naar_status]||x.naar_status)+'</strong><small>'+esc(new Date(x.created_at).toLocaleString("nl-NL"))+" · "+esc(x.gebruiker?.naam||"Systeem")+"</small>"+(x.toelichting?"<p>"+esc(x.toelichting)+"</p>":"")+"</div></div>").join(""):'<div class="empty">Nog geen statuslog.</div>';
 document.querySelectorAll(".delete-hour").forEach(b=>b.onclick=()=>deleteRow("werkbon_uur",b.dataset.id));document.querySelectorAll(".delete-material").forEach(b=>b.onclick=()=>deleteRow("werkbon_materiaal",b.dataset.id));setupSignature()
}
function formatMin(n){return Math.floor(n/60)+"u "+String(n%60).padStart(2,"0")+"m"}
async function saveDetail(){
 try{const p={status:$("detailStatusSelect").value,uitvoering_omschrijving:$("executionText").value.trim()||null,opmerking_klant:$("customerNote").value.trim()||null,opmerking_intern:$("internalNote").value.trim()||null};if(admin()){p.factuurstatus=$("invoiceStatus").value;p.factuur_referentie=$("invoiceReference").value.trim()||null}await rest("werkbon?id=eq."+encodeURIComponent(currentWorkorder.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(p)});if(office())await saveAssignments();await list();await openWorkorder(currentWorkorder.id);$("detailMessage").textContent="Opgeslagen."}catch(e){err($("detailMessage"),e.message||"Opslaan mislukt.")}
}
async function saveAssignments(){const ids=[...document.querySelectorAll("[data-employee]:checked")].map(x=>x.dataset.employee);await rest("werkbon_toewijzing?werkbon_id=eq."+encodeURIComponent(currentWorkorder.id),{method:"DELETE"});if(ids.length)await rest("werkbon_toewijzing",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify(ids.map((id,i)=>({werkbon_id:currentWorkorder.id,gebruiker_id:id,hoofduitvoerder:i===0})))})}
async function addHours(e){e.preventDefault();try{const mins=Number($("hourHours").value||0)*60+Number($("hourMinutes").value||0);if(mins<=0||mins>1440)throw new Error("Voer een geldig aantal uren/minuten in.");await rest("werkbon_uur",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({werkbon_id:currentWorkorder.id,gebruiker_id:profile.id,datum:$("hourDate").value,soort:$("hourType").value,minuten:Math.round(mins),omschrijving:$("hourDescription").value.trim()||null})});e.target.reset();$("hourDate").value=new Date().toISOString().slice(0,10);await openWorkorder(currentWorkorder.id)}catch(e){err($("detailMessage"),e.message||"Uren opslaan mislukt.")}}
async function addMaterial(e){e.preventDefault();try{const n=Number($("materialAmount").value);if(!(n>0))throw new Error("Vul een geldig aantal in.");await rest("werkbon_materiaal",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({werkbon_id:currentWorkorder.id,omschrijving:$("materialDescription").value.trim(),artikelnummer:$("materialNumber").value.trim()||null,aantal:n,eenheid:$("materialUnit").value.trim()||"stuks"})});e.target.reset();$("materialAmount").value="1";$("materialUnit").value="stuks";await openWorkorder(currentWorkorder.id)}catch(e){err($("detailMessage"),e.message||"Materiaal opslaan mislukt.")}}
async function deleteRow(table,id){if(!confirm("Deze regel verwijderen?"))return;try{await rest(table+"?id=eq."+encodeURIComponent(id),{method:"DELETE"});await openWorkorder(currentWorkorder.id)}catch(e){err($("detailMessage"),e.message||"Verwijderen mislukt.")}}
async function uploadPhoto(e){const f=e.target.files?.[0];if(!f)return;try{if(!f.type.startsWith("image/"))throw new Error("Kies een afbeelding.");if(f.size>8*1024*1024)throw new Error("De foto mag maximaal 8 MB zijn.");const path=profile.organisatie_id+"/"+currentWorkorder.id+"/"+Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9._-]/g,"-");const r=await fetch(SUPABASE_URL+"/storage/v1/object/"+PHOTO_BUCKET+"/"+path,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+accessToken,"Content-Type":f.type,"x-upsert":"false"},body:f}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.message||"Foto uploaden mislukt.");await rest("werkbon_foto",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({werkbon_id:currentWorkorder.id,storage_pad:path,fase:$("photoPhase").value,omschrijving:$("photoDescription").value.trim()||null,gebruiker_id:profile.id})});e.target.value="";$("photoDescription").value="";await openWorkorder(currentWorkorder.id)}catch(e){err($("detailMessage"),e.message||"Foto uploaden mislukt.")}}
function setupSignature(){signatureCanvas=$("signatureCanvas");if(!signatureCanvas)return;const c=signatureCanvas.getContext("2d");c.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);c.lineWidth=3;c.lineCap="round";c.strokeStyle="#173b61";signatureDrawing=false;const point=e=>{const r=signatureCanvas.getBoundingClientRect(),s=e.touches?.[0]||e;return{x:(s.clientX-r.left)*signatureCanvas.width/r.width,y:(s.clientY-r.top)*signatureCanvas.height/r.height}};signatureCanvas.onpointerdown=e=>{e.preventDefault();signatureDrawing=true;const p=point(e);c.beginPath();c.moveTo(p.x,p.y)};signatureCanvas.onpointermove=e=>{if(!signatureDrawing)return;e.preventDefault();const p=point(e);c.lineTo(p.x,p.y);c.stroke()};signatureCanvas.onpointerup=()=>signatureDrawing=false;signatureCanvas.onpointerleave=()=>signatureDrawing=false}
async function saveSignature(){try{const name=$("signatureName").value.trim();if(!name)throw new Error("Vul de naam van de klant in.");const blob=await new Promise(r=>signatureCanvas.toBlob(r,"image/png"));if(!blob)throw new Error("Handtekening kon niet worden verwerkt.");const path=profile.organisatie_id+"/"+currentWorkorder.id+"/signature-"+Date.now()+".png",r=await fetch(SUPABASE_URL+"/storage/v1/object/"+PHOTO_BUCKET+"/"+path,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+accessToken,"Content-Type":"image/png"},body:blob}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.message||"Handtekening uploaden mislukt.");await rest("werkbon?id=eq."+encodeURIComponent(currentWorkorder.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({handtekening_pad:path,handtekening_naam:name,handtekening_op:new Date().toISOString(),status:"afgerond"})});await list();await openWorkorder(currentWorkorder.id)}catch(e){err($("detailMessage"),e.message||"Handtekening opslaan mislukt.")}}
async function createCustomer(e){e.preventDefault();try{await rest("werkbon_klant",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({organisatie_id:profile.organisatie_id,naam:$("customerName").value.trim(),klantnummer:$("customerNumber").value.trim()||null,adres:$("customerAddress").value.trim()||null,postcode:$("customerPostcode").value.trim()||null,plaats:$("customerCity").value.trim()||null,email:$("customerEmail").value.trim()||null,telefoon:$("customerPhone").value.trim()||null,actief:true})});e.target.reset();await refs();$("manageMessage").textContent="Klant toegevoegd."}catch(e){err($("manageMessage"),e.message||"Klant toevoegen mislukt.")}}
async function createObject(e){e.preventDefault();try{await rest("werkbon_object",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({organisatie_id:profile.organisatie_id,klant_id:$("objectCustomer").value||null,type:$("objectType").value.trim(),naam:$("objectName").value.trim(),identificatie:$("objectIdentifier").value.trim()||null,locatie_omschrijving:$("objectLocation").value.trim()||null,actief:true})});e.target.reset();await refs();$("manageMessage").textContent="Object toegevoegd."}catch(e){err($("manageMessage"),e.message||"Object toevoegen mislukt.")}}
async function employeeRoles(){const rs=await rest("werkbon_gebruiker?select=gebruiker_id,rol&order=created_at.asc"),map=new Map((rs||[]).map(x=>[x.gebruiker_id,x.rol]));$("employeeRoles").innerHTML=employees.map(e=>'<div class="manage-row"><div><strong>'+esc(e.naam||e.email)+'</strong><small>'+esc(e.email||"")+'</small></div><select data-role-user="'+esc(e.id)+'"><option value="">Geen rol</option>'+Object.entries(ROLE_LABELS).map(([v,l])=>'<option value="'+v+'"'+(map.get(e.id)===v?" selected":"")+'>'+l+"</option>").join("")+'</select><button class="secondary save-role" data-role-id="'+esc(e.id)+'" type="button">Opslaan</button></div>').join("")||'<div class="empty">Geen actieve medewerkers.</div>';document.querySelectorAll(".save-role").forEach(b=>b.onclick=()=>saveRole(b.dataset.roleId))}
async function saveRole(id){try{const role=$('select[data-role-user="'+id+'"]').value;if(id===profile.id&&!role)throw new Error("Je eigen Werkbonnen-rol kan hier niet worden verwijderd.");const existing=(await rest("werkbon_gebruiker?select=gebruiker_id&gebruiker_id=eq."+encodeURIComponent(id)))?.length>0;if(role){if(existing)await rest("werkbon_gebruiker?gebruiker_id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({rol:role})});else await rest("werkbon_gebruiker",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({gebruiker_id:id,rol:role})})}else{await rest("werkbon_gebruiker?gebruiker_id=eq."+encodeURIComponent(id),{method:"DELETE"})}$("manageMessage").textContent="Rol opgeslagen.";await refs();await employeeRoles()}catch(e){err($("manageMessage"),e.message||"Rol opslaan mislukt.")}}
function openModal(id){$(id).hidden=false;document.body.classList.add("modal-open")}
function closeModal(id){$(id).hidden=true;if(!document.querySelector(".modal:not([hidden])"))document.body.classList.remove("modal-open")}

document.addEventListener("DOMContentLoaded",()=>{
 $("resetButton").onclick=async()=>{const email=$("email").value.trim();if(!email){$("loginMessage").textContent="Vul eerst je e-mailadres in.";return}try{const r=await fetch(SUPABASE_URL+"/auth/v1/recover",{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email})});$("loginMessage").textContent=r.ok?"Als dit account bestaat, ontvang je een e-mail om je wachtwoord te wijzigen.":"Wachtwoord resetten is niet gelukt."}catch(e){err($("loginMessage"),"Wachtwoord resetten is niet gelukt.")}};
 $("loginButton").onclick=async()=>{try{$("loginMessage").textContent="Bezig met inloggen...";const s=await authRequest($("email").value.trim(),$("password").value);accessToken=s.access_token;sessionUser=s.user;sessionStorage.setItem("normly_workbon_access",accessToken);sessionStorage.setItem("normly_workbon_user",JSON.stringify(sessionUser));await loadProfile()}catch(e){accessToken="";sessionStorage.removeItem("normly_workbon_access");sessionStorage.removeItem("normly_workbon_user");err($("loginMessage"),e.message||"Inloggen mislukt.")}};
 $("password").onkeydown=e=>{if(e.key==="Enter")$("loginButton").click()};$("logoutButton").onclick=()=>{accessToken="";sessionUser=null;sessionStorage.removeItem("normly_workbon_access");sessionStorage.removeItem("normly_workbon_user");showLogin("Je bent uitgelogd.")};
 $("refreshButton").onclick=async()=>{try{await refs();renderDemoInputs();await list()}catch(e){err($("accessMessage"),e.message||"Verversen mislukt.")}};
 $("newInputButton").onclick=openInputModal;$("inputForm").onsubmit=createFromManualInput;$("newWorkorderButton").onclick=()=>{ $("newForm").reset();$("newMessage").textContent="";renderSelects();openModal("newModal")};
 $("newCustomer").onchange=dependentSelects;$("newForm").onsubmit=createWorkorder;$("detailSaveBasic").onclick=saveDetail;$("hourForm").onsubmit=addHours;$("materialForm").onsubmit=addMaterial;$("photoFile").onchange=uploadPhoto;$("saveSignature").onclick=saveSignature;$("clearSignature").onclick=setupSignature;
 $("customerForm").onsubmit=createCustomer;$("objectForm").onsubmit=createObject;
 $("manageButton").onclick=async()=>{openModal("manageModal");$("manageMessage").textContent="";$("objectCustomer").innerHTML='<option value="">Geen klant</option>'+customers.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.naam)+"</option>").join("");await employeeRoles()};
 document.querySelectorAll("[data-close-modal]").forEach(b=>b.onclick=()=>closeModal(b.dataset.closeModal));document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id)});
 $("hourDate").value=new Date().toISOString().slice(0,10);$("materialAmount").value="1";$("materialUnit").value="stuks";
 if(accessToken)loadProfile().catch(()=>{accessToken="";sessionStorage.removeItem("normly_workbon_access");sessionStorage.removeItem("normly_workbon_user");showLogin()});
});
