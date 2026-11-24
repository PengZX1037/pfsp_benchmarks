/* PFSP Benchmarks — shared code: page chrome, data access, evaluation, Gantt chart. */
(function () {
  "use strict";
  const SITE = window.SITE || { name: "PFSP Benchmarks", email: "" };

  // ------------------------------------------------------------------ helpers
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmtInt = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("en-US").replace(/,/g, " "));
  const fmtGap = (g) => (g === null || g === undefined ? "—" : g === 0 ? "0" : g.toFixed(2) + "%");
  const fmtDate = (d) => {
    if (!d) return "—";
    const t = new Date(d + "T00:00:00Z");
    return isNaN(t) ? d : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  };
  const params = () => new URLSearchParams(location.search);

  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1800);
  }
  async function copy(text, msg = "Copied to clipboard") {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(msg); } catch (_) { toast("Copy failed"); }
      ta.remove();
    }
  }

  // ------------------------------------------------------------------ theme
  function getTheme() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function applyTheme(t) {
    const theme = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }
  applyTheme(getTheme());
  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
    applyTheme(next);
    document.dispatchEvent(new CustomEvent("themechange"));
  }

  // ------------------------------------------------------------------ chrome
  const NAV = [
    ["index.html", "Home"],
    ["problem.html", "Problem"],
    ["benchmarks.html", "Benchmarks"],
    ["bounds.html", "Bounds"],
    ["checker.html", "Checker"],
    ["submit.html", "Submit"],
  ];
  const LOGO = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
    <rect x="1" y="3" width="10" height="5" rx="1.5" fill="var(--accent)"/>
    <rect x="11" y="3" width="7" height="5" rx="1.5" fill="var(--accent)" opacity=".55"/>
    <rect x="6" y="10.5" width="9" height="5" rx="1.5" fill="var(--accent)" opacity=".8"/>
    <rect x="15" y="10.5" width="6" height="5" rx="1.5" fill="var(--accent)" opacity=".4"/>
    <rect x="12" y="18" width="7" height="5" rx="1.5" fill="var(--closed)"/>
    <rect x="19" y="18" width="6" height="5" rx="1.5" fill="var(--closed)" opacity=".55"/></svg>`;
  const SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
  const MENU = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;

  function renderChrome() {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const active = page === "instance.html" ? "bounds.html" : page;
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `<div class="container">
      <a class="brand" href="index.html">${LOGO}<span>${esc(SITE.name)}</span></a>
      <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded="false">${MENU}</button>
      <nav class="nav" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ""}>${l}</a>`).join("")}
        <button class="icon-btn theme-btn" aria-label="Toggle dark mode" title="Toggle dark mode">${SUN}</button></nav>
    </div>`;
    document.body.prepend(header);
    const skip = document.createElement("a");
    skip.className = "skip"; skip.href = "#main"; skip.textContent = "Skip to content";
    document.body.prepend(skip);
    $(".theme-btn", header).addEventListener("click", toggleTheme);
    const mb = $(".menu-btn", header), nav = $(".nav", header);
    mb.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `<div class="container cols">
      <div><strong style="color:var(--text)">${esc(SITE.name)}</strong><br>
        <span>${esc(SITE.tagline || "")}</span><br>
        <span>Maintained by ${esc(SITE.maintainers || "")} · <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></span></div>
      <div><ul>
        <li><a href="downloads/pfsp-bounds.csv">Bounds (CSV)</a></li>
        <li><a href="downloads/pfsp-bounds.json">Bounds (JSON)</a></li>
        <li><a href="benchmarks.html">All downloads</a></li>
        <li><a href="submit.html">Submit a result</a></li></ul>
        <p style="margin:.6em 0 0">Data: CC BY 4.0 (with attribution to the original sources) · Code: MIT</p></div>
    </div>`;
    document.body.appendChild(footer);
  }

  // ------------------------------------------------------------------ data
  const cache = {};
  function getJSON(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json();
      });
    }
    return cache[url];
  }
  const data = {
    all: () => getJSON("data/site/instances.json"),
    solutions: () => getJSON("data/site/solutions.json"),
    refs: () => getJSON("data/site/references.json"),
    history: () => getJSON("data/site/history.json"),
    news: () => getJSON("data/site/news.json"),
  };
  function instanceUrl(rec) { return `data/instances/${rec.set}/${rec.id}.txt`; }
  async function loadMatrix(rec) {
    const r = await fetch(instanceUrl(rec));
    if (!r.ok) throw new Error("instance file not available");
    return parseInstance(await r.text());
  }
  /** Parse unified format: "n m" then m rows of n integers (machine-major). */
  function parseInstance(text) {
    const nums = text.trim().split(/\s+/).map(Number);
    if (nums.length < 2 || nums.some((x) => !Number.isInteger(x) || x < 0)) throw new Error("the instance data must contain non-negative integers only");
    const [n, m] = nums;
    const body = nums.slice(2);
    if (body.length !== n * m) throw new Error(`expected ${n}×${m} = ${n * m} processing times after "n m", found ${body.length}`);
    const p = [];
    for (let i = 0; i < m; i++) p.push(body.slice(i * n, (i + 1) * n));
    return { n, m, p };
  }
  function findInstance(all, id) {
    if (!id) return null;
    // const key = String(id).trim().toLowerCase().replace(/^vrf/, "vfr");
    const key = String(id).trim().toLowerCase().replace(/^vfr/, "vrf");
    let r = all.instances.find((x) => x.id.toLowerCase() === key);
    if (!r && /^ta\d+$/.test(key)) r = all.instances.find((x) => x.id === "ta" + key.slice(2).padStart(3, "0"));
    return r || null;
  }

  // ------------------------------------------------------------------ evaluation
  /** Parse a permutation typed by a user. Accepts spaces, commas, brackets; 1-based (default) or 0-based. */
  function parsePermutation(text, n) {
    const toks = String(text).replace(/[\[\]{}()]/g, " ").split(/[\s,;]+/).filter(Boolean);
    if (!toks.length) return { error: "Please enter a permutation." };
    const v = toks.map(Number);
    if (v.some((x) => !Number.isInteger(x))) return { error: "The permutation must contain integers only." };
    if (v.length !== n) return { error: `The permutation has ${v.length} entries but the instance has n = ${n} jobs.` };
    let base = 1;
    if (Math.min(...v) === 0) base = 0;
    const seen = new Uint8Array(n);
    for (const x of v) {
      const j = x - base;
      if (j < 0 || j >= n) return { error: `Job index ${x} is out of range (expected ${base}…${n - 1 + base}).` };
      if (seen[j]) return { error: `Job ${x} appears more than once.` };
      seen[j] = 1;
    }
    return { perm: v.map((x) => x - base), base };
  }
  function makespan(p, perm) {
    const m = p.length, c = new Float64Array(m);
    for (const j of perm) {
      let prev = 0;
      for (let i = 0; i < m; i++) { prev = (c[i] > prev ? c[i] : prev) + p[i][j]; c[i] = prev; }
    }
    return c[m - 1];
  }
  /** Full schedule: start[i][k] for the k-th job of the sequence on machine i. */
  function schedule(p, perm) {
    const m = p.length, n = perm.length;
    const start = [], end = [];
    for (let i = 0; i < m; i++) { start.push(new Float64Array(n)); end.push(new Float64Array(n)); }
    for (let k = 0; k < n; k++) {
      const j = perm[k];
      for (let i = 0; i < m; i++) {
        const s = Math.max(k ? end[i][k - 1] : 0, i ? end[i - 1][k] : 0);
        start[i][k] = s; end[i][k] = s + p[i][j];
      }
    }
    return { start, end, cmax: n ? end[m - 1][n - 1] : 0 };
  }

  // ------------------------------------------------------------------ gantt
  function jobColor(j, n, dark) {
    const h = (j * 137.508) % 360;
    return `hsl(${h.toFixed(1)} ${dark ? 45 : 55}% ${dark ? 52 : 64}%)`;
  }
  function niceStep(max, target) {
    const raw = max / target, pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / pow;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
  }
  function drawGantt(wrap, p, perm, opts = {}) {
    if (wrap._ganttCleanup) wrap._ganttCleanup();
    wrap.innerHTML = "";
    wrap.classList.add("gantt-wrap");
    const canvas = document.createElement("canvas");
    const tip = document.createElement("div");
    tip.className = "gantt-tip";
    wrap.append(canvas, tip);
    const sch = schedule(p, perm);
    const m = p.length, n = perm.length;
    const labelW = 42, axisH = 26, rowH = Math.max(12, Math.min(26, Math.floor(420 / m)));
    const height = m * rowH + axisH + 6;
    let geom = null;

    function render() {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const css = getComputedStyle(document.documentElement);
      const W = Math.max(320, wrap.clientWidth - 24);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = height * dpr;
      canvas.style.height = height + "px";
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, height);
      const plotW = W - labelW - 8;
      const sx = plotW / sch.cmax;
      ctx.font = "11px " + css.getPropertyValue("--sans");
      ctx.fillStyle = css.getPropertyValue("--muted");
      ctx.textBaseline = "middle";
      for (let i = 0; i < m; i++) {
        if (m <= 30 || i % Math.ceil(m / 30) === 0) ctx.fillText("M" + (i + 1), 4, i * rowH + rowH / 2);
      }
      // grid + axis
      const step = niceStep(sch.cmax, Math.max(3, Math.floor(plotW / 90)));
      ctx.strokeStyle = css.getPropertyValue("--border");
      ctx.lineWidth = 1;
      ctx.textAlign = "center";
      for (let t = 0; t <= sch.cmax + 1e-9; t += step) {
        const x = labelW + t * sx;
        ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, m * rowH); ctx.stroke();
        ctx.fillText(Math.round(t).toLocaleString("en-US"), x, m * rowH + 14);
      }
      ctx.textAlign = "left";
      const gap = n > 150 ? 0 : 0.5;
      for (let i = 0; i < m; i++) {
        const y = i * rowH + 2, h = rowH - 4;
        for (let k = 0; k < n; k++) {
          const x0 = labelW + sch.start[i][k] * sx, w = (sch.end[i][k] - sch.start[i][k]) * sx;
          ctx.fillStyle = jobColor(perm[k], n, dark);
          ctx.fillRect(x0 + gap, y, Math.max(w - 2 * gap, .6), h);
          if (n <= 30 && w > 16 && h >= 12) {
            ctx.fillStyle = dark ? "rgba(0,0,0,.75)" : "rgba(0,0,0,.65)";
            ctx.fillText(String(perm[k] + (opts.base ?? 1)), x0 + 3, y + h / 2);
          }
        }
      }
      // makespan marker
      ctx.strokeStyle = css.getPropertyValue("--danger");
      ctx.setLineDash([4, 3]);
      const xe = labelW + sch.cmax * sx;
      ctx.beginPath(); ctx.moveTo(xe - .5, 0); ctx.lineTo(xe - .5, m * rowH); ctx.stroke();
      ctx.setLineDash([]);
      geom = { sx, W };
    }
    function onMove(ev) {
      if (!geom) return;
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left, y = ev.clientY - r.top;
      const i = Math.floor(y / rowH);
      const t = (x - labelW) / geom.sx;
      if (i < 0 || i >= m || t < 0 || t > sch.cmax) { tip.style.opacity = 0; return; }
      let lo = 0, hi = n - 1, k = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sch.start[i][mid] <= t) { k = mid; lo = mid + 1; } else hi = mid - 1;
      }
      if (k < 0 || t > sch.end[i][k]) { tip.style.opacity = 0; return; }
      tip.textContent = `Job ${perm[k] + (opts.base ?? 1)} (position ${k + 1}) · M${i + 1} · ${sch.start[i][k]}–${sch.end[i][k]}`;
      tip.style.left = (x + 12) + "px";
      tip.style.top = (i * rowH + 12) + "px";
      tip.style.opacity = 1;
    }
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => { tip.style.opacity = 0; });
    render();
    let rt;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(render, 60); });
    ro.observe(wrap);
    document.addEventListener("themechange", render);
    wrap._ganttCleanup = () => { ro.disconnect(); document.removeEventListener("themechange", render); clearTimeout(rt); };
    return sch;
  }

  // ------------------------------------------------------------------ references
  function refUrl(r) { return r.doi ? `https://doi.org/${r.doi}` : r.url || null; }
  function refShort(key, refs, compact) {
    if (!key) return '<span class="dim">—</span>';
    const r = refs[key];
    if (!r) return esc(key);
    const u = refUrl(r), label = compact ? (r.tag || r.short) : r.short;
    return u ? `<a class="ref" href="${esc(u)}" title="${esc(r.short + " — " + r.title)}">${esc(label)}</a>` : esc(label);
  }
  function refFull(r) {
    const u = refUrl(r);
    return `${esc(r.authors)} (${esc(r.year)}). ${esc(r.title)}. <em>${esc(r.venue)}</em>.` +
      (r.doi ? ` <a href="${esc(u)}">doi:${esc(r.doi)}</a>` : u ? ` <a href="${esc(u)}">${esc(u)}</a>` : "");
  }
  function setName(all, setId) {
    const s = all.sets.find((x) => x.id === setId);
    return s ? s.name : setId;
  }
  function statusBadge(status) {
    return status === "closed" ? '<span class="badge closed" title="LB = UB: optimality proven">Closed</span>'
      : '<span class="badge open" title="LB < UB, or no lower bound recorded">Open</span>';
  }
  function siteCitation() {
    const c = SITE.citation || {};
    return `@misc{${c.bibtex_key || "PFSPBenchmarks"},\n  author = {${c.authors || ""}},\n  title = {${c.title || SITE.name}},\n  year = {${c.year || new Date().getFullYear()}},\n  howpublished = {\\url{${SITE.url || location.href}}}\n}`;
  }
  function mailto(subject, body) {
    return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function showError(el, e) {
    el.innerHTML = `<div class="notice err"><p><strong>Could not load the data.</strong> ${esc(e.message || e)}</p>
      <p class="small">If you opened the HTML file directly from disk, serve the folder over HTTP instead (e.g. <code>python -m http.server</code>).</p></div>`;
  }

  window.PFSP = {
    SITE, esc, $, $$, fmtInt, fmtGap, fmtDate, params, toast, copy, data, loadMatrix, parseInstance,
    findInstance, parsePermutation, makespan, schedule, drawGantt, refShort, refFull, refUrl, setName,
    statusBadge, siteCitation, mailto, instanceUrl, showError,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderChrome);
  else renderChrome();
})();
