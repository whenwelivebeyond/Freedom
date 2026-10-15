import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

(function(){
"use strict";

var firebaseConfig = {
  apiKey: "AIzaSyDcebyA2CoyHynRbFgmfrTvPa2yHYsmtWQ",
  authDomain: "freedom2027.firebaseapp.com",
  projectId: "freedom2027",
  storageBucket: "freedom2027.firebasestorage.app",
  messagingSenderId: "539779456768",
  appId: "1:539779456768:web:f5e98b2555ca6ee6e7dde5",
  measurementId: "G-YS3XHP8ENT"
};
var firebaseApp = initializeApp(firebaseConfig);
var auth = getAuth(firebaseApp);
var db = getFirestore(firebaseApp);
var googleProvider = new GoogleAuthProvider();

var STATUSES = ["Open","Ready to pitch","Pitched","Converted","Done"];
var SCLASS = {"Open":"s-open","Ready to pitch":"s-ready","Pitched":"s-pitch","Converted":"s-conv","Done":"s-done"};
function sclass(st){ return SCLASS[st] || "s-open"; }

var ICON = {
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  open:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.4 3.4 8.5S14.3 18.1 12 20.5c-2.3-2.4-3.4-5.4-3.4-8.5S9.7 5.9 12 3.5z"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.1 5.3 5.4 2-5.4 2-2.1 5.4-2.1-5.4-5.4-2 5.4-2z"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3.5h3l1.5 3.8-2 1.2a12 12 0 0 0 5.4 5.4l1.2-2 3.8 1.5v3a1.6 1.6 0 0 1-1.7 1.6A15.6 15.6 0 0 1 5 6.2 1.6 1.6 0 0 1 6.6 3.5z"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.2 21.8l5.2-1.4A9.7 9.7 0 1 0 12 2.2zm0 1.8a7.9 7.9 0 1 1-4 14.7l-.4-.2-3 .8.8-2.9-.2-.4A7.9 7.9 0 0 1 12 4zm-3.1 3.6c-.2 0-.5 0-.7.1-.3.1-1.1.6-1.1 1.9s.9 2.6 1 2.8c.1.2 1.8 3 4.5 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.3l-1.5-.8c-.2-.1-.4-.1-.6.1l-.6.8c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.2-.5s0-.3-.1-.4l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.1z"/></svg>'
};

var state = { page:"add", clients:[], filter:"All", search:"", editingId:null, pitchId:null, msgTouched:false, draft:null, preset:"connected", confirmId:null, fresh:true };
/* =========================================================================
   DATA LAYER — Firestore stores the client records in the cloud.

   A client record looks like this. Keep these exact field names:
     {
       id:         "abc123",              // string, assigned by the store
       name:       "Ravi Kumar",          // client / owner name    (required)
       homestay:   "Woodlark Homestay",   // property name          (required)
       number:     "9876543210",          // raw as typed           (required)
       website:    "https://...",         // their existing site, may be ""
       claudeLink: "https://...",         // the site you built,    may be ""
       status:     "Open",                // Open | Ready to pitch | Converted | Done
       createdAt:  1760000000000          // epoch milliseconds, used for sorting
     }

   ========================================================================= */

var FIELDS = ["name","homestay","number","website","claudeLink","status","createdAt"];
var clientsCollection = collection(db, "clients");
var Store = {
  list: async function(){
    var snap = await getDocs(clientsCollection);
    return snap.docs.map(function(item){ return Object.assign({id:item.id}, item.data()); });
  },
  create: async function(rec){
    var payload = Object.assign({}, rec); delete payload.id;
    var created = await addDoc(clientsCollection, payload);
    return Object.assign({id:created.id}, payload);
  },
  update: async function(id, patch){ return await updateDoc(doc(db, "clients", id), patch); },
  remove: async function(id){ return await deleteDoc(doc(db, "clients", id)); }
};

/* ---- What the rest of the app calls ---- */

function setNote(msg){ el("storeNote").textContent = msg || ""; }

async function refresh(){
  try{
    var rows = await Store.list();
    state.clients = Array.isArray(rows) ? rows : [];
    sortClients();
    setNote("Saved to Firebase");
    renderAll();
  }catch(e){
    setNote("Can\u2019t reach the database");
    toast("Couldn\u2019t load clients \u2014 check Firebase access");
  }
}

function sortClients(){ state.clients.sort(function(a,b){ return (b.createdAt||0) - (a.createdAt||0); }); }

async function createClient(data){
  data.createdAt = Date.now();
  if (!data.status) data.status = "Open";
  try { await Store.create(data); }
  finally { await refresh(); }
}

async function patchClient(id, patch){
  var c = byId(id);
  if (c){ Object.keys(patch).forEach(function(k){ c[k] = patch[k]; }); renderAll(); }
  try { await Store.update(id, patch); }
  finally { await refresh(); }
}

async function removeClient(id){
  state.clients = state.clients.filter(function(c){ return c.id !== id; });
  renderAll();
  try { await Store.remove(id); }
  finally { await refresh(); }
}

/* ---------------- helpers ---------------- */

function byId(id){ for (var i=0;i<state.clients.length;i++) if (state.clients[i].id===id) return state.clients[i]; return null; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function el(id){ return document.getElementById(id); }

var toastTimer;
function toast(msg){
  var t = el("toast"); t.textContent = msg; t.classList.add("is-on");
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove("is-on"); }, 2400);
}
function tidyUrl(u){ u = (u||"").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; return u; }
function waDigits(raw){ var d = String(raw||"").replace(/\D/g,""); d = d.replace(/^0+/,""); if (d.length === 10) d = "91" + d; return d; }
function prettyNum(raw){
  var d = String(raw||"").replace(/\D/g,"");
  if (d.length === 10) return d.slice(0,5) + " " + d.slice(5);
  if (d.length === 12 && d.indexOf("91")===0) return "+91 " + d.slice(2,7) + " " + d.slice(7);
  return raw || "";
}

/* ---------------- navigation ---------------- */

Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(t){
  t.addEventListener("click", function(){ go(t.dataset.page); });
});
function go(page){
  if (state.page === page) return;
  state.page = page;
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(t){
    t.setAttribute("aria-selected", String(t.dataset.page === page));
  });
  Array.prototype.forEach.call(document.querySelectorAll(".page"), function(p){
    p.classList.remove("is-on");
  });
  if (page === "list"){ renderChips(); state.fresh = true; renderList(); }
  if (page === "pitch") renderPitch();
  el("page-" + page).classList.add("is-on");
  window.scrollTo(0,0);
}

