/* =========================================================
   Plantillas de flyer en HTML/CSS.
   Cada plantilla recibe los textos de la pieza (los escribe la IA y el
   cliente los puede corregir) y devuelve el código de la placa:
   <style>…</style><div class="pieza">…</div>, de 1080 px de ancho.
   - Colores y letra salen de variables CSS del negocio (Negocios.variables).
   - Las fotos son var(--foto1), var(--foto2)… y la foto de fondo de avisos y
     saludos es var(--fondo-img) (las pone Render).
   - data-c="campo" marca los textos editables sobre la placa.
   - --k es un factor que Render baja si el texto no entra.
   ========================================================= */
window.Plantillas = (function () {
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // **negrita** → <b>
  const rico = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  // Título con las palabras destacadas dentro de <mark>
  function titulo(p) {
    const t = String(p.titulo || ""), d = String(p.destacado || "").trim();
    const i = d ? t.toLowerCase().indexOf(d.toLowerCase()) : -1;
    if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + d.length)) + "</mark>" + esc(t.slice(i + d.length));
  }

  const BASE = `
.pieza{--k:1;position:relative;overflow:hidden;display:flex;flex-direction:column;background:var(--bg);color:var(--fg);font-family:'Poppins',sans-serif;line-height:1.25}
.pieza .foto{background-size:cover;background-position:center 35%;background-color:var(--panel)}
.pieza .etq{align-self:flex-start;display:inline-block;background:var(--realce);color:var(--sobre-realce);font-weight:700;font-size:calc(24px*var(--k));line-height:1;letter-spacing:.16em;text-transform:uppercase;padding:14px 26px;border-radius:999px}
.pieza .tit{font-family:var(--f-tit);font-weight:var(--w-tit);text-transform:var(--tt-tit);letter-spacing:var(--ls-tit);line-height:var(--lh-tit);font-size:calc(var(--s,92px)*var(--kf)*var(--k));text-wrap:balance}
.pieza .tit mark{background:none;color:var(--realce)}
.pieza .sub{font-size:calc(32px*var(--k));font-weight:500;line-height:1.32;opacity:.88}
.pieza .sub b{font-weight:700}
.pieza .cta{align-self:flex-start;display:inline-flex;align-items:center;gap:14px;background:var(--fg);color:var(--bg);font-weight:700;font-size:calc(27px*var(--k));line-height:1.15;padding:18px 32px;border-radius:999px}
.pieza .sello{display:flex;flex-direction:column;align-items:center;background:var(--sello);color:var(--sobre-sello);padding:18px 34px 20px;border-radius:30px;transform:rotate(-5deg);box-shadow:0 10px 0 rgba(0,0,0,.16);line-height:1;text-align:center}
.pieza .sello .dto{font-weight:800;font-size:calc(25px*var(--k));letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
.pieza .sello .antes{font-size:calc(27px*var(--k));font-weight:600;text-decoration:line-through;opacity:.75;margin-bottom:8px}
.pieza .sello .ahora{font-family:var(--f-num);font-weight:var(--w-num);font-size:calc(74px*var(--k));white-space:nowrap}
.pieza .pie{display:flex;align-items:center;justify-content:space-between;gap:28px}
.pieza .firma{display:flex;align-items:center;gap:16px;font-family:var(--f-tit);font-weight:var(--w-tit);text-transform:var(--tt-tit);font-size:calc(31px*var(--kf));line-height:1.05}
.pieza .firma img{height:78px;width:auto;max-width:210px;object-fit:contain;border-radius:14px;flex:none}
.pieza.e-color .firma img,.pieza.e-oscuro .firma img{background:#fff;padding:8px}
.pieza>.fondo{position:absolute;inset:0;background:var(--fondo-img) center/cover}
.pieza>.fondo::after{content:"";position:absolute;inset:0;background:var(--bg);opacity:.7}
.pieza.e-color>.fondo,.pieza.e-oscuro>.fondo{background-color:var(--bg);background-blend-mode:multiply}
.pieza.e-color>.fondo::after,.pieza.e-oscuro>.fondo::after{opacity:.3}
.pieza.con-fondo>.deco,.pieza.con-fondo>.aro{opacity:.4}
.pieza .contacto{display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-size:24px;font-weight:600;line-height:1.1;text-align:right}
.pieza .contacto span{display:inline-flex;align-items:center;gap:10px}`;

  /* ---------------- Partes comunes ---------------- */
  const etq = p => p.etiqueta ? `<span class="etq" data-c="etiqueta">${esc(p.etiqueta)}</span>` : "";
  const tit = p => `<h1 class="tit" data-c="titulo">${titulo(p)}</h1>`;
  const sub = p => p.subtitulo ? `<p class="sub" data-c="subtitulo">${rico(p.subtitulo)}</p>` : "";
  const cta = p => p.cta ? `<span class="cta" data-c="cta">${esc(p.cta)}</span>` : "";
  function sello(p, conDto) {
    if (!p.precio && !(conDto && p.descuento)) return "";
    return `<div class="sello">` +
      (conDto && p.descuento ? `<span class="dto" data-c="descuento">${esc(p.descuento)}</span>` : "") +
      (p.precio_antes && p.precio ? `<span class="antes" data-c="precio_antes">${esc(p.precio_antes)}</span>` : "") +
      (p.precio ? `<span class="ahora" data-c="precio">${esc(p.precio)}</span>` : "") + `</div>`;
  }
  function pie(neg) {
    const lineas = [];
    if (neg.whatsapp) lineas.push(`<span><i class="fa-solid fa-phone"></i>${esc(neg.whatsapp)}</span>`);
    if (neg.instagram) lineas.push(`<span>@${esc(neg.instagram.replace(/^@/, ""))}</span>`);
    else if (neg.direccion) lineas.push(`<span><i class="fa-solid fa-location-dot"></i>${esc(neg.direccion)}</span>`);
    return `<div class="pie"><div class="firma">{{FIRMA}}</div><div class="contacto">${lineas.join("")}</div></div>`;
  }
  const fondo = x => x.fondo ? '<div class="fondo"></div>' : "";
  const foto = (n, extra) => `<div class="foto ${extra || ""}" style="background-image:var(--foto${n})"></div>`;

  /* ---------------- Plantillas ---------------- */
  const LISTA = [
    {
      id: "destacado", nombre: "Destacado", icono: "fa-star", esquema: "claro", fotos: 1,
      desc: "Una foto protagonista con el título y el precio abajo.",
      css: `
.t-destacado .foto{flex:1;min-height:0}
.t-destacado .panel{position:relative;background:var(--bg);border-radius:60px 60px 0 0;margin-top:-60px;padding:70px 72px 56px;display:flex;flex-direction:column;gap:22px}
.t-destacado.f-916 .panel{padding-bottom:150px}
.t-destacado .etq{position:absolute;top:-25px;left:72px}
.t-destacado .sello{position:absolute;right:60px;top:0;transform:translateY(-66%) rotate(-5deg)}
.t-destacado .pie{margin-top:10px;padding-top:26px;border-top:2px solid color-mix(in srgb,var(--fg) 14%,transparent)}`,
      html: (p, x) => `<div class="pieza t-destacado ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}">${`<div class="foto" data-min="${Math.round(x.H * 0.36)}" style="background-image:var(--foto${p.foto || 1})"></div>`}
<div class="panel">${etq(p)}${sello(p, true)}${tit(p)}${sub(p)}${cta(p)}${pie(x.negocio)}</div></div>`
    },
    {
      id: "oferta", nombre: "Oferta", icono: "fa-percent", esquema: "color", fotos: 1,
      desc: "Promo con descuento grande, precio antes y ahora.",
      css: `
.t-oferta{padding:72px;gap:30px}
.t-oferta.f-916{padding:170px 72px 160px}
.t-oferta>*{position:relative}
.t-oferta>.deco{position:absolute;width:920px;height:920px;border-radius:50%;background:var(--panel);right:-320px;top:16%}
.t-oferta .cab{display:flex;flex-direction:column;gap:22px}
.t-oferta .tit{--s:98px}
.t-oferta .medio{flex:1;min-height:0;position:relative;display:flex}
.t-oferta .foto{flex:1;border-radius:44px;border:14px solid #fff;box-shadow:0 18px 40px rgba(0,0,0,.2);transform:rotate(-2deg);margin:8px 34px 8px 8px}
.t-oferta .dto{position:absolute;right:-14px;top:-14px;max-width:360px;background:var(--sello);color:var(--sobre-sello);font-family:var(--f-num);font-weight:var(--w-num);font-size:calc(88px*var(--k));line-height:.95;text-align:center;padding:22px 30px;border-radius:34px;transform:rotate(6deg);box-shadow:0 10px 0 rgba(0,0,0,.16)}
.t-oferta .abajo{display:flex;align-items:center;justify-content:space-between;gap:26px;flex-wrap:wrap}
.t-oferta .precios{display:flex;align-items:baseline;gap:22px}
.t-oferta .antes{font-size:calc(38px*var(--k));text-decoration:line-through;opacity:.72;font-weight:600}
.t-oferta .ahora{font-family:var(--f-num);font-weight:var(--w-num);font-size:calc(104px*var(--k));line-height:1;color:var(--realce);white-space:nowrap}
.t-oferta .cta{align-self:center}
.t-oferta .pie{padding-top:24px;border-top:2px solid color-mix(in srgb,var(--fg) 18%,transparent)}`,
      html: (p, x) => `<div class="pieza t-oferta ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}"><div class="deco"></div>
<div class="cab">${etq(p)}${tit(p)}${sub(p)}</div>
<div class="medio" data-min="${Math.round(x.H * 0.3)}">${foto(p.foto || 1)}${p.descuento ? `<div class="dto" data-c="descuento">${esc(p.descuento)}</div>` : ""}</div>
${p.precio || p.cta ? `<div class="abajo"><div class="precios">${p.precio_antes && p.precio ? `<span class="antes" data-c="precio_antes">${esc(p.precio_antes)}</span>` : ""}${p.precio ? `<span class="ahora" data-c="precio">${esc(p.precio)}</span>` : ""}</div>${cta(p)}</div>` : ""}
${pie(x.negocio)}</div>`
    },
    {
      id: "catalogo", nombre: "Catálogo", icono: "fa-table-cells-large", esquema: "claro", fotos: 2,
      desc: "Varios productos en grilla, cada uno con su nombre y precio.",
      css: `
.t-catalogo{padding:64px 60px 54px;gap:30px}
.t-catalogo.f-916{padding:170px 60px 160px}
.t-catalogo .cab{display:flex;flex-direction:column;gap:18px}
.t-catalogo .tit{--s:76px}
.t-catalogo .grilla{flex:1;min-height:0;display:grid;gap:22px;grid-template-columns:repeat(2,1fr);grid-auto-rows:1fr}
.t-catalogo .grilla.n3,.t-catalogo .grilla.n5,.t-catalogo .grilla.n6{grid-template-columns:repeat(3,1fr)}
.t-catalogo .grilla.n5 .prod:first-child{grid-column:span 2}
.t-catalogo.f-45 .grilla.n3,.t-catalogo.f-916 .grilla.n5,.t-catalogo.f-916 .grilla.n6{grid-template-columns:repeat(2,1fr)}
.t-catalogo.f-45 .grilla.n3 .prod:first-child{grid-column:span 2}
.t-catalogo.f-916 .grilla.n2,.t-catalogo.f-916 .grilla.n3{grid-template-columns:1fr}
.t-catalogo .prod{position:relative;background:var(--panel);color:var(--sobre-panel);border-radius:30px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.t-catalogo .prod .foto{flex:1;min-height:0;background-color:color-mix(in srgb,var(--fg) 10%,var(--panel))}
.t-catalogo .info{padding:16px 22px 18px;display:flex;flex-direction:column;gap:4px}
.t-catalogo .nom{font-weight:700;font-size:calc(27px*var(--k));line-height:1.15}
.t-catalogo .det{font-size:calc(21px*var(--k));line-height:1.2;opacity:.8}
.t-catalogo .pre{position:absolute;top:14px;right:14px;background:var(--sello);color:var(--sobre-sello);font-family:var(--f-num);font-weight:var(--w-num);font-size:calc(32px*var(--k));line-height:1.1;padding:8px 16px;border-radius:14px;white-space:nowrap}
.t-catalogo .pie{padding-top:4px}`,
      html: (p, x) => {
        const prods = (p.productos || []).slice(0, 6);
        return `<div class="pieza t-catalogo ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}"><div class="cab">${etq(p)}${tit(p)}${sub(p)}</div>
<div class="grilla n${prods.length}" data-min="${Math.round(x.H * 0.4)}">${prods.map((it, i) => `<div class="prod">${foto(it.foto || i + 1)}
${it.precio ? `<span class="pre" data-c="productos.${i}.precio">${esc(it.precio)}</span>` : ""}
<div class="info"><span class="nom" data-c="productos.${i}.nombre">${esc(it.nombre)}</span>${it.detalle ? `<span class="det" data-c="productos.${i}.detalle">${esc(it.detalle)}</span>` : ""}</div></div>`).join("")}</div>
${pie(x.negocio)}</div>`;
      }
    },
    {
      id: "novedad", nombre: "Novedad", icono: "fa-wand-magic-sparkles", esquema: "claro", fotos: 1,
      desc: "Lanzamiento o ingreso: la foto en un arco con formas de color.",
      css: `
.t-novedad{padding:72px;gap:38px}
.t-novedad.f-916{padding:170px 72px 160px}
.t-novedad .centro{flex:1;min-height:0;display:flex;gap:56px}
.t-novedad.f-45 .centro,.t-novedad.f-916 .centro{flex-direction:column;gap:44px}
.t-novedad .escena{position:relative;flex:1;min-width:0;min-height:0;display:flex;justify-content:center}
.t-novedad .arco{position:relative;width:88%;border-radius:999px 999px 40px 40px}
.t-novedad.f-45 .arco,.t-novedad.f-916 .arco{width:70%}
.t-novedad .f1{position:absolute;width:280px;height:280px;border-radius:50%;background:var(--realce);left:-30px;bottom:-34px}
.t-novedad .f2{position:absolute;width:190px;height:190px;border-radius:50%;border:30px solid var(--sello);right:-6px;top:26px}
.t-novedad.f-45 .f1,.t-novedad.f-916 .f1{left:4%}
.t-novedad.f-45 .f2,.t-novedad.f-916 .f2{right:5%}
.t-novedad .sello{position:absolute;right:0;bottom:30px}
.t-novedad.f-45 .sello,.t-novedad.f-916 .sello{right:6%}
.t-novedad .txt{display:flex;flex-direction:column;gap:24px;justify-content:center}
.t-novedad.f-11 .txt{flex:0 0 50%}
.t-novedad.f-11 .tit{--s:72px}`,
      html: (p, x) => `<div class="pieza t-novedad ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}"><div class="centro">
<div class="escena" data-min="${Math.round(x.H * 0.32)}"><div class="f1"></div><div class="f2"></div>${foto(p.foto || 1, "arco")}${sello(p, true)}</div>
<div class="txt">${etq(p)}${tit(p)}${sub(p)}${cta(p)}</div></div>${pie(x.negocio)}</div>`
    },
    {
      id: "anuncio", nombre: "Anuncio", icono: "fa-bullhorn", esquema: "color", fotos: 0,
      desc: "Sin foto: horarios, avisos, sorteos o un mensaje fuerte.",
      css: `
.t-anuncio{padding:80px 76px 60px;gap:30px}
.t-anuncio.f-916{padding:190px 76px 160px}
.t-anuncio>*{position:relative}
.t-anuncio>.deco{position:absolute;right:-190px;top:-190px;width:580px;height:580px;border-radius:50%;background:var(--panel)}
.t-anuncio>.deco2{position:absolute;right:56px;top:44px;width:96px;height:96px;border-radius:50%;background:var(--sello)}
.t-anuncio .cuerpo{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:30px}
.t-anuncio .tit{--s:120px}
.t-anuncio .barra{width:150px;height:14px;border-radius:7px;background:var(--realce)}
.t-anuncio .items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:20px}
.t-anuncio .items li{display:flex;align-items:center;gap:22px;font-size:calc(31px*var(--k));font-weight:600;line-height:1.2}
.t-anuncio .items i{flex:none;width:68px;height:68px;border-radius:50%;background:var(--realce);color:var(--sobre-realce);display:inline-flex;align-items:center;justify-content:center;font-size:30px}
.t-anuncio .pie{padding-top:24px;border-top:2px solid color-mix(in srgb,var(--fg) 18%,transparent)}`,
      html: (p, x) => `<div class="pieza t-anuncio ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}">${fondo(x)}<div class="deco"></div><div class="deco2"></div>
<div class="cuerpo" data-cabe>${etq(p)}${tit(p)}<div class="barra"></div>${sub(p)}
${(p.items || []).length ? `<ul class="items">${p.items.slice(0, 5).map((it, i) => `<li><i class="fa-solid fa-${esc(it.icono || "check")}"></i><span data-c="items.${i}.texto">${esc(it.texto)}</span></li>`).join("")}</ul>` : ""}
${p.precio ? `<div style="align-self:flex-start">${sello(p, true)}</div>` : ""}${cta(p)}</div>${pie(x.negocio)}</div>`
    }
    ,{
      id: "saludo", nombre: "Saludo", icono: "fa-heart", esquema: "color", fotos: 0,
      desc: "Sin foto: fechas especiales, feriados, aniversarios y agradecimientos.",
      css: `
.t-saludo{padding:84px 80px 64px;gap:28px;text-align:center}
.t-saludo.f-916{padding:200px 80px 170px}
.t-saludo>*{position:relative}
.t-saludo>.aro{position:absolute;border-radius:50%;border:46px solid var(--panel)}
.t-saludo>.a1{width:560px;height:560px;left:-250px;top:-230px}
.t-saludo>.a2{width:420px;height:420px;right:-190px;bottom:120px}
.t-saludo>.punto{position:absolute;width:110px;height:110px;border-radius:50%;background:var(--sello);right:120px;top:110px}
.t-saludo .cuerpo{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px}
.t-saludo .cta{font-size:calc(32px*var(--k));padding:22px 40px}
.t-saludo .firma{font-size:calc(40px*var(--kf))}
.t-saludo .cuerpo>*{max-width:100%}
.t-saludo .etq,.t-saludo .cta{align-self:center}
.t-saludo .tit{--s:144px}
.t-saludo .barra{width:150px;height:14px;border-radius:7px;background:var(--realce)}
.t-saludo .sub{font-size:calc(42px*var(--k));max-width:820px}
.t-saludo .pie{justify-content:center;padding-top:26px;border-top:2px solid color-mix(in srgb,var(--fg) 18%,transparent)}
.t-saludo .contacto{display:none}`,
      html: (p, x) => `<div class="pieza t-saludo ${x.clase} e-${x.esquema || "claro"}${x.fondo ? " con-fondo" : ""}">${fondo(x)}<div class="aro a1"></div><div class="aro a2"></div><div class="punto"></div>
<div class="cuerpo" data-cabe>${etq(p)}${tit(p)}<div class="barra"></div>${sub(p)}${cta(p)}</div>${pie(x.negocio)}</div>`
    }
  ];
  const POR_ID = {};
  LISTA.forEach(t => { POR_ID[t.id] = t; });

  // Plantilla que se puede usar con las fotos y textos que hay
  function apta(id, pieza, nFotos) {
    const t = POR_ID[id];
    if (!t) return false;
    if (t.id === "catalogo") return nFotos >= 2 && (pieza.productos || []).length >= 2;
    return nFotos >= t.fotos;
  }
  function elegir(pieza, nFotos) {
    if (apta(pieza.plantilla, pieza, nFotos)) return pieza.plantilla;
    if (!nFotos) return pieza.plantilla === "saludo" ? "saludo" : "anuncio";
    if (apta("catalogo", pieza, nFotos) && nFotos > 1) return "catalogo";
    return pieza.descuento ? "oferta" : "destacado";
  }

  // x: { W, H, clase, negocio }
  function codigo(id, pieza, x) {
    const t = POR_ID[id] || POR_ID.destacado;
    return "<style>" + BASE + t.css + "\n</style>\n" + t.html(pieza || {}, x);
  }

  return { lista: LISTA, porId: POR_ID, apta, elegir, codigo, esc };
})();
