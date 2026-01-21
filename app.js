/* NewfoundLUG Bulk 2026 – Parts Browser
   - Loads data.json (generated from your Excel)
   - Client-side search + filters + pagination
*/
const PAGE_SIZE = 60;

const el = (id) => document.getElementById(id);
const q = el("q");
const mainGroup = el("mainGroup");
const subGroup = el("subGroup");
const results = el("results");
const count = el("count");
const prev = el("prev");
const next = el("next");
const pageInfo = el("pageInfo");

let DATA = [];
let filtered = [];
let page = 1;

function uniqSorted(arr){
  return Array.from(new Set(arr)).filter(Boolean).sort((a,b)=>a.localeCompare(b));
}

function normalize(s){
  return (s ?? "").toString().toLowerCase().trim();
}

function buildSelect(selectEl, items, placeholder){
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  items.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function moneyCAD(v){
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return new Intl.NumberFormat("en-CA", { style:"currency", currency:"CAD" }).format(v);
}

function applyFilters(resetPage=true){
  const query = normalize(q.value);
  const mg = mainGroup.value;
  const sg = subGroup.value;

  filtered = DATA.filter(r=>{
    if (mg && r.main_group !== mg) return false;
    if (sg && r.sub_group !== sg) return false;
    if (!query) return true;

    const hay = [
      r.element_id,
      r.description,
      r.sub_group,
      r.main_group,
      r.price_cad,
      r.price_eur
    ].map(normalize).join(" ");

    return hay.includes(query);
  });

  // rebuild sub-group dropdown based on selected main group (nice UX)
  const subCandidates = uniqSorted(
    DATA.filter(r => !mg || r.main_group === mg).map(r=>r.sub_group)
  );
  const currentSG = subGroup.value;
  buildSelect(subGroup, subCandidates, "All sub groups");
  if (subCandidates.includes(currentSG)) subGroup.value = currentSG;
  else subGroup.value = "";

  if (resetPage) page = 1;
  render();
}

function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function cardHTML(r){
  const img = r.image_url
    ? `<img loading="lazy" src="${r.image_url}" alt="${escapeHtml(r.description)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'mutedImg\'>No image</div>';" />`
    : `<div class="mutedImg">No image</div>`;

  const price = (r.price_cad !== null && r.price_cad !== undefined)
    ? `<div class="priceRow"><span class="price">${moneyCAD(r.price_cad)} CAD</span></div>`
    : "";

  return `
    <article class="card">
      <div class="imgWrap">${img}</div>
      <div class="cardBody">
        <div class="badges">
          <span class="badge accent">${escapeHtml(r.element_id)}</span>
          <span class="badge">${escapeHtml(r.main_group)}</span>
          <span class="badge">${escapeHtml(r.sub_group)}</span>
        </div>
        ${price}
        <div class="desc">${escapeHtml(r.description)}</div>
        <div class="small">
          <span>Image source: LEGO CDN</span>
          <span>•</span>
          <a href="${r.pab_search_url}" target="_blank" rel="noopener noreferrer">Pick a Brick</a>
        </div>
      </div>
    </article>
  `;
}

function render(){
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, totalPages);

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(total, start + PAGE_SIZE);
  const slice = filtered.slice(start, end);

  results.innerHTML = slice.map(cardHTML).join("");
  count.textContent = `${total.toLocaleString()} results`;
  pageInfo.textContent = `Page ${page} / ${totalPages}`;

  prev.disabled = page <= 1;
  next.disabled = page >= totalPages;
}

async function init(){
  const res = await fetch("data.json");
  DATA = await res.json();

  buildSelect(mainGroup, uniqSorted(DATA.map(r=>r.main_group)), "All main groups");
  buildSelect(subGroup, uniqSorted(DATA.map(r=>r.sub_group)), "All sub groups");

  filtered = DATA.slice();
  render();

  q.addEventListener("input", ()=>applyFilters(true));
  mainGroup.addEventListener("change", ()=>applyFilters(true));
  subGroup.addEventListener("change", ()=>applyFilters(true));

  prev.addEventListener("click", ()=>{ page = Math.max(1, page-1); render(); window.scrollTo({top:0, behavior:"smooth"}); });
  next.addEventListener("click", ()=>{ page = page+1; render(); window.scrollTo({top:0, behavior:"smooth"}); });
}

init().catch(err=>{
  console.error(err);
  results.innerHTML = `<div class="card"><div class="cardBody"><div class="desc">Failed to load data.json. If you're opening this file directly, run a tiny local server.</div>
  <div class="small"><code>python -m http.server</code> then open <code>http://localhost:8000</code></div></div></div>`;
});