/* ---------------- page 1 ---------------- */

function markBad(fid, bad){ el(fid).classList.toggle("bad", bad); }

el("saveBtn").addEventListener("click", async function(){
  var name = el("i-name").value.trim(), stay = el("i-stay").value.trim(), num = el("i-num").value.trim();
  markBad("f-name", !name); markBad("f-stay", !stay); markBad("f-num", !num);
  if (!name || !stay || !num) return;
  var btn = this; btn.disabled = true;
  var builtLink = tidyUrl(el("i-claude").value);
  try{
    await createClient({
      name:name, homestay:stay, number:num,
      website: tidyUrl(el("i-site").value),
      claudeLink: builtLink,
      status: builtLink ? "Ready to pitch" : "Open"
    });
    ["i-name","i-stay","i-num","i-site","i-claude"].forEach(function(i){ el(i).value=""; });
    el("i-name").focus();
    toast(builtLink ? stay + " saved \u2014 ready to pitch" : stay + " saved");
  }catch(e){ toast("Couldn\u2019t save \u2014 " + (e && e.code ? e.code : "try again")); }
  btn.disabled = false;
});

el("clearBtn").addEventListener("click", function(){
  ["i-name","i-stay","i-num","i-site","i-claude"].forEach(function(i){ el(i).value=""; });
  ["f-name","f-stay","f-num"].forEach(function(f){ el(f).classList.remove("bad"); });
  el("i-name").focus();
});

/* ---------------- page 2 ---------------- */

el("search").addEventListener("input", function(){ state.search = this.value.toLowerCase(); renderList(); });

