/* =========================================================
   IA: textos de la publicación (/ia/chat, perfil "redaccion") y
   transcripción del audio (/ia/transcribe), por el mismo proxy que
   MUNI_NOTICIAS. El proxy sólo acepta texto: la IA no ve las fotos, sabe
   lo que el cliente cuenta de cada una (por audio, por escrito o en la
   nota de la foto).
   ========================================================= */
/* Costo real de cada pedido (OpenRouter lo devuelve en usage.cost, en USD). Se acumula por día en este navegador. */
window.Costos = (function () {
  const KEY = "vidriera-costos";
  const hoy = () => new Date().toISOString().slice(0, 10);
  const cero = () => ({ dia: hoy(), total: 0, redaccion: 0, diseno: 0, pedidos: 0 });
  function leer() { try { const c = JSON.parse(localStorage.getItem(KEY) || "{}"); return c.dia === hoy() ? c : cero(); } catch (e) { return cero(); } }
  const escuchas = [];
  return {
    sumar(tipo, usage) {
      if (!usage || typeof usage.cost !== "number") return;
      const c = leer();
      c.total += usage.cost; c[tipo] = (c[tipo] || 0) + usage.cost; c.pedidos++;
      try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* nada */ }
      escuchas.forEach(f => f(c));
    },
    hoy: leer,
    alCambiar(f) { escuchas.push(f); }
  };
})();

