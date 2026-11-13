/* =========================================================
   Pantalla (pensada primero para el celular):
   Inicio · Calendario · Mi negocio, y tres pantallas de trabajo:
   Crear (una publicación o un plan), Plan propuesto y Publicación.
   Todo se guarda en este navegador (IndexedDB); no hay servidor propio.
   ========================================================= */
(function () {
  const C = window.VID_CONFIG, F = window.Fechas;
  const $ = s => document.querySelector(s);
  const esc = Plantillas.esc;
  const TABS = ["inicio", "calendario", "negocio"];
  const ESQUEMAS = { claro: "Claro", color: "Color", oscuro: "Oscuro" };
  const RITMOS = [[2, "2 por semana"], [3, "3 por semana"], [5, "Casi todos los días"]];
  const CAMPOS = [["titulo", "Título"], ["destacado", "Palabras en otro color"], ["subtitulo", "Subtítulo"], ["etiqueta", "Etiqueta de arriba"],
    ["precio", "Precio"], ["precio_antes", "Precio anterior"], ["descuento", "Descuento o promo"], ["cta", "Botón"]];
  const DATOS_NEGOCIO = ["nombre", "rubro", "ciudad", "instagram", "whatsapp", "direccion", "descripcion", "publico", "tono", "horarios", "extra", "hashtags"];
  const SIN_IA = "El asistente sólo responde si abrís la página en http://localhost:5520";

  // b: lo que se está cargando en "Crear" · plan: propuesta de la IA · pub: publicación abierta
  const S = { negocios: [], neg: null, indice: [], pub: null, b: null, plan: null, vista: "inicio", tab: "inicio", ocupado: false };

  /* ---------------- Utilidades ---------------- */
  function toast(texto) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = texto;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }
  function espera(texto) { $("#espera-texto").textContent = texto || ""; $("#espera").hidden = !texto; S.ocupado = !!texto; }
  const debounce = (f, ms) => { let t; return function () { clearTimeout(t); t = setTimeout(f, ms); }; };
  const slug = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "flyer";
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);

  function cargarImg(src) {
    return new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => mal(new Error("No se pudo abrir la imagen")); im.src = src; });
  }
  function achicar(src, lado, tipo) {
    return cargarImg(src).then(im => {
      const k = Math.min(1, lado / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return tipo === "png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88);
    });
  }
  function leerImagen(file, lado, tipo) {
    return new Promise((ok, mal) => { const fr = new FileReader(); fr.onerror = mal; fr.onload = () => ok(fr.result); fr.readAsDataURL(file); }).then(d => achicar(d, lado, tipo));
  }

  /* ---------------- Datos ---------------- */
  function nuevaPub(datos) {
    return Object.assign({ id: "pub-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), negocioId: S.neg.id, creada: Date.now(),
      fotos: [], chat: [], pieza: null, textos: { instagram: "", hashtags: [], whatsapp: "" }, tipo: "post", fecha: null, publicada: false,
      titulo: "", pedido: "", clave: null, preparando: false, mini: null,
      logos: null, invitados: [], fondo: null, fondos: [], fondoN: 0, sinFondo: false, // logos: null = el principal del negocio
      diseno: { origen: "plantilla", plantilla: null, esquema: null, formato: "4:5", libre: null } }, datos);
  }
  const guardarNegocios = () => Almacen.guardar("negocios", S.negocios);
  const tituloDe = p => (p.pieza && p.pieza.titulo) || p.titulo || "Publicación sin terminar";
  function entrada(p) {
    return { id: p.id, negocioId: p.negocioId, titulo: tituloDe(p), fecha: p.fecha, tipo: p.tipo, publicada: !!p.publicada, lista: !!p.pieza,
      preparando: !!p.preparando, clave: p.clave, mini: p.mini, creada: p.creada };
  }
  function guardarPub(p) {
    const mini = p.mini || !p.fotos.length ? Promise.resolve(p.mini) : achicar(p.fotos[0].data, 160).catch(() => null);
    return mini.then(m => {
      p.mini = m;
      S.indice = [entrada(p)].concat(S.indice.filter(e => e.id !== p.id));
      return Promise.all([Almacen.guardar("pub:" + p.id, p), Almacen.guardar("indice", S.indice)]);
    }).catch(() => toast("No se pudo guardar en este dispositivo."));
  }
  const guardarAbierta = debounce(() => { if (S.pub) guardarPub(S.pub); }, 500);
  function borrarPub(id) {
    S.indice = S.indice.filter(e => e.id !== id);
    return Promise.all([Almacen.borrar("pub:" + id), Almacen.guardar("indice", S.indice)]);
  }
  const mias = () => S.indice.filter(e => e.negocioId === S.neg.id);

  /* ---------------- Navegación ---------------- */
  function ir(vista) { if (location.hash === "#" + vista) mostrar(vista); else location.hash = vista; }
  function mostrar(vista) {
    if (!S.neg) return;
    if (vista === "pub" && !S.pub) vista = "inicio";
    if (vista === "crear" && !S.b) vista = "inicio";
    if (vista === "plan" && !S.plan) vista = S.b ? "crear" : "inicio";
    if (["inicio", "calendario", "negocio", "crear", "plan", "pub"].indexOf(vista) < 0) vista = "inicio";
    S.vista = vista;
    const esTab = TABS.indexOf(vista) >= 0;
    if (esTab) S.tab = vista;
    document.querySelectorAll(".vista").forEach(v => { v.hidden = v.id !== "v-" + vista; });
    $("#btn-volver").hidden = esTab; $("#marca").hidden = !esTab;
    document.body.classList.toggle("trabajo", !esTab);
    document.querySelectorAll("#tabs button").forEach(b => { if (b.dataset.ir === S.tab && esTab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    ({ inicio: pintarInicio, calendario: pintarCalendario, negocio: pintarNegocio, crear: pintarCrear, plan: pintarPlan, pub: pintarPub })[vista]();
    window.scrollTo(0, 0);
  }
  function volver() {
    if (S.vista === "plan") return ir("crear");
    ir(S.tab);
  }

  /* ---------------- Tarjetas compartidas ---------------- */
  function estadoDe(e) {
    if (e.preparando) return ["Preparando…", "espera"];
    if (!e.lista) return ["Falta armar", "falta"];
    if (e.publicada) return ["Publicada", "ok"];
    if (e.fecha && e.fecha < F.hoy()) return ["Atrasada", "falta"];
    return e.fecha ? ["Lista", "ok"] : ["Borrador", ""];
  }
  function itemPub(e, conFecha) {
    const est = estadoDe(e), tipo = e.tipo === "historia" ? "Historia" : "Post";
    const cuando = conFecha && e.fecha ? " · " + F.larga(e.fecha) : "";
    return `<button type="button" class="item" data-accion="abrir" data-id="${esc(e.id)}">
<span class="item__img" ${e.mini ? `style="background-image:url('${e.mini}')"` : ""} aria-hidden="true">${e.mini ? "" : '<i class="fa-solid fa-bullhorn"></i>'}</span>
<span class="item__txt"><strong>${esc(e.titulo)}</strong><small>${tipo}${cuando}</small></span>
<span class="etiqueta ${est[1]}">${est[0]}</span><i class="fa-solid fa-chevron-right item__flecha" aria-hidden="true"></i></button>`;
  }
  function itemFecha(f) {
    const pub = mias().filter(e => e.clave === f.clave)[0];
    const d = f.fecha.split("-");
    return `<div class="item item--fecha${f.cerca ? " cerca" : ""}">
<span class="item__dia" aria-hidden="true"><b>${+d[2]}</b>${F.MESES[+d[1] - 1].slice(0, 3)}</span>
<span class="item__txt"><strong>${esc(f.nombre)}</strong><small>${mayus(F.relativa(f.fecha))}${f.nota ? " · " + esc(f.nota) : ""}</small></span>
${pub ? `<button type="button" class="btn" data-accion="abrir" data-id="${esc(pub.id)}">Ver</button>`
      : `<button type="button" class="btn${f.cerca ? " btn--primario" : ""}" data-accion="saludo" data-clave="${esc(f.clave)}">Preparar</button>`}</div>`;
  }

  /* ---------------- Inicio ---------------- */
  function pintarInicio() {
    const hoy = F.hoy(), todas = mias();
    const paraHoy = todas.filter(e => e.fecha && e.fecha <= hoy && !e.publicada).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    const fechas = F.proximas(S.neg), cerca = fechas.filter(f => f.cerca), siguientes = fechas.filter(f => !f.cerca).slice(0, cerca.length ? 1 : 2);
    const borradores = todas.filter(e => !e.fecha && !e.publicada).slice(0, 3);
    const proximas = todas.filter(e => e.fecha && e.fecha > hoy && !e.publicada).sort((a, b) => a.fecha < b.fecha ? -1 : 1).slice(0, 3);
    $("#v-inicio").innerHTML = `
<h1>Hola, ${esc(S.neg.nombre)}</h1>
${IA.activa() ? "" : `<div class="aviso">${SIN_IA}</div>`}
<div class="acciones">
  <button type="button" class="accion accion--principal" data-accion="crear"><i class="fa-solid fa-camera" aria-hidden="true"></i><span><strong>Crear una publicación</strong><small>Subí fotos y contame qué querés mostrar</small></span></button>
  <button type="button" class="accion" data-accion="planificar"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i><span><strong>Planificar varias</strong><small>Subí muchas fotos y te armo el calendario</small></span></button>
</div>
<h2>Para hoy</h2>
<div class="lista">${paraHoy.length ? paraHoy.map(e => itemPub(e, e.fecha < hoy)).join("") : '<p class="sin">Hoy no hay nada para publicar.</p>'}</div>
${cerca.length ? `<h2>¡Se viene!</h2><div class="lista">${cerca.map(itemFecha).join("")}</div>` : ""}
${proximas.length ? `<h2>Lo próximo</h2><div class="lista">${proximas.map(e => itemPub(e, true)).join("")}</div>` : ""}
<h2>Próximas fechas</h2>
<div class="lista">${siguientes.map(itemFecha).join("") || '<p class="sin">No hay fechas cargadas.</p>'}</div>
<button type="button" class="btn btn--texto" data-accion="nueva-fecha"><i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar una fecha importante</button>
${borradores.length ? `<h2>Borradores</h2><div class="lista">${borradores.map(e => itemPub(e)).join("")}</div>` : ""}`;
  }

  /* ---------------- Calendario ---------------- */
  function pintarCalendario() {
    const hoy = F.hoy(), todas = mias(), fechas = F.proximas(S.neg);
    const atrasadas = todas.filter(e => e.fecha && e.fecha < hoy && !e.publicada);
    const sinFecha = todas.filter(e => !e.fecha && !e.publicada);
    const publicadas = todas.filter(e => e.publicada);
    let dias = "";
    for (let i = 0; i <= 60; i++) {
      const d = F.sumar(hoy, i);
      const pubs = todas.filter(e => e.fecha === d && !e.publicada), fs = fechas.filter(f => f.fecha === d);
      if (!pubs.length && !fs.length && i > 0) continue;
      const nombre = (i === 0 ? "Hoy · " : i === 1 ? "Mañana · " : "") + F.larga(d);
      dias += `<h2 class="dia">${mayus(nombre)}</h2><div class="lista">${fs.map(itemFecha).join("")}${pubs.map(e => itemPub(e)).join("")}${!pubs.length && !fs.length ? '<p class="sin">Nada programado.</p>' : ""}</div>`;
    }
    $("#v-calendario").innerHTML = `
<h1>Calendario</h1>
<div class="dos">
  <button type="button" class="btn btn--grande" data-accion="planificar"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i> Planificar varias</button>
  <button type="button" class="btn btn--grande" data-accion="nueva-fecha"><i class="fa-solid fa-star" aria-hidden="true"></i> Agregar fecha</button>
</div>
${atrasadas.length ? `<h2 class="dia">Quedaron sin publicar</h2><div class="lista">${atrasadas.map(e => itemPub(e, true)).join("")}</div>` : ""}
${dias}
${sinFecha.length ? `<h2 class="dia">Sin fecha</h2><div class="lista">${sinFecha.map(e => itemPub(e)).join("")}</div>` : ""}
${publicadas.length ? `<details class="tarjeta"><summary>Ya publicadas (${publicadas.length})</summary><div class="lista">${publicadas.map(e => itemPub(e, true)).join("")}</div></details>` : ""}`;
  }

  /* ---------------- Mi negocio ---------------- */
  function pintarNegocio() {
    const n = S.neg, f = $("#form-negocio");
    $("#sel-negocio").innerHTML = S.negocios.map(x => `<option value="${esc(x.id)}"${x.id === n.id ? " selected" : ""}>${esc(x.nombre)}</option>`).join("");
    DATOS_NEGOCIO.forEach(k => { f.elements[k].value = n[k] || ""; });
    f.elements.primario.value = n.colores.primario; f.elements.acento.value = n.colores.acento;
    f.elements.estilo.innerHTML = Object.keys(C.estilos).map(k => `<option value="${k}">${C.estilos[k].nombre}</option>`).join("");
    f.elements.estilo.value = n.estilo;
    $("#lista-logos").innerHTML = n.logos.map((l, i) => `<div class="item item--fecha">
<span class="item__img logo-mini" style="background-image:url('${l.data}')" aria-hidden="true"></span>
<span class="item__txt"><label class="oculto" for="logo-nombre-${i}">Nombre del logo ${i + 1}</label><input id="logo-nombre-${i}" data-logo-nombre="${i}" value="${esc(l.nombre)}" placeholder="¿De quién es?"><small>${i === 0 ? "Principal: va en todas las imágenes" : "Se elige en cada publicación"}</small></span>
<button type="button" class="btn btn--texto btn--peligro" data-accion="borrar-logo" data-id="${esc(l.id)}" aria-label="Quitar el logo ${esc(l.nombre)}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div>`).join("") || '<p class="sin">Todavía no hay logos. Sin logo, al pie va el nombre del negocio.</p>';
    $("#btn-borrar-negocio").hidden = S.negocios.length < 2;
    $("#lista-fechas").innerHTML = (n.fechas || []).slice().sort((a, b) => a.mes - b.mes || a.dia - b.dia).map(x => `<div class="item item--fecha">
<span class="item__txt"><strong>${esc(x.nombre)}</strong><small>${F.textoFecha(x)} · aviso ${x.avisar === 1 ? "1 día" : x.avisar + " días"} antes${x.nota ? " · " + esc(x.nota) : ""}</small></span>
<button type="button" class="btn btn--texto btn--peligro" data-accion="borrar-fecha" data-id="${esc(x.id)}" aria-label="Quitar ${esc(x.nombre)}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div>`).join("") || '<p class="sin">No hay fechas cargadas.</p>';
  }
  function guardarNegocio(e) {
    e.preventDefault();
    const f = $("#form-negocio"), n = S.neg;
    DATOS_NEGOCIO.forEach(k => { n[k] = f.elements[k].value.trim(); });
    n.instagram = n.instagram.replace(/^@/, "");
    n.colores = { primario: f.elements.primario.value, acento: f.elements.acento.value };
    n.estilo = f.elements.estilo.value;
    guardarNegocios(); pintarMarca(); pintarNegocio(); toast("Listo, guardado.");
  }
  function pintarMarca() { $("#marca-negocio").textContent = S.neg.nombre; }
  function elegirNegocio(id) {
    S.neg = S.negocios.filter(n => n.id === id)[0] || S.negocios[0];
    S.pub = null; S.b = null; S.plan = null;
    Almacen.guardar("actual", S.neg.id);
    pintarMarca();
  }

  /* ---------------- Fechas importantes ---------------- */
  function abrirFecha() {
    const f = $("#form-fecha");
    f.reset();
    f.elements.mes.innerHTML = F.MESES.map((m, i) => `<option value="${i + 1}">${mayus(m)}</option>`).join("");
    $("#dlg-fecha").showModal();
  }
  function guardarFecha() {
    const f = $("#form-fecha");
    S.neg.fechas.push({ id: "f-" + Date.now().toString(36), nombre: f.elements.nombre.value.trim(), dia: Math.min(31, Math.max(1, +f.elements.dia.value || 1)),
      mes: +f.elements.mes.value, avisar: +f.elements.avisar.value, nota: f.elements.nota.value.trim(), regla: "" });
    guardarNegocios(); mostrar(S.vista); toast("Fecha guardada. Te voy a avisar.");
  }
  function prepararSaludo(clave) {
    const f = F.proximas(S.neg).filter(x => x.clave === clave)[0];
    if (!f) return;
    S.b = { modo: "una", fotos: [], texto: "", porSemana: 3, chat: [], pub: null, fecha: f.fecha, clave: f.clave, titulo: f.nombre };
    armarUna("Quiero una publicación de saludo por: " + f.nombre + " (" + F.larga(f.fecha) + ")." + (f.nota ? " Para tener en cuenta: " + f.nota + "." : ""));
  }

  /* ---------------- Voz ---------------- */
  let mic = null;
  function dictar(btn, alTexto) {
    if (mic) { if (mic === btn) Voz.terminar(false); return; }
    if (S.ocupado) return;
    const span = btn.querySelector("span"), base = span.textContent;
    const fin = () => { btn.classList.remove("grabando", "procesando"); btn.setAttribute("aria-pressed", "false"); span.textContent = base; mic = null; };
    mic = btn;
    btn.classList.add("grabando"); btn.setAttribute("aria-pressed", "true");
    span.textContent = "Te escucho… tocá para terminar";
    Voz.iniciar({
      alTick: s => { if (mic === btn && btn.classList.contains("grabando")) span.textContent = "Te escucho " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " · tocá para terminar"; },
      alProcesando: () => { btn.classList.remove("grabando"); btn.classList.add("procesando"); span.textContent = "Pasando a texto…"; },
      alTerminar: t => { fin(); if (t) alTexto(t); },
      alError: m => { fin(); toast(m); }
    });
  }
  function sumarTexto(sel, t) { const a = $(sel); a.value = (a.value.trim() ? a.value.trim() + " " : "") + t; a.dispatchEvent(new Event("input", { bubbles: true })); }

  /* ---------------- Crear ---------------- */
  function empezar(modo) {
    S.b = { modo, fotos: [], texto: "", porSemana: 3, chat: [], pub: null, fecha: null, clave: null, titulo: "" };
    S.plan = null;
    ir("crear");
  }
  function pintarCrear() {
    const b = S.b, plan = b.modo === "plan", max = plan ? C.maxFotosPlan : C.maxFotos;
    $("#crear-titulo").textContent = plan ? "Planificar varias publicaciones" : "Nueva publicación";
    $("#crear-bajada").textContent = plan ? "Subí todas las fotos juntas y contame qué es cada una. Yo las reparto en los próximos días." : "Subí las fotos, contame qué querés mostrar y te armo la imagen y el texto.";
    $("#crear-ayuda").textContent = plan ? "Decime qué es cada foto por su número, los precios y si hay promos. Por ejemplo: «la uno y la dos son remeras a 15 mil, la tres es la campera en oferta»."
      : "Qué es, cuánto sale, si hay promo. Si no subís fotos, armo un aviso o un saludo.";
    $("#nota-fotos").textContent = plan ? "Hasta " + max + " fotos." : "Hasta " + max + " fotos. Sin fotos también se puede.";
    $("#txt-armar").textContent = plan ? "Armar el plan" : "Armar la publicación";
    $("#crear-ritmo").hidden = !plan;
    $("#ritmos").innerHTML = RITMOS.map(r => `<button type="button" data-ritmo="${r[0]}" aria-pressed="${b.porSemana === r[0]}">${r[1]}</button>`).join("");
    $("#crear-texto").value = b.texto;
    pintarAvisoCrear(); pintarFotos();
  }
  function pintarAvisoCrear() {
    const a = S.b.aviso, caja = $("#crear-aviso");
    caja.hidden = !a;
    if (a) caja.innerHTML = `<strong>${esc(a.mensaje)}</strong>${(a.preguntas || []).length ? "<ul>" + a.preguntas.map(q => "<li>" + esc(q) + "</li>").join("") + "</ul>" : ""}<p>Respondé abajo, hablando o escribiendo, y volvé a tocar el botón.</p>`;
  }
  function pintarFotos() {
    const b = S.b, max = b.modo === "plan" ? C.maxFotosPlan : C.maxFotos;
    $("#fotos").innerHTML = b.fotos.map((f, i) => `<div class="foto"><div class="foto__img" style="background-image:url('${f.data}')"><span class="foto__num">Foto ${i + 1}</span></div>
<div class="foto__dato"><label for="nota-${i}">¿Qué es la foto ${i + 1}?</label><input id="nota-${i}" data-nota="${i}" value="${esc(f.nota || "")}" placeholder="Opcional" maxlength="100"></div>
<button type="button" class="foto__quitar" data-quitar="${i}" aria-label="Quitar la foto ${i + 1}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>`).join("");
    $("#btn-sumar-foto").hidden = b.fotos.length >= max;
    $("#txt-sumar-foto").textContent = b.fotos.length ? "Agregar más fotos" : "Agregar fotos";
  }
  function sumarFotos(files) {
    const b = S.b, max = b.modo === "plan" ? C.maxFotosPlan : C.maxFotos, lugar = max - b.fotos.length;
    const lista = Array.prototype.filter.call(files, f => /^image\//.test(f.type)).slice(0, lugar);
    if (files.length > lugar) toast("Se pueden subir hasta " + max + " fotos.");
    return Promise.all(lista.map(f => leerImagen(f, C.maxLadoFoto).catch(() => null))).then(datos => {
      datos.filter(Boolean).forEach(d => b.fotos.push({ data: d, nota: "" }));
      if (S.vista === "crear") pintarFotos();
    });
  }

  // Aplica la respuesta de la IA a una publicación. Devuelve true si quedó armada.
  function aplicar(p, d) {
    p.chat.push({ rol: "asistente", texto: d.mensaje || "", preguntas: d.preguntas, crudo: d.crudo });
    if (d.estado !== "listo") return false;
    const cambio = !p.pieza || p.pieza.plantilla !== d.pieza.plantilla;
    p.pieza = d.pieza;
    p.textos = { instagram: d.instagram, hashtags: d.hashtags, whatsapp: d.whatsapp };
    if (cambio || !p.diseno.plantilla) { p.diseno.plantilla = d.pieza.plantilla; p.diseno.esquema = null; }
    p.diseno.origen = "plantilla";
    return true;
  }

  function armar() {
    const b = S.b;
    if (!b || S.ocupado) return;
    if (!IA.activa()) return toast(SIN_IA);
    b.texto = $("#crear-texto").value.trim();
    const conNotas = b.fotos.some(f => f.nota);
    if (b.modo === "plan") {
      if (b.fotos.length < 2) return toast("Para planificar, subí al menos 2 fotos.");
      if (!b.texto && !conNotas) return toast("Contame qué es cada foto, hablando o escribiendo.");
      return planificar(b.texto || "Armá el plan con estas fotos.");
    }
    if (!b.texto && !conNotas) return toast(b.fotos.length ? "Contame qué son las fotos, hablando o escribiendo." : "Subí una foto o contame qué querés publicar.");
    armarUna(b.texto || "Armá la publicación con estas fotos.");
  }

  function armarUna(texto) {
    const b = S.b, neg = S.neg;
    const p = b.pub || nuevaPub({ fecha: b.fecha, clave: b.clave, titulo: b.titulo });
    p.fotos = b.fotos.slice(0, C.maxFotos); p.pedido = p.pedido || texto;
    p.chat.push({ rol: "usuario", texto });
    espera("Armando tu publicación…");
    IA.redactar(neg, p).then(d => {
      if (aplicar(p, d)) {
        return fondoAuto(p).then(() => guardarPub(p)).then(() => { espera(""); S.b = null; S.pub = p; S.respuesta = d.mensaje; ir("pub"); });
      }
      espera("");
      b.pub = p; b.texto = ""; b.aviso = { mensaje: d.mensaje || "Necesito un poco más de información.", preguntas: d.preguntas };
      if (S.vista === "crear") { $("#crear-texto").value = ""; pintarAvisoCrear(); window.scrollTo(0, 0); } else ir("crear");
    }).catch(e => { espera(""); p.chat.pop(); toast("No pude armarla (" + e.message + "). Probá de nuevo."); });
  }

  /* ---------------- Plan ---------------- */
  function planificar(texto) {
    const b = S.b;
    b.chat.push({ rol: "usuario", texto });
    espera("Pensando el plan…");
    IA.planificar(S.neg, b).then(r => {
      espera("");
      b.chat.push({ rol: "asistente", texto: r.mensaje, crudo: r.crudo });
      if (r.estado !== "listo") {
        b.texto = ""; b.aviso = { mensaje: r.mensaje, preguntas: r.preguntas };
        S.plan = null;
        if (S.vista !== "crear") ir("crear"); else { $("#crear-texto").value = ""; pintarAvisoCrear(); window.scrollTo(0, 0); }
        return;
      }
      b.aviso = null;
      S.plan = { mensaje: r.mensaje, items: r.publicaciones, descripciones: r.descripciones || {}, sinUsar: r.sinUsar || [] };
      if (S.vista === "plan") pintarPlan(); else ir("plan");
      window.scrollTo(0, 0);
    }).catch(e => { espera(""); b.chat.pop(); toast("No pude armar el plan (" + e.message + "). Probá de nuevo."); });
  }
  function pintarPlan() {
    const pl = S.plan, b = S.b;
    $("#plan-mensaje").textContent = pl.mensaje || "Así repartiría las fotos.";
    const usadas = {};
    pl.items.forEach(it => it.fotos.forEach(n => { usadas[n] = 1; }));
    const libres = b.fotos.map((f, i) => i + 1).filter(n => !usadas[n]), av = $("#plan-sin-usar");
    av.hidden = !libres.length;
    av.textContent = libres.length ? (libres.length === 1 ? "La foto " + libres[0] + " quedó sin usar." : "Las fotos " + libres.join(", ") + " quedaron sin usar.") + " Si las querés publicar, pedímelo abajo." : "";
    $("#plan-texto").value = "";
    $("#plan-lista").innerHTML = pl.items.map((it, i) => `<div class="tarjeta plan">
<div class="plan__cab"><span class="etiqueta ${it.tipo === "historia" ? "historia" : "ok"}">${it.tipo === "historia" ? "Historia" : "Post"}</span><strong>${esc(it.titulo)}</strong></div>
<p class="plan__dia" id="plan-dia-${i}">${mayus(F.larga(it.fecha))} · ${F.relativa(it.fecha)}</p>
${it.fotos.length ? `<div class="minis">${it.fotos.map(n => `<span style="background-image:url('${b.fotos[n - 1].data}')"><b>${n}</b></span>`).join("")}</div>` : ""}
${it.motivo ? `<p class="nota">${esc(it.motivo)}</p>` : ""}
<div class="fila"><label class="crece">Cambiar el día<input type="date" data-plan-fecha="${i}" value="${it.fecha}" min="${F.hoy()}"></label>
<button type="button" class="btn btn--texto btn--peligro" data-plan-quitar="${i}">Quitar</button></div></div>`).join("") || '<p class="sin">No quedó ninguna publicación en el plan.</p>';
    $("#btn-aceptar-plan").hidden = !pl.items.length;
  }
  function aceptarPlan() {
    const b = S.b, pl = S.plan;
    if (!pl || !pl.items.length || S.ocupado) return;
    espera("Guardando el plan…");
    const pubs = pl.items.map(it => nuevaPub({
      fotos: it.fotos.map(n => ({ data: b.fotos[n - 1].data, nota: b.fotos[n - 1].nota || pl.descripciones[n] || "" })), fecha: it.fecha, tipo: it.tipo, titulo: it.titulo, preparando: true,
      pedido: "Publicación planificada: " + it.titulo + ". " + it.idea ,
      diseno: { origen: "plantilla", plantilla: null, esquema: null, formato: it.tipo === "historia" ? "9:16" : "4:5", libre: null }
    }));
    pubs.reduce((cola, p) => cola.then(() => guardarPub(p)), Promise.resolve()).then(() => {
      espera(""); S.b = null; S.plan = null;
      toast("Plan guardado. Estoy escribiendo cada publicación…");
      ir("calendario");
      prepararVarias(pubs.map(p => p.id), S.neg);
    });
  }
  // Escribe en segundo plano las publicaciones del plan, de a dos.
  function prepararVarias(ids, neg) {
    let i = 0;
    const sig = () => {
      if (i >= ids.length) return Promise.resolve();
      const id = ids[i++];
      return Almacen.leer("pub:" + id).then(p => {
        if (!p || !S.indice.some(e => e.id === id)) return;
        p.chat.push({ rol: "usuario", texto: p.pedido });
        return IA.redactar(neg, p).then(d => { if (aplicar(p, d)) return fondoAuto(p); }, () => { p.chat.pop(); }).then(() => { p.preparando = false; return guardarPub(p); });
      }).then(() => { if (TABS.indexOf(S.vista) >= 0) mostrarSinScroll(); return sig(); });
    };
    return Promise.all([sig(), sig()]).then(() => toast("Listo: ya están todas las publicaciones del plan."));
  }
  function mostrarSinScroll() { const y = window.scrollY; mostrar(S.vista); window.scrollTo(0, y); }

  /* ---------------- Abrir una publicación ---------------- */
  function abrir(id) {
    const e = S.indice.filter(x => x.id === id)[0];
    if (!e) return;
    if (e.preparando) return toast("Todavía la estoy escribiendo. Dame unos segundos.");
    Almacen.leer("pub:" + id).then(p => {
      if (!p) return toast("No encontré esa publicación.");
      if (!p.pieza) { // quedó sin armar: se retoma en Crear
        S.b = { modo: "una", fotos: p.fotos, texto: p.pedido || "", porSemana: 3, chat: [], pub: p, fecha: p.fecha, clave: p.clave, titulo: p.titulo };
        p.pedido = "";
        return ir("crear");
      }
      S.pub = p; S.respuesta = ""; ir("pub");
    });
  }

  /* ---------------- Publicación: flyer ---------------- */
  function contexto() {
    const d = S.pub.diseno, f = C.formatos[d.formato] || C.formatos["4:5"];
    const t = Plantillas.porId[d.plantilla] || Plantillas.porId.destacado;
    const esquema = d.origen === "libre" ? "claro" : (d.esquema || t.esquema);
    return { W: f.w, H: f.h, clase: f.clase, negocio: S.neg, fotos: S.pub.fotos.map(x => x.data), vars: Negocios.variables(S.neg, esquema), esquema,
      logos: logosDe(S.pub), fondo: llevaFondo(S.pub) && S.pub.fondo ? S.pub.fondo.data : null };
  }

  /* ---------------- Logos de la publicación ---------------- */
  const logosElegidos = p => p.logos || (S.neg.logos[0] ? [S.neg.logos[0].id] : []);
  function logosDe(p) {
    const ids = logosElegidos(p);
    return S.neg.logos.filter(l => ids.indexOf(l.id) >= 0).map(l => l.data).concat((p.invitados || []).map(l => l.data));
  }
  function pintarLogosPub() {
    const p = S.pub, ids = logosElegidos(p);
    $("#pub-logos").innerHTML = S.neg.logos.map(l => `<button type="button" data-logo="${esc(l.id)}" aria-pressed="${ids.indexOf(l.id) >= 0}"><span style="background-image:url('${l.data}')" aria-hidden="true"></span>${esc(l.nombre || "Logo")}</button>`).join("") +
      (p.invitados || []).map((l, i) => `<button type="button" data-invitado="${i}" aria-pressed="true" aria-label="Quitar el logo invitado"><span style="background-image:url('${l.data}')" aria-hidden="true"></span>Invitado <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`).join("") ||
      '<p class="nota">Todavía no cargaste logos. Podés hacerlo en «Mi negocio».</p>';
  }

  /* ---------------- Foto de fondo (avisos y saludos) ---------------- */
  const llevaFondo = p => !!p.pieza && p.diseno.origen === "plantilla" && ["anuncio", "saludo"].indexOf(p.diseno.plantilla || p.pieza.plantilla) >= 0;
  const conLimite = (pr, ms) => Promise.race([pr, new Promise((ok, mal) => setTimeout(() => mal(new Error("tardó demasiado")), ms))]);
  // Prueba la foto n de la lista; si no se puede bajar, sigue con las siguientes.
  function probarFondo(p, n, intentos) {
    const r = p.fondos[n];
    if (!r || !intentos) return Promise.resolve(false);
    return conLimite(Fotos.suave(r), 15000).then(d => { p.fondo = { data: d, credito: { autor: r.autor, licencia: r.licencia, fuente: r.fuente, pagina: r.pagina } }; p.fondoN = n; p.sinFondo = false; return true; },
      () => probarFondo(p, (n + 1) % p.fondos.length, intentos - 1));
  }
  function buscarFondos(p) {
    const q = p.pieza.fondo_busqueda;
    if (!q) return Promise.resolve(false);
    return conLimite(Fotos.buscar(q, p.pieza.fondo_busqueda_en), 15000).then(rs => { p.fondos = rs; return probarFondo(p, 0, 3); }).catch(() => false);
  }
  // Al armar un aviso o un saludo sin fotos, busca sola una foto de fondo.
  function fondoAuto(p) {
    if (!p.pieza || p.fotos.length || p.fondo || p.sinFondo || ["anuncio", "saludo"].indexOf(p.pieza.plantilla) < 0) return Promise.resolve(false);
    return buscarFondos(p);
  }
  function pintarFondo() {
    const p = S.pub, lleva = llevaFondo(p), c = p.fondo && p.fondo.credito;
    $("#tarjeta-fondo").hidden = !lleva;
    if (!lleva) return;
    $("#fondo-estado").textContent = !p.fondo ? "Ahora va sin foto, sobre el color del negocio."
      : c ? "Foto de " + c.autor + " · " + c.licencia + " · " + c.fuente + ". Va desenfocada, detrás del texto." : "Estás usando una foto tuya, desenfocada, detrás del texto.";
    $("#btn-fondo-credito").hidden = !c;
    $("#btn-fondo-sin").setAttribute("aria-pressed", String(!p.fondo));
  }
  function cambiarFondo(promesa, error) {
    const p = S.pub;
    espera("Buscando la foto…");
    promesa.then(ok => { if (!ok) toast(error); }).catch(() => toast(error)).then(() => {
      espera(""); guardarPub(p);
      if (S.pub === p && S.vista === "pub") pintarFlyer();
    });
  }
  function escalar() {
    if (S.vista !== "pub" || !S.pub) return;
    const x = contexto(), ancho = $("#escenario").clientWidth, alto = Math.max(380, window.innerHeight * 0.74);
    const k = Math.min(ancho / x.W, alto / x.H, 1);
    $("#marco").style.width = x.W * k + "px"; $("#marco").style.height = x.H * k + "px";
    const fl = $("#flyer");
    fl.style.width = x.W + "px"; fl.style.height = x.H + "px"; fl.style.transform = "scale(" + k + ")";
  }
  function pintarBarras() {
    const p = S.pub, d = p.diseno, n = p.fotos.length;
    $("#plantillas").innerHTML = Plantillas.lista.map(t => {
      const ok = Plantillas.apta(t.id, p.pieza, n);
      return `<button type="button" data-plantilla="${t.id}" aria-pressed="${d.origen === "plantilla" && d.plantilla === t.id}" ${ok ? "" : "disabled"} title="${esc(ok ? t.desc : "Necesita más fotos")}"><i class="fa-solid ${t.icono}" aria-hidden="true"></i>${t.nombre}</button>`;
    }).join("") + (d.libre ? `<button type="button" data-plantilla="libre" aria-pressed="${d.origen === "libre"}"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>Diseño de la IA</button>` : "");
    $("#formatos").innerHTML = Object.keys(C.formatos).map(k => `<button type="button" data-formato="${k}" aria-pressed="${d.formato === k}">${C.formatos[k].nombre}</button>`).join("");
    pintarFondo();
    const esq = contexto().esquema;
    $("#esquemas").innerHTML = Object.keys(ESQUEMAS).map(k => `<button type="button" data-esquema="${k}" aria-pressed="${d.origen !== "libre" && esq === k}" ${d.origen === "libre" ? "disabled" : ""}>${ESQUEMAS[k]}</button>`).join("");
  }
  let turno = 0;
  function pintarFlyer() {
    const p = S.pub;
    if (!p || !p.pieza || S.vista !== "pub") return Promise.resolve();
    const d = p.diseno, mio = ++turno;
    if (d.origen === "plantilla" && !Plantillas.apta(d.plantilla, p.pieza, p.fotos.length)) d.plantilla = Plantillas.elegir(Object.assign({}, p.pieza, { plantilla: d.plantilla }), p.fotos.length);
    const x = contexto();
    pintarBarras(); escalar();
    const cod = d.origen === "libre" && d.libre ? d.libre.codigo : Plantillas.codigo(d.plantilla, p.pieza, x);
    if (document.activeElement !== $("#codigo")) $("#codigo").value = cod;
    return Iconos.listo.then(() => Render.montar($("#flyer"), cod, x, {
      editable: true,
      alEditar: el => {
        if (mio !== turno || !el || d.origen !== "plantilla") return;
        const campo = el.getAttribute("data-c"); if (!campo) return;
        ponerCampo(p.pieza, campo, el.innerText.replace(/\s+/g, " ").trim());
        if (campo === "titulo") { const m = el.querySelector("mark"); p.pieza.destacado = m ? m.innerText.trim() : ""; }
        pintarCampos(true); guardarAbierta();
      },
      alSalir: el => {
        if (mio !== turno) return;
        if (d.origen === "libre") { d.libre.codigo = Render.desmontar($("#flyer")); $("#codigo").value = d.libre.codigo; guardarAbierta(); }
        else if (el && el.getAttribute && el.getAttribute("data-c") && !el.innerText.trim()) pintarFlyer(); // quedó vacío: se saca de la placa
      }
    }));
  }
  function ponerCampo(obj, ruta, valor) {
    const partes = ruta.split(".");
    for (let i = 0; i < partes.length - 1; i++) { obj = obj[partes[i]]; if (obj == null) return; }
    obj[partes[partes.length - 1]] = valor;
  }

  /* ---------------- Publicación: textos, fecha y cambios ---------------- */
  function pintarCampos(soloValores) {
    const p = S.pub, caja = $("#campos-pieza");
    if (!soloValores || !caja.children.length) {
      caja.innerHTML = CAMPOS.map(c => `<label>${c[1]}<input data-campo="${c[0]}"></label>`).join("") + `<label id="lbl-foto">Foto principal<select data-campo="foto"></select></label>`;
    }
    CAMPOS.forEach(c => { const i = caja.querySelector(`[data-campo="${c[0]}"]`); if (i !== document.activeElement) i.value = p.pieza[c[0]] || ""; });
    const sel = caja.querySelector('[data-campo="foto"]');
    sel.innerHTML = p.fotos.map((f, i) => `<option value="${i + 1}">Foto ${i + 1}${f.nota ? " · " + esc(f.nota) : ""}</option>`).join("");
    sel.value = p.pieza.foto || 1;
    $("#lbl-foto").hidden = p.fotos.length < 2 || ["catalogo", "anuncio", "saludo"].indexOf(p.diseno.plantilla) >= 0;
  }
  function pintarCuentaIg() {
    const t = S.pub.textos, n = (t.instagram + "\n\n" + t.hashtags.join(" ")).length, c = $("#ig-cuenta");
    c.textContent = S.pub.tipo === "historia" ? "Las historias no llevan texto abajo: lo importante va en la imagen. Este texto sirve si también la subís como post."
      : n > C.limiteInstagram ? "Es muy largo para Instagram: sobran " + (n - C.limiteInstagram) + " letras." : "";
  }
  function pintarCuando() {
    const p = S.pub, hoy = F.hoy();
    $("#pub-estado").textContent = p.publicada ? "Ya está publicada." : p.fecha ? "Programada para el " + F.larga(p.fecha) + " (" + F.relativa(p.fecha) + ")." : "Todavía no tiene día. Elegí cuándo la querés publicar.";
    const rapidas = [[hoy, "Hoy"], [F.sumar(hoy, 1), "Mañana"], ["", "Sin fecha"]];
    $("#cuando-rapido").innerHTML = rapidas.map(r => `<button type="button" data-cuando="${r[0]}" aria-pressed="${(p.fecha || "") === r[0]}">${r[1]}</button>`).join("");
    $("#pub-fecha").value = p.fecha || ""; $("#pub-fecha").min = hoy;
    $("#btn-publicada").innerHTML = p.publicada ? "Marcar como no publicada" : '<i class="fa-solid fa-check" aria-hidden="true"></i> Ya la publiqué';
  }
  function pintarPub() {
    const p = S.pub, t = p.textos;
    $("#txt-instagram").value = t.instagram; $("#txt-hashtags").value = t.hashtags.join(" "); $("#txt-whatsapp").value = t.whatsapp;
    $("#cambio-texto").value = "";
    $("#chips-cambio").innerHTML = ["Más corto", "Más divertido", "Más formal", "Otro título"].map(c => `<button type="button" data-cambio="${c}">${c}</button>`).join("");
    const r = $("#pub-respuesta"); r.hidden = !S.respuesta; r.textContent = S.respuesta || "";
    if (S.respuesta) $("#cambio-texto").placeholder = "Por ejemplo: sumá que hay envíos";
    $("#avisos").hidden = true;
    pintarCuentaIg(); pintarCampos(); pintarCuando(); pintarLogosPub(); pintarFlyer();
  }

  function pedirCambio(texto) {
    texto = String(texto || "").trim();
    const p = S.pub;
    if (!texto || S.ocupado) return;
    if (!IA.activa()) return toast(SIN_IA);
    p.chat.push({ rol: "usuario", texto });
    espera("Aplicando el cambio…");
    IA.redactar(S.neg, p).then(d => {
      const ok = aplicar(p, d);
      S.respuesta = (d.mensaje || (ok ? "Listo." : "")) + (!ok && (d.preguntas || []).length ? " " + d.preguntas.join(" ") : "");
      return (ok ? fondoAuto(p) : Promise.resolve()).then(() => {
        espera(""); guardarPub(p);
        if (S.pub === p && S.vista === "pub") { pintarPub(); window.scrollTo(0, 0); }
      });
    }).catch(e => { espera(""); p.chat.pop(); toast("No pude aplicar el cambio (" + e.message + ")."); });
  }

  function disenarConIA() {
    const p = S.pub, d = p.diseno;
    if (S.ocupado || !p.pieza) return;
    if (!IA.activa()) return toast(SIN_IA);
    S.ocupado = true;
    $("#velo").hidden = false; $("#velo-texto").textContent = "Diseñando…";
    $("#escenario").scrollIntoView({ block: "center" });
    const x = Object.assign(contexto(), { vars: Negocios.variables(S.neg, "claro") });
    Diseno.generar(p, x, t => { $("#velo-texto").textContent = t; }).then(r => {
      if (S.pub !== p) return;
      d.libre = { codigo: r.codigo, formato: d.formato };
      if (r.prolijo) { d.origen = "libre"; toast("Listo: diseño nuevo."); }
      else toast("El diseño nuevo no quedó prolijo: dejé el anterior.");
      guardarPub(p);
      return pintarFlyer().then(() => {
        const lista = r.prolijo ? r.problemas : Diseno.graves(r.problemas), a = $("#avisos");
        a.hidden = !lista.length;
        if (lista.length) a.innerHTML = (r.prolijo ? "Revisá esto en el diseño nuevo:" : "La propuesta quedó guardada en «Cambiar el diseño», pero tiene problemas:") + "<ul>" + lista.map(q => "<li>" + esc(q) + "</li>").join("") + "</ul>";
      });
    }).catch(e => toast("No se pudo hacer el diseño (" + e.message + ").")).then(() => { S.ocupado = false; $("#velo").hidden = true; });
  }

  function descargar() {
    const x = contexto(), b = $("#btn-descargar");
    b.disabled = true;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    Render.exportar($("#flyer"), x).then(canvas => new Promise(ok => canvas.toBlob(ok, "image/png"))).then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = slug(S.neg.nombre) + "-" + slug(S.pub.pieza.titulo) + "-" + (S.pub.tipo === "historia" ? "historia" : "post") + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Imagen guardada en tus descargas.");
    }).catch(e => toast(e.message || "No se pudo guardar la imagen.")).then(() => { b.disabled = false; });
  }

  /* ---------------- Eventos ---------------- */
  function eventos() {
    window.addEventListener("hashchange", () => mostrar(location.hash.slice(1)));
    $("#btn-volver").addEventListener("click", volver);
    $("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-ir]"); if (b) ir(b.dataset.ir); });

    // Acciones de las listas (inicio, calendario, negocio)
    $("#contenido").addEventListener("click", e => {
      const b = e.target.closest("[data-accion]"); if (!b) return;
      const a = b.dataset.accion;
      if (a === "crear") empezar("una");
      else if (a === "planificar") empezar("plan");
      else if (a === "abrir") abrir(b.dataset.id);
      else if (a === "saludo") { if (!IA.activa()) return toast(SIN_IA); prepararSaludo(b.dataset.clave); }
      else if (a === "nueva-fecha") abrirFecha();
      else if (a === "borrar-fecha") {
        const f = S.neg.fechas.filter(x => x.id === b.dataset.id)[0];
        if (f && confirm("¿Quitar «" + f.nombre + "» de tus fechas?")) { S.neg.fechas = S.neg.fechas.filter(x => x !== f); guardarNegocios(); pintarNegocio(); }
      }
      else if (a === "borrar-logo") {
        if (confirm("¿Quitar este logo?")) { S.neg.logos = S.neg.logos.filter(l => l.id !== b.dataset.id); guardarNegocios(); pintarNegocio(); }
      }
    });

    // Micrófonos
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-mic]"); if (!b) return;
      if (!IA.activa() && !mic) return toast(SIN_IA);
      const cual = b.dataset.mic;
      dictar(b, t => {
        if (cual === "crear") { sumarTexto("#crear-texto", t); toast("Anotado. Revisalo y tocá el botón de abajo."); }
        else if (cual === "plan") sumarTexto("#plan-texto", t);
        else if (cual === "cambio") pedirCambio(t);
        else if (cual === "fecha") {
          espera("Anotando la fecha…");
          IA.fecha(t).then(r => {
            const f = $("#form-fecha");
            if (r.nombre) f.elements.nombre.value = r.nombre;
            if (r.dia) f.elements.dia.value = r.dia;
            if (r.mes) f.elements.mes.value = r.mes;
            f.elements.avisar.value = r.avisar; if (r.nota) f.elements.nota.value = r.nota;
            toast(r.dia && r.mes ? "Fijate si está bien y tocá Guardar." : "No entendí el día. Completalo a mano.");
          }).catch(() => toast("No pude anotarla. Completala a mano.")).then(() => espera(""));
        }
      });
    });

    // Mi negocio
    $("#sel-negocio").addEventListener("change", e => { elegirNegocio(e.target.value); pintarNegocio(); toast("Ahora estás en " + S.neg.nombre + "."); });
    $("#btn-nuevo-negocio").addEventListener("click", () => {
      const n = Negocios.nuevo(); n.nombre = "Negocio nuevo";
      S.negocios.push(n); guardarNegocios(); elegirNegocio(n.id); pintarNegocio();
      $("#form-negocio").elements.nombre.focus(); $("#form-negocio").elements.nombre.select();
    });
    $("#form-negocio").addEventListener("submit", guardarNegocio);
    $("#btn-logo").addEventListener("click", () => $("#archivo-logo").click());
    $("#archivo-logo").addEventListener("change", e => {
      const f = e.target.files[0]; e.target.value = "";
      if (f) leerImagen(f, 500, "png").then(d => {
        S.neg.logos.push({ id: "logo-" + Date.now().toString(36), nombre: S.neg.logos.length ? "" : S.neg.nombre, data: d });
        guardarNegocios(); pintarNegocio(); toast("Logo agregado.");
      }).catch(() => toast("No pude abrir esa imagen."));
    });
    $("#lista-logos").addEventListener("input", e => { const i = e.target.dataset.logoNombre; if (i != null) { S.neg.logos[+i].nombre = e.target.value.trim(); guardarNegocios(); } });
    $("#btn-borrar-negocio").addEventListener("click", () => {
      if (!confirm("¿Eliminar «" + S.neg.nombre + "» y todas sus publicaciones?")) return;
      const id = S.neg.id;
      mias().forEach(e => Almacen.borrar("pub:" + e.id));
      S.indice = S.indice.filter(e => e.negocioId !== id); Almacen.guardar("indice", S.indice);
      S.negocios = S.negocios.filter(n => n.id !== id); guardarNegocios();
      elegirNegocio(S.negocios[0].id); pintarNegocio();
    });

    // Fecha importante
    $("#btn-cancelar-fecha").addEventListener("click", () => $("#dlg-fecha").close());
    $("#form-fecha").addEventListener("submit", guardarFecha);

    // Crear
    $("#btn-sumar-foto").addEventListener("click", () => $("#archivo-fotos").click());
    $("#archivo-fotos").addEventListener("change", e => { sumarFotos(e.target.files); e.target.value = ""; });
    $("#fotos").addEventListener("click", e => { const q = e.target.closest("[data-quitar]"); if (q) { S.b.fotos.splice(+q.dataset.quitar, 1); pintarFotos(); } });
    $("#fotos").addEventListener("input", e => { const n = e.target.dataset.nota; if (n != null) S.b.fotos[+n].nota = e.target.value.trim(); });
    $("#crear-texto").addEventListener("input", e => { if (S.b) S.b.texto = e.target.value; });
    $("#ritmos").addEventListener("click", e => { const b = e.target.closest("[data-ritmo]"); if (b) { S.b.porSemana = +b.dataset.ritmo; pintarCrear(); } });
    $("#btn-armar").addEventListener("click", armar);
    document.addEventListener("dragover", e => e.preventDefault());
    document.addEventListener("drop", e => { e.preventDefault(); if (S.vista === "crear" && e.dataTransfer.files.length) sumarFotos(e.dataTransfer.files); });

    // Plan
    $("#plan-lista").addEventListener("change", e => {
      const i = e.target.dataset.planFecha;
      if (i != null && F.valida(e.target.value)) { const it = S.plan.items[+i]; it.fecha = e.target.value; $("#plan-dia-" + i).textContent = mayus(F.larga(it.fecha)) + " · " + F.relativa(it.fecha); }
    });
    $("#plan-lista").addEventListener("click", e => { const q = e.target.closest("[data-plan-quitar]"); if (q) { S.plan.items.splice(+q.dataset.planQuitar, 1); pintarPlan(); } });
    $("#btn-replanificar").addEventListener("click", () => { const t = $("#plan-texto").value.trim(); if (!t) return toast("Contame qué querés cambiar."); if (!S.ocupado) planificar(t); });
    $("#btn-aceptar-plan").addEventListener("click", aceptarPlan);

    // Publicación
    $("#formatos").addEventListener("click", e => {
      const b = e.target.closest("[data-formato]"); if (!b) return;
      const p = S.pub, d = p.diseno;
      d.formato = b.dataset.formato; p.tipo = d.formato === "9:16" ? "historia" : "post";
      if (d.origen === "libre" && d.libre.formato !== d.formato) { d.origen = "plantilla"; toast("El diseño de la IA era para otro formato: volví al modelo anterior."); }
      pintarFlyer(); pintarCuentaIg(); guardarAbierta();
    });
    $("#plantillas").addEventListener("click", e => {
      const b = e.target.closest("[data-plantilla]"); if (!b || b.disabled) return;
      const p = S.pub, d = p.diseno, id = b.dataset.plantilla;
      if (id === "libre") { d.formato = d.libre.formato; p.tipo = d.formato === "9:16" ? "historia" : "post"; d.origen = "libre"; }
      else { d.origen = "plantilla"; if (d.plantilla !== id) d.esquema = null; d.plantilla = id; p.pieza.plantilla = id; }
      $("#avisos").hidden = true; pintarFlyer(); pintarCampos(true); guardarAbierta();
    });
    $("#esquemas").addEventListener("click", e => { const b = e.target.closest("[data-esquema]"); if (b && !b.disabled) { S.pub.diseno.esquema = b.dataset.esquema; pintarFlyer(); guardarAbierta(); } });
    $("#btn-diseno-ia").addEventListener("click", disenarConIA);

    // Logos y foto de fondo
    $("#pub-logos").addEventListener("click", e => {
      const p = S.pub, l = e.target.closest("[data-logo]"), inv = e.target.closest("[data-invitado]");
      if (l) { const ids = logosElegidos(p).slice(), i = ids.indexOf(l.dataset.logo); if (i >= 0) ids.splice(i, 1); else ids.push(l.dataset.logo); p.logos = ids; }
      else if (inv) p.invitados.splice(+inv.dataset.invitado, 1);
      else return;
      pintarLogosPub(); pintarFlyer(); guardarAbierta();
    });
    $("#btn-logo-invitado").addEventListener("click", () => $("#archivo-invitado").click());
    $("#archivo-invitado").addEventListener("change", e => {
      const f = e.target.files[0], p = S.pub; e.target.value = "";
      if (f) leerImagen(f, 500, "png").then(d => { p.invitados = (p.invitados || []).concat([{ data: d }]); pintarLogosPub(); pintarFlyer(); guardarAbierta(); }).catch(() => toast("No pude abrir esa imagen."));
    });
    $("#btn-fondo-otra").addEventListener("click", () => {
      const p = S.pub;
      if (S.ocupado) return;
      if (p.fondos && p.fondos.length) cambiarFondo(probarFondo(p, p.fondo ? (p.fondoN + 1) % p.fondos.length : p.fondoN, 3), "No pude bajar otra foto. Probá con una tuya.");
      else if (p.pieza.fondo_busqueda) cambiarFondo(buscarFondos(p), "No encontré una foto que sirva. Probá con una tuya.");
      else toast("Para esta publicación no tengo qué buscar. Subí una foto tuya.");
    });
    $("#btn-fondo-mia").addEventListener("click", () => $("#archivo-fondo").click());
    $("#archivo-fondo").addEventListener("change", e => {
      const f = e.target.files[0], p = S.pub; e.target.value = "";
      if (f) cambiarFondo(leerImagen(f, 1400).then(Fotos.suave).then(d => { p.fondo = { data: d, credito: null }; p.sinFondo = false; return true; }), "No pude abrir esa imagen.");
    });
    $("#btn-fondo-sin").addEventListener("click", () => { const p = S.pub; p.fondo = null; p.sinFondo = true; pintarFlyer(); guardarAbierta(); });
    $("#btn-fondo-credito").addEventListener("click", () => {
      const p = S.pub, c = p.fondo && p.fondo.credito; if (!c) return;
      const linea = "Foto de fondo: " + c.autor + " (" + c.licencia + ", " + c.fuente + ")";
      if (p.textos.instagram.indexOf(linea) < 0) { p.textos.instagram = p.textos.instagram.trim() + "\n\n" + linea; $("#txt-instagram").value = p.textos.instagram; pintarCuentaIg(); guardarAbierta(); }
      toast("Crédito agregado al texto.");
    });
    $("#btn-descargar").addEventListener("click", descargar);
    $("#btn-aplicar-codigo").addEventListener("click", () => {
      const d = S.pub.diseno;
      d.libre = { codigo: $("#codigo").value, formato: d.formato }; d.origen = "libre";
      pintarFlyer(); guardarAbierta(); toast("Diseño actualizado.");
    });
    window.addEventListener("resize", debounce(escalar, 100));

    $("#txt-instagram").addEventListener("input", e => { S.pub.textos.instagram = e.target.value; pintarCuentaIg(); guardarAbierta(); });
    $("#txt-hashtags").addEventListener("input", e => { S.pub.textos.hashtags = e.target.value.split(/\s+/).filter(Boolean); pintarCuentaIg(); guardarAbierta(); });
    $("#txt-whatsapp").addEventListener("input", e => { S.pub.textos.whatsapp = e.target.value; guardarAbierta(); });
    const repintar = debounce(() => { pintarFlyer(); }, 250);
    $("#campos-pieza").addEventListener("input", e => {
      const c = e.target.dataset.campo; if (!c) return;
      const p = S.pub;
      p.pieza[c] = c === "foto" ? +e.target.value : e.target.value;
      if (p.diseno.origen === "libre") { p.diseno.origen = "plantilla"; toast("Volví al modelo anterior para aplicar el cambio."); }
      repintar(); guardarAbierta();
    });
    $("#v-pub").addEventListener("click", e => {
      const cop = e.target.closest("[data-copiar]"), cam = e.target.closest("[data-cambio]"), cu = e.target.closest("[data-cuando]");
      if (cop) {
        const t = S.pub.textos, texto = cop.dataset.copiar === "instagram" ? t.instagram + "\n\n" + t.hashtags.join(" ") : t.whatsapp;
        navigator.clipboard.writeText(texto).then(() => toast("Texto copiado. Pegalo en " + (cop.dataset.copiar === "instagram" ? "Instagram" : "WhatsApp") + "."), () => toast("No se pudo copiar. Seleccioná el texto y copialo a mano."));
      }
      if (cam) pedirCambio(cam.dataset.cambio === "Otro título" ? "Proponé otro título para la imagen" : "Hacelo " + cam.dataset.cambio.toLowerCase());
      if (cu) ponerFecha(cu.dataset.cuando || null);
    });
    $("#btn-cambio").addEventListener("click", () => { const t = $("#cambio-texto").value.trim(); if (!t) return toast("Contame qué querés cambiar."); pedirCambio(t); });
    $("#pub-fecha").addEventListener("change", e => { if (!e.target.value || F.valida(e.target.value)) ponerFecha(e.target.value || null); });
    $("#btn-publicada").addEventListener("click", () => {
      const p = S.pub;
      p.publicada = !p.publicada;
      if (p.publicada && !p.fecha) p.fecha = F.hoy();
      guardarPub(p); pintarCuando();
      if (p.publicada) toast("¡Bien! Quedó anotada como publicada.");
    });
    $("#btn-borrar-pub").addEventListener("click", () => {
      if (!confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
      const id = S.pub.id; S.pub = null;
      borrarPub(id).then(() => { toast("Publicación eliminada."); ir(S.tab); });
    });
  }
  function ponerFecha(f) {
    const p = S.pub;
    p.fecha = f; if (!f) p.publicada = false;
    guardarPub(p); pintarCuando();
    toast(f ? "Programada para el " + F.larga(f) + "." : "Quedó como borrador, sin fecha.");
  }

  /* ---------------- Inicio de la app ---------------- */
  Promise.all([Almacen.leer("negocios"), Almacen.leer("indice"), Almacen.leer("actual")]).then(r => {
    S.negocios = r[0] && r[0].length ? r[0] : Negocios.ejemplos();
    S.negocios.forEach(n => {
      if (!Array.isArray(n.fechas)) n.fechas = F.basicas();
      if (!Array.isArray(n.logos)) n.logos = n.logo ? [{ id: "logo-0", nombre: n.nombre, data: n.logo }] : [];
    });
    S.indice = (r[1] || []).map(e => Object.assign(e, { preparando: false })); // lo que quedó a medio escribir se retoma a mano
    if (!r[0]) guardarNegocios();
    elegirNegocio(r[2]);
    eventos();
    mostrar(TABS.indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : "inicio");
    if (location.hash && TABS.indexOf(location.hash.slice(1)) < 0) history.replaceState(null, "", "#inicio");
  }).catch(e => { console.error(e); toast("No se pudo iniciar: " + e.message); });
})();