function renderChips(){
  var counts = {All: state.clients.length};
  STATUSES.forEach(function(s){ counts[s] = 0; });
  state.clients.forEach(function(c){ if (counts[c.status] != null) counts[c.status]++; });
  var all = ["All"].concat(STATUSES);
  el("filterWrap").innerHTML = '<select id="statusFilter" aria-label="Filter by status">'
    + all.map(function(s){
        return '<option value="'+esc(s)+'"'+(state.filter===s?" selected":"")+'>'+esc(s)+' ('+counts[s]+')</option>';
      }).join("")
    + '</select>';
  el("statusFilter").addEventListener("change", function(){
    state.filter = this.value; renderList();
  });
}

function visibleClients(){
  return state.clients.filter(function(c){
    if (state.filter !== "All" && c.status !== state.filter) return false;
    if (!state.search) return true;
    return ((c.name||"")+" "+(c.homestay||"")+" "+(c.number||"")).toLowerCase().indexOf(state.search) > -1;
  });
}

function renderList(){
  var w = el("listWrap"), rows = visibleClients(), fresh = state.fresh;
  state.fresh = false;
  if (!state.clients.length){
    w.innerHTML = '<div class="empty"><p>No clients yet</p><small>Add your first homestay owner to start tracking.</small><button class="btn primary" id="toAdd">Add a client</button></div>';
    el("toAdd").addEventListener("click", function(){ go("add"); });
    return;
  }
  if (!rows.length){
    w.innerHTML = '<div class="empty"><p>Nothing matches</p><small>Try a different search or status.</small></div>';
    return;
  }
  var body = rows.map(function(c, i){
    var opts = STATUSES.map(function(s){ return '<option value="'+esc(s)+'"'+(c.status===s?" selected":"")+'>'+esc(s)+'</option>'; }).join("");
    var site = c.website ? '<a href="'+esc(c.website)+'" target="_blank" rel="noopener" title="Their website">'+ICON.globe+'</a>' : '';
    var mine = c.claudeLink ? '<a href="'+esc(c.claudeLink)+'" target="_blank" rel="noopener" title="Site you built">'+ICON.spark+'</a>' : '';
    var del = state.confirmId === c.id
      ? '<button class="btn danger" data-del="'+c.id+'">Confirm delete</button>'
      : '<button class="btn danger" data-ask="'+c.id+'">Delete</button>';
    var anim = fresh && i < 12 ? ' class="in" style="animation-delay:'+(i*0.035).toFixed(3)+'s"' : '';
    return '<tr'+anim+'>'
      + '<td class="t-client" data-label="Client"><span class="c-name">'+esc(c.name)+'</span></td>'
      + '<td class="t-stay" data-label="Homestay">'+esc(c.homestay)+'</td>'
      + '<td class="t-num num" data-label="Number">'+esc(prettyNum(c.number))+'</td>'
      + '<td class="t-links links" data-label="Links">'+site+mine+'</td>'
      + '<td class="t-status" data-label="Status"><select class="status-sel '+sclass(c.status)+'" data-st="'+c.id+'" aria-label="Status for '+esc(c.homestay)+'">'+opts+'</select></td>'
      + '<td class="t-act act"><button class="linkish" data-edit="'+c.id+'">Edit</button>'+del+'</td>'
      + '</tr>';
  }).join("");

  w.innerHTML = '<div class="table-wrap"><table><thead><tr>'
    + '<th>Client</th><th>Homestay</th><th>Number</th><th>Links</th><th>Status</th><th></th>'
    + '</tr></thead><tbody>'+body+'</tbody></table></div>';

  Array.prototype.forEach.call(w.querySelectorAll("[data-st]"), function(s){
    s.addEventListener("change", async function(){
      s.className = "status-sel " + sclass(s.value) + " flash";
      try{ await patchClient(s.dataset.st, {status:s.value}); toast("Moved to \u201c"+s.value+"\u201d"); }
      catch(e){ toast("Couldn\u2019t update"); renderList(); }
    });
  });
  Array.prototype.forEach.call(w.querySelectorAll("[data-edit]"), function(b){
    b.addEventListener("click", function(){ openEdit(b.dataset.edit); });
  });
  Array.prototype.forEach.call(w.querySelectorAll("[data-ask]"), function(b){
    b.addEventListener("click", function(){ state.confirmId = b.dataset.ask; renderList(); });
  });
  Array.prototype.forEach.call(w.querySelectorAll("[data-del]"), function(b){
    b.addEventListener("click", async function(){
      state.confirmId = null;
      try{ await removeClient(b.dataset.del); toast("Client deleted"); }
      catch(e){ toast("Couldn\u2019t delete"); }
    });
  });
}