window.IA = (function () {
  const C = window.VID_CONFIG;
  const MAX_HISTORIAL = 16;
  const activa = C.origenesIA.indexOf(location.host) >= 0 || /[?&]ia=1\b/.test(location.search);

  function post(ruta, cuerpo, ms) {
    const ctrl = new AbortController();
    const corte = setTimeout(() => ctrl.abort(), ms || 90000);
    return fetch(C.apiBase + ruta, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) })
      .then(r => {
        clearTimeout(corte);
        if (!r.ok) return r.json().catch(() => ({})).then(j => { const e = new Error(j.error || (ruta + " " + r.status)); e.status = r.status; throw e; });
        return r.json();
      }, e => { clearTimeout(corte); throw e.name === "AbortError" ? new Error("La IA tardó demasiado en responder.") : e; });
  }

  /* ---------------- Prompt ---------------- */
  // pub: { fotos: [{ nota }], pieza, textos }
  function prompt(neg, pub) {
    const hoy = new Date();
    const fotos = pub.fotos.length
      ? pub.fotos.map((f, i) => "- Foto " + (i + 1) + ": " + (f.nota ? f.nota : "(sin nota; fijate si el cliente la describe en el mensaje)")).join("\n")
      : "(ninguna: la pieza tiene que ser \"anuncio\" o \"saludo\", que no llevan foto)";
    const esHistoria = pub.tipo === "historia";
    const borrador = pub.pieza ? JSON.stringify({ instagram: pub.textos.instagram, hashtags: pub.textos.hashtags, whatsapp: pub.textos.whatsapp, pieza: pub.pieza }) : "(todavía no hay)";
    return [
      "Sos community manager y redactor/a publicitario/a de un comercio argentino. El dueño o la dueña te manda fotos de sus productos y te cuenta (casi siempre por audio, con muletillas y desordenado) qué quiere publicar. Vos devolvés la publicación lista para Instagram: el texto del posteo, los hashtags, una versión corta para WhatsApp y los textos que van escritos sobre el flyer.",
      "Hoy es " + hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ".",
      "EL NEGOCIO (escribís como si fueras el negocio, en primera persona del plural):\n" + Negocios.paraPrompt(neg),
      "ESTA PUBLICACIÓN: " + (esHistoria ? "una HISTORIA de Instagram (vertical, se ve 5 segundos: en el flyer, título de 2 a 4 palabras y subtítulo muy corto o vacío; el texto de Instagram, de 1 a 3 líneas)" : "un POST del feed de Instagram") +
        (pub.fecha ? ". Se publica el " + Fechas.larga(pub.fecha) + " (" + pub.fecha + "): escribila para que se lea ese día (no digas \"mañana\" ni \"en 3 días\" contando desde hoy)." : "."),
      "FOTOS QUE SUBIÓ (no las podés ver; sabés lo que te dicen de cada una; \"la primera\", \"la segunda\"… siguen este orden):\n" + fotos,
      [
        "REGLAS:",
        "- Español rioplatense con voseo, natural, como escribe una marca local querida. Respetá el tono de la marca.",
        "- Nunca inventes datos: precios, descuentos, stock, talles, colores, medios de pago, envíos, fechas ni horarios. Usá sólo lo que te dijo el cliente y los datos del negocio. Si no hay precio, no pongas precio (ni \"consultá precio\" en el flyer).",
        "- Precios en formato argentino: \"$ 12.500\". Descuentos como \"30% OFF\", \"2x1\", \"3 cuotas sin interés\".",
        "- Corregí errores evidentes de la transcripción (marcas, nombres de productos) sólo si estás seguro/a.",
        "- Si no se entiende qué quiere promocionar, devolvé estado \"falta_info\" con 1 o 2 preguntas cortas. Si se entiende, redactá (estado \"listo\") aunque falten detalles: no preguntes por datos opcionales.",
        "- Saludos y fechas especiales (feriados, Navidad, Día de la Madre, aniversarios del negocio o de la institución, agradecimientos): cálido, cercano y con un poco de chamuyo del bueno. Agradecé a los clientes o a la comunidad, nombrá la fecha y, si es un aniversario, los años que cumple. No vendas de forma directa ni inventes promociones; como mucho, una invitación suave a pasar o a escribir.",
        "- Si ya hay un BORRADOR ACTUAL y pide cambios, devolvé todo completo aplicando sólo lo pedido y conservando el resto tal cual (puede haberlo corregido a mano)."
      ].join("\n"),
      [
        "TEXTO DE INSTAGRAM (\"instagram\"): es publicidad, no una noticia.",
        "- Primera línea: un gancho de hasta 80 caracteres que frene el scroll (una pregunta, un beneficio o una imagen concreta). Es lo único que se ve antes del \"… más\".",
        "- Después, 2 a 5 líneas cortas separadas por saltos de línea: qué es, por qué conviene o qué lo hace especial (beneficios concretos antes que adjetivos), y los datos que haya (precio, promo, talles, hasta cuándo).",
        "- Cierre con UN llamado a la acción claro usando un canal real del negocio (WhatsApp, mensaje directo, dirección y horario).",
        "- 2 a 5 emojis que sumen, nunca varios seguidos (si listás varios productos, puede ir uno por producto). Sin MAYÚSCULAS sostenidas, sin signos repetidos (\"!!!\").",
        "- Evitá los clichés: \"imperdible\", \"no te lo pierdas\", \"la mejor calidad al mejor precio\", \"corré que vuelan\", \"llegó lo que estabas esperando\".",
        "- Entre 250 y 700 caracteres. No pongas hashtags ni links dentro del texto.",
        "\"hashtags\": de 6 a 10, sin repetir: los propios del negocio, el producto, el rubro y la ciudad o zona. Nada genérico tipo #love #instagood #like4like.",
        "\"whatsapp\": 2 a 4 líneas para estados o difusión, más directo, con *negrita de WhatsApp* en el producto o la promo y un cierre tipo \"Escribinos por acá\"."
      ].join("\n"),
      [
        "FLYER (\"pieza\"): los textos que van escritos sobre la imagen. El diseño lo arman plantillas; vos elegís la plantilla y escribís textos MUY cortos. Sin emojis.",
        "- plantilla: \"destacado\" (un producto con su foto, con o sin precio), \"oferta\" (hay descuento o promo: lleva el descuento en grande), \"catalogo\" (2 a 6 productos, cada uno con su foto, nombre y precio), \"novedad\" (lanzamiento, ingreso o nueva temporada), \"anuncio\" (sin foto: horarios, avisos, sorteos, o cuando no subió fotos), \"saludo\" (sin foto: fechas especiales, feriados, aniversarios y agradecimientos; título emotivo y corto, sin precio).",
        "- etiqueta: 1 a 3 palabras (ej. \"Nuevo ingreso\", \"Promo finde\", \"Día del Niño\").",
        "- titulo: 2 a 6 palabras, con gancho, como en un cartel. destacado: 1 a 3 palabras seguidas del título, copiadas igual, que van en otro color.",
        "- subtitulo: una oración de hasta 14 palabras; marcá con **doble asterisco** lo más importante. Puede quedar vacío.",
        "- precio, precio_antes, descuento: sólo si los dijo. cta: hasta 4 palabras (ej. \"Pedilo por WhatsApp\"); opcional.",
        "- Si subió 2 o más fotos, TODAS tienen que servir: si son productos distintos, usá \"catalogo\". Si son el mismo producto desde distintos ángulos, elegí la plantilla que corresponda (el sistema arma un carrusel con todas).",
        "- foto: número de la foto principal. productos: OBLIGATORIO si hay 2 o más fotos, uno por CADA foto (sin saltear ninguna), sea cual sea la plantilla, porque con eso se arma el catálogo o el carrusel: [{\"foto\":1,\"nombre\":\"hasta 4 palabras\",\"precio\":\"\",\"detalle\":\"\"}]. Si dos fotos son del mismo producto, igual va una entrada por foto. detalle (hasta 5 palabras) sólo si agrega un dato que no está en el nombre (medida, cantidad, material, sabor); si no, vacío.",
        "- fondo_busqueda (sólo para \"anuncio\" y \"saludo\"): 2 a 4 palabras en español para buscar en un banco libre una foto real que vaya de fondo, desenfocada (un objeto o una escena concreta y linda, sin personas reconocibles; ej. \"árbol de navidad luces\", \"torta de chocolate\", \"estantes con libros\"). fondo_busqueda_en: lo mismo en inglés.",
        "- items (sólo para \"anuncio\", hasta 4): [{\"icono\":\"\",\"texto\":\"hasta 8 palabras\"}]. icono, uno de: " + Iconos.lista.join(", ") + "."
      ].join("\n"),
      "BORRADOR ACTUAL:\n" + borrador,
      [
        "FORMATO DE RESPUESTA: respondé SOLO un objeto JSON válido, sin texto antes ni después ni bloques de código:",
        '{"estado":"listo"|"falta_info","mensaje":"1 o 2 oraciones para el dueño del negocio, hablándole de vos y en primera persona del singular (sos su asistente): qué armaste o qué necesitás saber. Si subió varias fotos, decile qué hiciste con ellas","preguntas":["..."],',
        '"instagram":"","hashtags":["#..."],"whatsapp":"",',
        '"pieza":{"plantilla":"","etiqueta":"","titulo":"","destacado":"","subtitulo":"","precio":"","precio_antes":"","descuento":"","cta":"","foto":1,"productos":[],"items":[],"fondo_busqueda":"","fondo_busqueda_en":""}}',
        "Con estado \"falta_info\" alcanza con estado, mensaje y preguntas."
      ].join("\n")
    ].join("\n\n");
  }

  // Extrae el JSON aunque el modelo lo envuelva en ```json o agregue texto.
  function parsear(texto) {
    const t = String(texto || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const ini = t.indexOf("{"), fin = t.lastIndexOf("}");
    if (ini < 0 || fin <= ini) return null;
    try { return JSON.parse(t.slice(ini, fin + 1)); } catch (e) { return null; }
  }

  const sinEmojis = t => String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();
  const texto = t => typeof t === "string" ? t.trim() : (t == null ? "" : String(t));

  /* El modelo a veces se equivoca en lo fijo: se corrige acá para que no rompa la pantalla. */
  function corregir(d, nFotos) {
    const hay = d.pieza && texto(d.pieza.titulo);
    if (d.estado !== "falta_info" && d.estado !== "listo") d.estado = hay ? "listo" : "falta_info";
    if (d.estado === "listo" && !hay) d.estado = "falta_info";
    d.mensaje = texto(d.mensaje);
    d.preguntas = Array.isArray(d.preguntas) ? d.preguntas.map(texto).filter(Boolean).slice(0, 3) : [];
    if (d.estado !== "listo") return d;

    d.instagram = texto(d.instagram).replace(/(^|\s)#[\wáéíóúñü]+/gi, "").trim();
    d.whatsapp = texto(d.whatsapp);
    const vistos = {};
    d.hashtags = (Array.isArray(d.hashtags) ? d.hashtags : String(d.hashtags || "").split(/\s+/))
      .map(h => "#" + String(h).replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ]/g, "")).filter(h => h.length > 2 && !vistos[h.toLowerCase()] && (vistos[h.toLowerCase()] = 1)).slice(0, 12);

    const p = d.pieza, numFoto = n => Math.min(Math.max(1, parseInt(n, 10) || 1), Math.max(1, nFotos));
    ["etiqueta", "titulo", "destacado", "subtitulo", "precio", "precio_antes", "descuento", "cta"].forEach(k => { p[k] = sinEmojis(texto(p[k])); });
    p.titulo = p.titulo.replace(/[.]$/, "");
    if (p.destacado && p.titulo.toLowerCase().indexOf(p.destacado.toLowerCase()) < 0) p.destacado = "";
    p.foto = numFoto(p.foto);
    p.productos = (Array.isArray(p.productos) ? p.productos : []).filter(x => x && texto(x.nombre)).slice(0, 6)
      .map((x, i) => ({ foto: numFoto(x.foto || i + 1), nombre: sinEmojis(texto(x.nombre)), precio: sinEmojis(texto(x.precio)), detalle: sinEmojis(texto(x.detalle)) }));
    p.items = (Array.isArray(p.items) ? p.items : []).filter(x => x && texto(x.texto)).slice(0, 5)
      .map(x => ({ icono: Iconos.lista.indexOf(x.icono) >= 0 ? x.icono : "check", texto: sinEmojis(texto(x.texto)) }));
    p.fondo_busqueda = sinEmojis(texto(p.fondo_busqueda)).slice(0, 60); p.fondo_busqueda_en = sinEmojis(texto(p.fondo_busqueda_en)).slice(0, 60);
    // Varias fotos del mismo producto no son un catálogo: van de a una (la app arma el carrusel).
    const nombres = {}; p.productos.forEach(x => { nombres[x.nombre.toLowerCase()] = 1; });
    if (p.plantilla === "catalogo" && p.productos.length > 1 && Object.keys(nombres).length === 1) p.plantilla = p.descuento ? "oferta" : "destacado";
    p.plantilla = Plantillas.elegir(p, nFotos);
    return d;
  }

  // historial: [{ rol: 'usuario'|'asistente', texto, crudo? }]
  function redactar(neg, pub) {
    const mensajes = [{ role: "system", content: prompt(neg, pub) }].concat(pub.chat.slice(-MAX_HISTORIAL).map(m =>
      ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.crudo || m.texto })));
    return post("/ia/chat", { messages: mensajes, perfil: "redaccion" }).then(j => {
      Costos.sumar("redaccion", j.usage);
      const contenido = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const datos = parsear(contenido);
      if (!datos) return { estado: "falta_info", mensaje: String(contenido || "No obtuve respuesta. Probá de nuevo.").trim(), preguntas: [], crudo: contenido };
      const d = corregir(datos, pub.fotos.length);
      d.crudo = JSON.stringify(datos);
      return d;
    });
  }

  /* ---------------- Plan de varias publicaciones ---------------- */
  // d: { fotos: [{ nota }], texto, porSemana, chat: [{ rol, texto, crudo? }] }
  function promptPlan(neg, d) {
    const hoy = Fechas.hoy(), dias = [];
    for (let i = 0; i < 21; i++) { const f = Fechas.sumar(hoy, i); dias.push(f + " " + Fechas.diaSemana(f)); }
    const fechas = Fechas.proximas(neg).filter(f => f.faltan <= 21).map(f => "- " + f.fecha + ": " + f.nombre + (f.nota ? " (" + f.nota + ")" : ""));
    return [
      "Sos community manager de un comercio argentino. El dueño o la dueña te manda varias fotos juntas y te cuenta (casi siempre por audio, desordenado) qué es cada una. Tu trabajo es armar el PLAN de publicaciones de Instagram de los próximos días: qué fotos van juntas, qué día y si es un post o una historia. Todavía no escribís los textos finales.",
      "EL NEGOCIO:\n" + Negocios.paraPrompt(neg),
      "CALENDARIO (hoy es " + hoy + "):\n" + dias.join(", "),
      fechas.length ? "FECHAS IMPORTANTES QUE SE VIENEN (aprovechalas si tienen que ver con lo que mandó):\n" + fechas.join("\n") : "",
      "FOTOS (no las podés ver; sabés lo que te dice de cada una; \"la primera\", \"la segunda\"… siguen este orden):\n" +
        d.fotos.map((f, i) => "- Foto " + (i + 1) + ": " + (f.nota || "(sin nota; fijate si la describe en el mensaje)")).join("\n"),
      [
        "CÓMO PLANIFICAR:",
        "- Ritmo pedido: unas " + d.porSemana + " publicaciones por semana, empezando hoy o mañana. No amontones todo en un día ni dejes más de 3 días sin nada.",
        "- Agrupá en una misma publicación las fotos que son del mismo tipo o se venden juntas (2 a 6 fotos = catálogo). Un producto estrella o una promo va solo.",
        "- Usá TODAS las fotos: antes de responder revisá que cada número, del 1 al " + d.fotos.length + ", esté en alguna publicación. Cada foto va en una sola publicación, salvo que convenga repetir una en una historia de recordatorio.",
        "- \"post\" para lo que tiene que quedar en el perfil (productos, catálogos, promos). \"historia\" para recordatorios, últimas unidades, un solo producto rápido o el día anterior a que termine una promo.",
        "- Elegí los días con criterio comercial (promos de finde el jueves o viernes; novedades a principio de semana; regalos unos días antes de la fecha) y contalo en \"motivo\" en una frase corta y en criollo.",
        "- No inventes datos. En \"idea\" copiá los datos que dio para esas fotos (qué son, precios, promos, talles), porque con eso se escribe después la publicación. En \"idea\" no nombres las fotos por número: decí qué producto es.",
        "- Si no sabés qué es alguna foto, igual armá el plan si podés; si no se entiende casi nada, devolvé estado \"falta_info\" y preguntá qué es cada foto que falta (nombralas por número).",
        "- Si ya propusiste un plan y pide cambios, devolvé el plan completo corregido."
      ].join("\n"),
      [
        "FORMATO DE RESPUESTA: respondé SOLO un objeto JSON válido, sin texto antes ni después ni bloques de código:",
        '{"estado":"listo"|"falta_info","mensaje":"1 o 2 oraciones para el dueño, hablándole de vos y en primera persona del singular: cómo lo organizaste o qué necesitás saber","preguntas":["..."],',
        '"publicaciones":[{"fecha":"AAAA-MM-DD","tipo":"post"|"historia","fotos":[1,2],"titulo":"2 a 5 palabras para el calendario","idea":"qué se comunica y con qué datos","motivo":"por qué ese día y por qué juntas"}],',
        '"fotos":{"1":"qué es la foto 1 con sus datos (precio, talles, promo), tal como lo dijo","2":"..."}}',
        "Ordená las publicaciones por fecha."
      ].join("\n")
    ].filter(Boolean).join("\n\n");
  }

  function planificar(neg, d) {
    const mensajes = [{ role: "system", content: promptPlan(neg, d) }].concat(d.chat.slice(-8).map(m =>
      ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.crudo || m.texto })));
    return pedirPlan(mensajes, d, false);
  }
  function pedirPlan(mensajes, d, reintento) {
    return post("/ia/chat", { messages: mensajes, perfil: "redaccion" }).then(j => {
      Costos.sumar("redaccion", j.usage);
      const contenido = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const r = parsear(contenido);
      if (!r) return { estado: "falta_info", mensaje: String(contenido || "No obtuve respuesta. Probá de nuevo.").trim(), preguntas: [], crudo: contenido };
      const hoy = Fechas.hoy(), n = d.fotos.length;
      r.crudo = JSON.stringify(r);
      r.mensaje = texto(r.mensaje);
      r.preguntas = Array.isArray(r.preguntas) ? r.preguntas.map(texto).filter(Boolean).slice(0, 4) : [];
      r.publicaciones = (Array.isArray(r.publicaciones) ? r.publicaciones : []).map(x => {
        const vistas = {};
        return {
          fecha: Fechas.valida(x.fecha) && x.fecha >= hoy ? x.fecha : hoy,
          tipo: x.tipo === "historia" ? "historia" : "post",
          fotos: (Array.isArray(x.fotos) ? x.fotos : []).map(Number).filter(i => i >= 1 && i <= n && !vistas[i] && (vistas[i] = 1)).slice(0, VID_CONFIG.maxFotos),
          titulo: sinEmojis(texto(x.titulo)) || "Publicación", idea: texto(x.idea), motivo: texto(x.motivo)
        };
      }).filter(x => x.idea || x.fotos.length).sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0).slice(0, 12);
      r.descripciones = {};
      if (r.fotos && typeof r.fotos === "object") Object.keys(r.fotos).forEach(k => { if (texto(r.fotos[k])) r.descripciones[parseInt(k, 10)] = texto(r.fotos[k]).slice(0, 200); });
      r.estado = r.publicaciones.length && r.estado !== "falta_info" ? "listo" : "falta_info";
      if (r.estado === "falta_info" && !r.mensaje) r.mensaje = "Necesito que me cuentes un poco más de las fotos.";
      // El modelo a veces deja fotos afuera: se le pide una vez que las sume.
      const usadas = {};
      r.publicaciones.forEach(x => x.fotos.forEach(i => { usadas[i] = 1; }));
      r.sinUsar = d.fotos.map((f, i) => i + 1).filter(i => !usadas[i]);
      if (r.estado === "listo" && r.sinUsar.length && !reintento) {
        return pedirPlan(mensajes.concat([{ role: "assistant", content: r.crudo },
          { role: "user", content: "Quedaron sin usar las fotos " + r.sinUsar.join(", ") + ". Rehacé el plan completo usando todas las fotos (sumá publicaciones o agrupalas en un catálogo), con el mismo formato JSON." }]), d, true);
      }
      return r;
    });
  }

  /* ---------------- Fecha importante dictada ---------------- */
  // "el 25 de febrero la biblioteca cumple 60 años, avisame tres días antes" → { nombre, dia, mes, avisar, nota }
  function fecha(dicho) {
    const sistema = "Te dictan una fecha importante para el calendario de un negocio o institución. Hoy es " + Fechas.hoy() + ". Respondé SOLO un objeto JSON: " +
      '{"nombre":"nombre corto de la fecha (ej. Aniversario de la biblioteca)","dia":1-31,"mes":1-12,"avisar":días antes para avisar (1, 3 o 7; si no dice, 3),"nota":"datos útiles para el saludo (ej. cumple 60 años); vacío si no hay"}. ' +
      "Si no se entiende el día o el mes, poné 0 en ese campo.";
    return post("/ia/chat", { messages: [{ role: "system", content: sistema }, { role: "user", content: dicho }], perfil: "redaccion" }).then(j => {
      Costos.sumar("redaccion", j.usage);
      const r = parsear(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || {};
      return { nombre: texto(r.nombre), dia: Math.min(31, Math.max(0, parseInt(r.dia, 10) || 0)), mes: Math.min(12, Math.max(0, parseInt(r.mes, 10) || 0)),
        avisar: [1, 3, 7].indexOf(+r.avisar) >= 0 ? +r.avisar : 3, nota: texto(r.nota) };
    });
  }

  function transcribir(b64wav) {
    return post("/ia/transcribe", { data: b64wav, format: "wav" }).then(j => String(j.text || "").trim());
  }

  return { activa: () => activa, redactar, planificar, fecha, transcribir, post };
})();
