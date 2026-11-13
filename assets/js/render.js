/* =========================================================
   Render de las placas (adaptado de disenoHtml.js de MUNI_NOTICIAS).
   El código de una placa es HTML+CSS (de una plantilla o escrito por la IA):
   1. se sanea (sin scripts, eventos ni recursos externos),
   2. se monta en un shadow DOM con los colores, la letra, las fotos y la
      firma del negocio; si el texto no entra, se achica solo (--k),
   3. se exporta como imagen con SVG <foreignObject>, con las fuentes y las
      fotos incrustadas (sin librerías).
   x (contexto): { W, H, vars, fotos: [dataURL], negocio, logos: [dataURL], fondo: dataURL|null }
   ========================================================= */
window.Render = (function () {
  const C = window.VID_CONFIG;
  const $$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));
  const VARS_SISTEMA = /--(foto\d*|fondo-img|primario|acento|oscuro|claro|fondo|tinta|sobre-[a-z]+|bg|fg|panel|realce|sello|f-tit|w-tit|tt-tit|ls-tit|lh-tit|kf|f-num|w-num)\s*:[^;}]*;?/gi;
  const URL_OK = /^(\{\{(FOTO\d*|LOGO)\}\}|data:image\/)/;
  const VACIO = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

  const CSS_BASE = ".pieza{box-sizing:border-box;-webkit-font-smoothing:antialiased;font-family:'Poppins',sans-serif;color:var(--tinta)}" +
    ".pieza *{box-sizing:border-box}.pieza p,.pieza h1,.pieza h2,.pieza h3,.pieza ul{margin:0}" +
    ".pieza .fa-icono{font-style:normal;line-height:1;display:inline-flex;align-items:center;justify-content:center;vertical-align:-0.125em}" +
    ".pieza .fa-icono svg{flex:none}" +
    ".pieza .firma{display:flex;align-items:center;gap:16px;line-height:1.1}" +
    ".pieza [contenteditable]{outline:none;cursor:text}.pieza [contenteditable]:hover{box-shadow:0 0 0 3px rgba(80,120,255,.45)}" +
    ".pieza [contenteditable]:focus{box-shadow:0 0 0 4px rgba(80,120,255,.9)}";

  /* ---------------- Saneado ---------------- */
  function limpiarCss(css) {
    return String(css || "")
      .replace(VARS_SISTEMA, "") // la foto, los colores y la letra de la marca los pone el sistema
      .replace(/@import\s+(url\(\s*(["']?)[^)]*?\2\s*\)|"[^"]*"|'[^']*')[^;]*;?/gi, "")
      .replace(/@import[^;\n]*;?/gi, "")
      .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (m, q, u) => /^(\{\{|data:image\/|#)/.test(u) ? m : "none")
      .replace(/(backdrop-)?filter\s*:\s*[^;}"]*blur[^;}"]*/gi, "")
      .replace(/expression\s*\(/gi, "");
  }
  function sanear(html) {
    const doc = new DOMParser().parseFromString("<!doctype html><html><body>" + html + "</body></html>", "text/html");
    $$(doc, "script,iframe,object,embed,link,meta,base,form,input,button,textarea,select,video,audio,canvas").forEach(n => n.remove());
    $$(doc, "*").forEach(n => {
      Array.prototype.slice.call(n.attributes).forEach(a => {
        const nom = a.name.toLowerCase();
        if (/^on/.test(nom) || nom === "srcset" || nom === "contenteditable" || ((nom === "href" || nom === "xlink:href") && !/^#/.test(a.value))) n.removeAttribute(a.name);
        else if (nom === "src" && !URL_OK.test(a.value.trim())) n.removeAttribute(a.name);
        else if (nom === "style") n.setAttribute("style", limpiarCss(a.value));
      });
    });
    $$(doc, "style").forEach(s => { s.textContent = limpiarCss(s.textContent); });
    return doc;
  }

  // Nombres de ícono en las clases ("fa-solid fa-lg fa-paw" → ["paw"])
  const NO_ICONO = /^(solid|regular|brands|light|thin|duotone|sharp|fw|xs|sm|lg|xl|2xl|[0-9]+x|spin|pulse|beat|fade|bounce|shake|flip|border|stack|stack-1x|stack-2x|inverse|ul|li|icono)$/;
  const nombresIcono = clases => (String(clases || "").match(/\bfa-[a-z0-9-]+\b/g) || []).map(c => c.slice(3)).filter(n => !NO_ICONO.test(n));
  function cargarIconos(codigo) {
    let nombres = [];
    String(codigo || "").replace(/class\s*=\s*["']([^"']*)["']/gi, (m, c) => { nombres = nombres.concat(nombresIcono(c)); return m; });
    return Iconos.cargar(nombres);
  }

  // Firma: los logos elegidos para la publicación (del negocio e invitados). Con un solo logo, o ninguno, va también el nombre.
  function firmaHtml(x) {
    const logos = x.logos || [];
    return logos.map(d => '<img data-logo="1" src="' + d + '" alt="">').join("") +
      (logos.length < 2 ? "<span>" + Plantillas.esc(x.negocio.nombre || "Tu negocio") + "</span>" : "");
  }

  /* ---------------- Preparar: código → { html, css } listo para mostrar ---------------- */
  function preparar(codigo, x) {
    const doc = sanear(codigo);
    $$(doc, "[class*='fa-']").forEach(i => {
      if (i.classList.contains("fa-icono")) return;
      const nombres = nombresIcono(i.getAttribute("class"));
      if (!nombres.length) return;
      i.setAttribute("class", i.getAttribute("class").replace(/\bfa-[a-z0-9-]+\b/g, "").replace(/\s+/g, " ").trim() + " fa-icono");
      i.innerHTML = Iconos.svg(nombres.filter(Iconos.hay)[0] || "circle-info");
    });
    $$(doc, "img").forEach(im => {
      const src = (im.getAttribute("src") || "").trim(), f = src.match(/^\{\{FOTO(\d*)\}\}$/);
      if (f) { const n = +(f[1] || 1); im.setAttribute("data-foto", n); im.setAttribute("src", x.fotos[n - 1] || VACIO); }
      else if (src === "{{LOGO}}") { if ((x.logos || [])[0]) { im.setAttribute("data-logo", "1"); im.setAttribute("src", x.logos[0]); } else im.remove(); }
      else if (!src) im.remove();
    });
    $$(doc, ".firma").forEach(f => {
      if (f.textContent.indexOf("{{FIRMA}}") >= 0) { f.setAttribute("data-firma", "1"); f.innerHTML = firmaHtml(x); }
    });
    const fotos = x.fotos.map((d, i) => "--foto" + (i + 1) + ":url(\"" + d + "\")").join(";");
    const css = CSS_BASE + ".pieza{" + x.vars + ";" + (fotos ? fotos + ";--foto:var(--foto1);" : "--foto:none;") + "--fondo-img:" + (x.fondo ? "url(\"" + x.fondo + "\")" : "none") + ";" +
      "width:" + x.W + "px;height:" + x.H + "px;position:relative;overflow:hidden}";
    return { html: doc.body.innerHTML, css: css };
  }

  /* ---------------- Ajuste: si el texto no entra, baja --k ---------------- */
  function desborda(p) {
    if ($$(p, "[data-min]").some(m => m.clientHeight < +m.getAttribute("data-min"))) return true;
    const R = p.getBoundingClientRect(), t = 3 * R.width / p.clientWidth;
    // los bloques en flujo (no los adornos absolutos) y los textos tienen que quedar dentro de la placa,
    // y el contenido de los bloques marcados con data-cabe no puede rebalsar
    const bloques = Array.prototype.filter.call(p.children, e => getComputedStyle(e).position !== "absolute");
    return bloques.concat($$(p, "[data-c]")).some(e => {
      const r = e.getBoundingClientRect();
      return r.right > R.right + t || r.bottom > R.bottom + t || r.left < R.left - t || r.top < R.top - t || (e.hasAttribute("data-c") ? e.scrollWidth > e.clientWidth + 3 : e.hasAttribute("data-cabe") && e.scrollHeight > e.clientHeight + 4);
    });
  }
  function ajustar(p) {
    if (!p) return 1;
    let k = 1;
    p.style.setProperty("--k", "1");
    while (k > 0.5 && desborda(p)) { k -= 0.05; p.style.setProperty("--k", k.toFixed(2)); }
    return k;
  }

  /* ---------------- Montar en pantalla ---------------- */
  // host: elemento vacío; se escala para entrar en su ancho. op: { editable, alEditar(el), alSalir(el) }
  function montar(host, codigo, x, op) {
    op = op || {};
    return cargarIconos(codigo).then(() => {
      const prep = preparar(codigo, x);
      const raiz = host.shadowRoot || host.attachShadow({ mode: "open" });
      raiz.innerHTML = "<style data-sistema>:host{display:block}" + prep.css + "</style>" + prep.html;
      const p = raiz.querySelector(".pieza");
      if (p && op.editable) {
        const conCampos = $$(p, "[data-c]");
        const editables = conCampos.length ? conCampos : $$(p, "*").filter(el => !el.closest(".firma,.fa-icono,svg,style") &&
          Array.prototype.some.call(el.childNodes, n => n.nodeType === 3 && n.textContent.trim()));
        editables.forEach(el => { el.setAttribute("contenteditable", "plaintext-only"); el.setAttribute("spellcheck", "false"); });
        p.addEventListener("input", e => { ajustar(p); op.alEditar && op.alEditar(e.target.closest("[contenteditable]")); });
        p.addEventListener("focusout", e => { op.alSalir && op.alSalir(e.target); });
        p.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.blur(); } });
      }
      ajustar(p);
      const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      return fuentes.then(() => { ajustar(p); return p; });
    });
  }

  // Limpia una copia de lo montado (sin marcas de edición)
  function copia(host) {
    const div = document.createElement("div");
    div.innerHTML = host.shadowRoot.innerHTML;
    $$(div, "[contenteditable]").forEach(el => { el.removeAttribute("contenteditable"); el.removeAttribute("spellcheck"); });
    return div;
  }
  // De lo montado (y quizás editado a mano) vuelve al código con marcadores, para guardarlo
  function desmontar(host) {
    const div = copia(host);
    $$(div, "style[data-sistema]").forEach(s => s.remove());
    $$(div, "img[data-foto]").forEach(im => { im.setAttribute("src", "{{FOTO" + im.getAttribute("data-foto") + "}}"); im.removeAttribute("data-foto"); });
    $$(div, "[data-firma]").forEach(f => { f.removeAttribute("data-firma"); f.textContent = "{{FIRMA}}"; });
    return div.innerHTML.trim();
  }

  /* ---------------- Exportar a imagen ---------------- */
  function aDataUrl(url) {
    return fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.blob(); }).then(b =>
      new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));
  }
  let fuentes = null;
  function cssFuentes() {
    if (fuentes) return fuentes;
    fuentes = fetch(C.fuentesCss).then(r => r.text()).then(css => {
      const bloques = css.match(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*\}/g) || []; // el subconjunto latino alcanza para el español
      return Promise.all(bloques.map(b => {
        const u = (b.match(/url\(([^)]+)\)/) || [])[1];
        return u ? aDataUrl(u.replace(/['"]/g, "")).then(d => b.replace(u, d)) : b;
      }));
    }).then(b => b.join("\n")).catch(e => { fuentes = null; throw e; });
    return fuentes;
  }
  // html: contenido ya preparado (con su <style>). Devuelve Promise<canvas>.
  function dibujar(html, W, H, fondo) {
    return cssFuentes().then(css => {
      const doc = document.implementation.createHTMLDocument("");
      const div = doc.createElement("div");
      div.innerHTML = "<style>" + css + "</style>" + html;
      const xhtml = new XMLSerializer().serializeToString(div);
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'><foreignObject x='0' y='0' width='100%' height='100%'>" + xhtml + "</foreignObject></svg>";
      return new Promise((ok, mal) => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas"); c.width = W; c.height = H;
          const ctx = c.getContext("2d");
          ctx.fillStyle = fondo || "#fff"; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(im, 0, 0);
          ok(c);
        };
        im.onerror = () => mal(new Error("No se pudo dibujar el diseño."));
        im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    });
  }
  // Lo que está montado en host → canvas
  function exportar(host, x) {
    return dibujar(copia(host).innerHTML.replace("<style data-sistema>:host{display:block}", "<style>"), x.W, x.H, "#ffffff");
  }

  return { montar, desmontar, exportar, dibujar, preparar, cargarIconos, ajustar, $$ };
})();