/* ---------------- edit ---------------- */

el("e-status").innerHTML = STATUSES.map(function(s){ return '<option>'+esc(s)+'</option>'; }).join("");

function openEdit(id){
  var c = byId(id); if (!c) return;
  state.editingId = id;
  el("e-name").value = c.name||""; el("e-stay").value = c.homestay||"";
  el("e-num").value = c.number||""; el("e-site").value = c.website||"";
  el("e-claude").value = c.claudeLink||""; el("e-status").value = c.status||"Open";
  el("editOverlay").classList.add("is-on");
  el("e-name").focus();
}
function closeEdit(){ el("editOverlay").classList.remove("is-on"); state.editingId = null; }
el("editCancel").addEventListener("click", closeEdit);
el("editOverlay").addEventListener("click", function(e){ if (e.target === this) closeEdit(); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeEdit(); });

el("editSave").addEventListener("click", async function(){
  var id = state.editingId; if (!id) return;
  var name = el("e-name").value.trim(), stay = el("e-stay").value.trim(), num = el("e-num").value.trim();
  if (!name || !stay || !num){ toast("Name, homestay and number are needed"); return; }
  this.disabled = true;
  try{
    await patchClient(id, {
      name:name, homestay:stay, number:num,
      website: tidyUrl(el("e-site").value),
      claudeLink: tidyUrl(el("e-claude").value),
      status: el("e-status").value
    });
    toast("Changes saved"); closeEdit();
  }catch(e){ toast("Couldn\u2019t save changes"); }
  this.disabled = false;
});

/* ---------------- page 3 ---------------- */

function readyList(){ return state.clients.filter(function(c){ return c.status === "Ready to pitch"; }); }

function renderPitch(){
  var w = el("pitchWrap"), ready = readyList();
  if (!ready.length){
    w.innerHTML = '<div class="empty"><p>Nobody is ready to pitch</p><small>Set a client\u2019s status to \u201cReady to pitch\u201d and they\u2019ll appear here.</small><button class="btn ghost" id="toList">Open clients</button></div>';
    el("toList").addEventListener("click", function(){ go("list"); });
    return;
  }
  var c = state.pitchId ? byId(state.pitchId) : null;
  if (c && c.status !== "Ready to pitch"){ c = null; state.pitchId = null; }

  w.innerHTML =
    '<div class="card step">'
    + '<h2>Who are you messaging</h2>'
    + '<div class="two">'
    +   comboHTML("num","Number","Type a number", c ? prettyNum(c.number) : "")
    +   comboHTML("stay","Homestay","Type a homestay name", c ? c.homestay : "")
    + '</div></div>'
    + '<div id="pitchDetails">' + (c ? detailsHTML(c) : noPickHTML()) + '</div>';

  wireCombo("num"); wireCombo("stay");
  if (c) wireDetails(c);
}

function noPickHTML(){
  return '<div class="empty"><p>Pick someone to pitch</p><small>Search by number or homestay name above \u2014 picking one fills the other.</small></div>';
}

function comboHTML(kind, label, ph, value){
  return '<div class="field" style="margin-bottom:0">'
    + '<label for="p-'+kind+'">'+label+'</label>'
    + '<div class="combo'+(value?' has-value':'')+'" id="combo-'+kind+'">'
    +   '<input type="text" id="p-'+kind+'" autocomplete="off" role="combobox" aria-expanded="false" '
    +     'aria-controls="list-'+kind+'" placeholder="'+esc(ph)+'" value="'+esc(value||"")+'">'
    +   '<button class="combo-clear" type="button" aria-label="Clear">&times;</button>'
    +   '<ul class="combo-list" id="list-'+kind+'" role="listbox"></ul>'
    + '</div></div>';
}

