/* =========================================================
   Íconos como dibujo vectorial (SVG de Font Awesome 6 Free, solid),
   igual que en MUNI_NOTICIAS: no dependen de que cargue una fuente y
   se pueden incrustar en la imagen exportada.
   API: Iconos.cargar(nombres) → Promise · Iconos.hay(nombre) · Iconos.svg(nombre)
   ========================================================= */
window.Iconos = (function () {
  const BASE = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/svgs/solid/";
  const RESPALDO = "circle-info";
  const datos = {}, pedidos = {};
  // Los que usan las plantillas y la lista que se le da a la IA.
  const LISTA = ["circle-info", "phone", "location-dot", "clock", "calendar-days", "store", "truck-fast", "credit-card", "money-bill-wave",
    "gift", "tag", "percent", "star", "heart", "fire", "bolt", "check", "bag-shopping", "cart-shopping", "box-open", "medal", "camera",
    "shirt", "utensils", "bread-slice", "cake-candles", "mug-hot", "pizza-slice", "ice-cream", "puzzle-piece", "gamepad", "baby",
    "child", "paw", "leaf", "seedling", "music", "scissors", "motorcycle", "car", "bicycle", "book", "graduation-cap", "people-group",
    "handshake", "lightbulb", "bullhorn", "arrow-right", "envelope", "wand-magic-sparkles"];

  const normal = n => String(n || "").trim().toLowerCase().replace(/^fa-/, "");

  function cargarUno(n) {
    n = normal(n);
    if (!/^[a-z0-9-]{1,40}$/.test(n)) return Promise.resolve(null);
    if (datos[n] !== undefined) return Promise.resolve(datos[n]);
    if (pedidos[n]) return pedidos[n];
    pedidos[n] = fetch(BASE + n + ".svg").then(r => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("icono " + r.status);
      return r.text();
    }).then(t => {
      if (!t) return (datos[n] = null);
      const vb = (t.match(/viewBox="([^"]+)"/) || [])[1], d = (t.match(/<path[^>]*\sd="([^"]+)"/) || [])[1];
      if (!vb || !d) return (datos[n] = null);
      const v = vb.split(/[\s,]+/).map(Number);
      return (datos[n] = { w: v[2], h: v[3], d: d });
    }).catch(() => { delete pedidos[n]; return null; }); // error de red: se puede reintentar
    return pedidos[n];
  }
  const cargar = nombres => Promise.all([RESPALDO].concat(nombres || []).filter(Boolean).map(cargarUno));
  const hay = n => !!datos[normal(n)];

  function svg(nombre) {
    const ic = datos[normal(nombre)] || datos[RESPALDO];
    if (!ic) return "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ic.w + " " + ic.h + '" style="display:block;width:' + (ic.w / ic.h).toFixed(4) +
      'em;height:1em;fill:currentColor" aria-hidden="true"><path d="' + ic.d + '"/></svg>';
  }

  return { cargar, hay, svg, lista: LISTA, listo: cargar(LISTA) };
})();