function wireCombo(kind){
  var box = el("combo-"+kind), input = el("p-"+kind), list = el("list-"+kind);
  var active = -1, matches = [];

  function matchesFor(q){
    q = (q||"").trim().toLowerCase();
    var qd = q.replace(/\D/g,"");
    return readyList().filter(function(r){
      if (!q) return true;
      var name = (r.name||"").toLowerCase();
      if (kind === "num"){
        var d = String(r.number||"").replace(/\D/g,"");
        return (qd.length > 0 && d.indexOf(qd) > -1) || name.indexOf(q) > -1;
      }
      return (r.homestay||"").toLowerCase().indexOf(q) > -1 || name.indexOf(q) > -1;
    });
  }
  function draw(){
    matches = matchesFor(input.value);
    if (!matches.length){ list.innerHTML = '<li class="none">Nothing matches</li>'; return; }
    list.innerHTML = matches.map(function(r,i){
      var on = i === active ? ' class="on"' : '';
      return kind === "num"
        ? '<li data-i="'+i+'"'+on+'><b class="num">'+esc(prettyNum(r.number))+'</b><span>'+esc(r.name)+' \u00b7 '+esc(r.homestay)+'</span></li>'
        : '<li data-i="'+i+'"'+on+'><b>'+esc(r.homestay)+'</b><span>'+esc(r.name)+' \u00b7 '+esc(prettyNum(r.number))+'</span></li>';
    }).join("");
    Array.prototype.forEach.call(list.querySelectorAll("[data-i]"), function(li){
      li.addEventListener("mousedown", function(e){ e.preventDefault(); pick(matches[+li.dataset.i]); });
    });
  }
  function open(){ closeAllCombos(); box.classList.add("is-open"); input.setAttribute("aria-expanded","true"); draw(); }
  function close(){ box.classList.remove("is-open"); input.setAttribute("aria-expanded","false"); active = -1; }
  function pick(r){ if (!r) return; state.pitchId = r.id; state.msgTouched = false; state.draft = null; renderPitch(); }

  input.addEventListener("focus", open);
  input.addEventListener("input", function(){
    active = -1;
    box.classList.toggle("has-value", !!input.value);
    if (state.pitchId){
      state.pitchId = null; state.msgTouched = false; state.draft = null;
      var other = kind === "num" ? "stay" : "num";
      var oi = el("p-"+other);
      if (oi){ oi.value = ""; el("combo-"+other).classList.remove("has-value"); }
      var d = el("pitchDetails"); if (d) d.innerHTML = noPickHTML();
    }
    open();
  });
  input.addEventListener("blur", function(){ setTimeout(close, 130); });
  input.addEventListener("keydown", function(e){
    if (e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      if (!box.classList.contains("is-open")) open();
      if (!matches.length) return;
      active += (e.key === "ArrowDown" ? 1 : -1);
      if (active < 0) active = matches.length - 1;
      if (active >= matches.length) active = 0;
      draw();
      var on = list.querySelector("li.on"); if (on && on.scrollIntoView) on.scrollIntoView({block:"nearest"});
    } else if (e.key === "Enter"){
      if (matches.length){ e.preventDefault(); pick(matches[active > -1 ? active : 0]); }
    } else if (e.key === "Escape"){ close(); }
  });
  box.querySelector(".combo-clear").addEventListener("click", function(){
    state.pitchId = null; state.msgTouched = false; state.draft = null;
    renderPitch();
    var again = el("p-"+kind); if (again) again.focus();
  });
}

function closeAllCombos(){
  Array.prototype.forEach.call(document.querySelectorAll(".combo.is-open"), function(b){
    b.classList.remove("is-open");
    var i = b.querySelector("input"); if (i) i.setAttribute("aria-expanded","false");
  });
}

function detailsHTML(c){
  var dialDigits = waDigits(c.number);
  var stOpts = STATUSES.map(function(st){
    return '<option value="'+esc(st)+'"'+(c.status===st?" selected":"")+'>'+esc(st)+'</option>';
  }).join("");
  return '<div class="card step">'
    + '<div class="pitch-head"><b>'+esc(c.homestay)+'</b><span class="c-sub">'+esc(c.name)+' \u00b7 '+esc(prettyNum(c.number))+'</span>'
    +   '<select class="status-sel '+sclass(c.status)+'" id="p-status" aria-label="Status for '+esc(c.homestay)+'">'+stOpts+'</select>'
    + '</div>'
    + (dialDigits.length >= 10
        ? '<div class="call-row"><a class="btn ghost" href="tel:+'+dialDigits+'">'+ICON.phone+'Call '+esc(prettyNum(c.number))+'</a>'
          + '<span class="note">Opens your phone with the number ready \u2014 you still press call.</span></div>'
        : '<p class="c-sub call-row" style="margin:0">That number looks incomplete, so there\u2019s nothing to dial. Fix it under Clients \u2192 Edit.</p>')
    + '<h2 style="margin-top:18px">The link you\u2019ll send</h2>'
    + (c.claudeLink
        ? '<div class="link-row"><input type="text" id="p-link" readonly value="'+esc(c.claudeLink)+'" aria-label="Site link">'
          + '<button class="icon-btn" id="copyLink" title="Copy link" aria-label="Copy link">'+ICON.copy+'</button>'
          + '<a class="icon-btn" href="'+esc(c.claudeLink)+'" target="_blank" rel="noopener" title="Open in a new tab" aria-label="Open in a new tab">'+ICON.open+'</a></div>'
        : '<p class="c-sub" style="margin:0">No link saved for this homestay yet. Add it under Clients \u2192 Edit.</p>')
    + '</div>'
    + '<div class="card step">'
    + '<div class="field" style="margin-bottom:0">'
    + '<div class="msg-head"><label for="p-msg" style="margin:0">Your message</label>'
    +   '<div class="presets">'
    +     '<button class="chip" data-preset="connected" aria-pressed="'+(state.preset==="connected")+'">Connected</button>'
    +     '<button class="chip" data-preset="notConnected" aria-pressed="'+(state.preset==="notConnected")+'">Not connected</button>'
    +   '</div></div>'
    + '<textarea id="p-msg" placeholder="Write what you want to send"></textarea>'
    + '<div class="inserts">'
    +   '<button class="chip" data-ins="name">Insert name</button>'
    +   '<button class="chip" data-ins="homestay">Insert homestay</button>'
    +   (c.claudeLink ? '<button class="chip" data-ins="link">Insert link</button>' : '')
    +   '<button class="chip" data-ins="reset">Reset message</button>'
    + '</div></div>'
    + '<div class="send-row">'
    +   '<button class="btn primary" id="sendWa">'+ICON.wa+'Send on WhatsApp</button>'
    +   '<span class="note">Opens WhatsApp with the message ready \u2014 you still press send there.</span>'
    + '</div>'
    + '</div>';
}

function wireDetails(c){
  var w = el("pitchDetails"), msg = el("p-msg");
  msg.value = state.msgTouched && state.draft != null ? state.draft : template(c);
  msg.addEventListener("input", function(){ state.msgTouched = true; state.draft = msg.value; });

  var stSel = el("p-status");
  if (stSel){
    stSel.addEventListener("change", async function(){
      var v = stSel.value;
      stSel.className = "status-sel " + sclass(v) + " flash";
      try{
        await patchClient(c.id, {status:v});
        toast(v === "Ready to pitch" ? "Still ready to pitch" : "Moved to \u201c"+v+"\u201d");
      }catch(e){ toast("Couldn\u2019t update the status"); }
    });
  }

  Array.prototype.forEach.call(w.querySelectorAll("[data-preset]"), function(b){
    b.addEventListener("click", function(){
      state.preset = b.dataset.preset;
      state.msgTouched = false; state.draft = null;
      msg.value = template(c);
      Array.prototype.forEach.call(w.querySelectorAll("[data-preset]"), function(o){
        o.setAttribute("aria-pressed", String(o.dataset.preset === state.preset));
      });
    });
  });

  if (c.claudeLink){
    el("copyLink").addEventListener("click", function(){
      var v = c.claudeLink;
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(v).then(function(){ toast("Link copied"); }, function(){ fallbackCopy(v); });
      } else fallbackCopy(v);
    });
  }
  Array.prototype.forEach.call(w.querySelectorAll("[data-ins]"), function(b){
    b.addEventListener("click", function(){
      var k = b.dataset.ins;
      if (k === "reset"){ msg.value = template(c); state.msgTouched = false; state.draft = null; msg.focus(); return; }
      var t = k === "name" ? c.name : (k === "homestay" ? c.homestay : c.claudeLink);
      insertAtCursor(msg, t);
      state.msgTouched = true; state.draft = msg.value;
    });
  });
  el("sendWa").addEventListener("click", function(){
    var d = waDigits(c.number);
    if (d.length < 10){ toast("That number doesn\u2019t look complete"); return; }
    var text = msg.value.trim();
    if (!text){ toast("Write a message first"); msg.focus(); return; }
    window.open("https://wa.me/" + d + "?text=" + encodeURIComponent(text), "_blank", "noopener");
  });
}

/* The two message presets. Edit the wording here.
   The site link drops in on its own line so WhatsApp turns it into a tappable link. */
var TEMPLATES = {
  connected: function(c){
    return "Hi, I\u2019m Naval from Madikeri. We just connected over call about your homestay. "
      + "I build websites for businesses in coorg. I\u2019ve put together a sample website for "
      + (c.homestay || "your homestay") + " so you can see how it looks. ignore the images for now"
      + (c.claudeLink ? "\n\n" + c.claudeLink : "")
      + "\n\ncall me back if interested"
      + "\n\nDisclaimer:"
      + "\n\n1. We don\u2019t charge an advance"
      + "\n2. Images can be changed"
      + "\n3. Design can be customised according to your liking";
  },
  notConnected: function(c){
    return "Hi, I\u2019m Naval from Madikeri. I tried calling you but seems like you were busy. "
      + "I build websites for businesses in coorg. I\u2019ve put together a sample website for "
      + (c.homestay || "your homestay") + " so you can see how it looks. ignore the images for now"
      + (c.claudeLink ? "\n\n" + c.claudeLink : "")
      + "\n\ncall me back if interested"
      + "\n\nDisclaimer:"
      + "\n\n1. We don\u2019t charge an advance"
      + "\n2. Images are just a sample and will be replaced with yours"
      + "\n3. Design can be customised according to your liking";
  }
};

function template(c){
  var make = TEMPLATES[state.preset] || TEMPLATES.connected;
  return make(c);
}

function insertAtCursor(ta, text){
  var s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0,s) + text + ta.value.slice(e);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length;
}

function fallbackCopy(v){
  var t = document.createElement("textarea");
  t.value = v; t.style.position="fixed"; t.style.opacity="0";
  document.body.appendChild(t); t.select();
  try{ document.execCommand("copy"); toast("Link copied"); }
  catch(e){ toast("Couldn\u2019t copy \u2014 select it manually"); }
  document.body.removeChild(t);
}

/* ---------------- render ---------------- */

function renderAll(){
  renderChips();
  if (state.page === "list") renderList(); else state.fresh = true;
  if (state.page === "pitch") renderPitch();
}

var authGate = el("authGate");
var authError = el("authError");
el("googleSignIn").addEventListener("click", async function(){
  authError.textContent = "";
  try { await signInWithPopup(auth, googleProvider); }
  catch(e){ authError.textContent = e && e.message ? e.message : "Google sign-in failed. Please try again."; }
});
el("signOutBtn").addEventListener("click", async function(){
  try { await signOut(auth); }
  catch(e){ toast("Couldn\u2019t sign out. Please try again."); }
});

renderAll();
onAuthStateChanged(auth, function(user){
  authGate.hidden = !!user;
  el("signOutBtn").hidden = !user;
  if (user) refresh();
  else {
    state.clients = [];
    setNote("");
    renderAll();
  }
});

})();
