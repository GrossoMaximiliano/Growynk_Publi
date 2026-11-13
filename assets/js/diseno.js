/* =========================================================
   Diseño libre con IA (adaptado de disenoHtml.js de MUNI_NOTICIAS).
   En vez de una plantilla, el modelo de texto (/ia/chat, perfil "diseno")
   escribe la composición en HTML+CSS con las reglas de la marca del
   negocio y una "dirección de arte" que rota para que no se repita.
   Después se revisa sola montada fuera de pantalla (firma visible, textos
   que no se salgan ni se pisen, contraste medido sobre los píxeles) y, si
   hay problemas, se le pide una corrección o se prueba otra dirección.
   ========================================================= */
window.Diseno = (function () {
  const KEY_RECIENTES = "vidriera-direcciones";
  const $$ = Render.$$;

  const DIRECCIONES = [
    { id: "bloque", foto: true, t: "Foto a sangre en todo el fondo; abajo un bloque de color sólido (sin transparencia) que ocupa entre un tercio y la mitad, con el borde superior recto o con una curva suave hecha con SVG. Título grande dentro del bloque y una etiqueta tipo píldora arriba a la izquierda sobre la foto." },
    { id: "tipografica", foto: true, t: "Composición tipográfica: el título enorme ocupa casi la mitad de la placa sobre fondo de color o papel; la foto va recortada en un círculo grande que se sale por un borde de la placa." },
    { id: "lateral", foto: true, t: "Foto en una franja lateral (45% del ancho) con el borde interno orgánico hecho con un path SVG o un border-radius grande; el texto en la otra mitad sobre fondo papel claro (var(--fondo))." },
    { id: "diagonal", foto: true, t: "Foto a sangre cruzada por una banda diagonal ancha de color sólido (transform: rotate de -6 a -10 grados) que contiene el título; el resto del texto en una caja sólida abajo." },
    { id: "tarjeta", foto: true, t: "Foto a sangre y una tarjeta de fondo blanco o var(--claro), esquinas redondeadas de 24 a 40px, apoyada abajo o en un costado, con el título, el subtítulo y el precio. Sombra suave y corta." },
    { id: "marco", foto: true, t: "Marco grueso de color (60 a 90px) alrededor de la foto; el título va sobre el marco superior o inferior, que es más ancho; el precio en una etiqueta girada en una esquina." },
    { id: "ventana", foto: true, t: "Fondo papel con la foto dentro de un arco tipo ventana (border-radius de 50% sólo arriba); alrededor formas planas simples (círculo, medialuna, rectángulo redondeado) en los colores de la marca." },
    { id: "polaroid", foto: true, t: "Fondo de color pleno; la foto como una polaroid (borde blanco grueso, apenas girada 3 o 4 grados, sombra corta) y el título grande al lado o debajo, con el precio en una etiqueta tipo sticker." },
    { id: "revista", foto: true, t: "Tapa de revista: foto a sangre, el título muy grande arriba, parte del texto en una franja vertical de color a un costado y los datos (precio, promo) en una caja sólida abajo." },
    { id: "iconos", foto: false, t: "Sin foto: fondo de color claro con una forma orgánica grande de otro tono; título fuerte arriba y los datos en filas o en una grilla, cada uno con su ícono dentro de un círculo de color." },
    { id: "sello", foto: false, t: "Sin foto: fondo del color de la marca, el título centrado dentro de un gran círculo o sello de otro color, y los datos en una franja sólida abajo." },
    { id: "cartel", foto: false, t: "Cartel tipográfico sin foto: el título gigante, bloques alternados de dos tonos de la marca separados por líneas finas, y los datos en filas con íconos dentro de círculos." }
  ];

  function recientes() { try { return JSON.parse(localStorage.getItem(KEY_RECIENTES) || "[]"); } catch (e) { return []; } }
  function elegirDireccion(conFoto, evitar) {
    const r = recientes();
    const aptas = DIRECCIONES.filter(d => d.foto === conFoto && d.id !== evitar);
    const nuevas = aptas.filter(d => r.indexOf(d.id) < 0);
    const lista = nuevas.length ? nuevas : aptas;
    const d = lista[Math.floor(Math.random() * lista.length)];
    try { localStorage.setItem(KEY_RECIENTES, JSON.stringify([d.id].concat(r.filter(x => x !== d.id)).slice(0, 4))); } catch (e) { /* nada */ }
    return d;
  }

  /* ---------------- Prompt ---------------- */
  function marcar(titulo, destacado) {
    titulo = String(titulo || ""); destacado = String(destacado || "").trim();
    const i = destacado ? titulo.toLowerCase().indexOf(destacado.toLowerCase()) : -1;
    return i < 0 ? titulo : titulo.slice(0, i) + "[[" + titulo.slice(i, i + destacado.length) + "]]" + titulo.slice(i + destacado.length);
  }

  // x: contexto de Render ({ W, H, fotos, negocio }); pub: { fotos:[{nota}], pieza }
  function prompt(pub, x, direccion) {
    const p = pub.pieza, neg = x.negocio, e = VID_CONFIG.estilos[neg.estilo] || VID_CONFIG.estilos.moderno;
    const esCatalogo = p.plantilla === "catalogo" && (p.productos || []).length > 1;
    const textos = { etiqueta: p.etiqueta, titulo: marcar(p.titulo, p.destacado), subtitulo: p.subtitulo, descuento: p.descuento, precio_antes: p.precio_antes, precio: p.precio, cta: p.cta };
    if (esCatalogo) textos.productos = p.productos.map(it => ({ foto: "{{FOTO" + it.foto + "}}", nombre: it.nombre, precio: it.precio, detalle: it.detalle }));
    if ((p.items || []).length) textos.items = p.items;
    const contacto = [neg.whatsapp && "WhatsApp " + neg.whatsapp, neg.instagram && "@" + neg.instagram.replace(/^@/, "")].filter(Boolean);
    if (contacto.length) textos.contacto = contacto;
    Object.keys(textos).forEach(k => { if (!textos[k] || (Array.isArray(textos[k]) && !textos[k].length)) delete textos[k]; });
    const nFotos = x.fotos.length;
    const reglaFotos = !nFotos ? "- No hay fotos: no uses imágenes; resolvé con color, formas planas e íconos."
      : esCatalogo ? "- Fotos reales de los productos: <img src=\"{{FOTO1}}\">, <img src=\"{{FOTO2}}\">… con object-fit: cover (o background-image: var(--foto1), var(--foto2)… con background-size: cover). Cada producto usa la foto indicada en los textos. No uses fotos de relleno ni definas las variables --foto."
      : "- La foto real del producto: <img src=\"{{FOTO" + p.foto + "}}\"> con object-fit: cover, o background-image: var(--foto" + p.foto + ") con background-size: cover y background-position: center. No uses fotos de relleno ni definas --foto. Tiene que verse bien el producto: no la tapes más de la mitad ni le pongas filtros raros.";
    return [
      "Sos director/a de arte de una agencia que hace las redes de comercios argentinos. Diseñás flyers para Instagram que parecen hechos por un buen diseñador con Illustrator o Figma: composición clara, tipografía grande y cuidada, colores planos de la marca, mucho aire. Nada que delate que lo hizo una IA.",
      "Escribí el HTML y CSS de UNA placa de exactamente " + x.W + "x" + x.H + " px para \"" + neg.nombre + "\" (" + (neg.rubro || "comercio") + ").",
      "DIRECCIÓN DE ARTE para esta placa: " + direccion.t,
      [
        "REGLAS OBLIGATORIAS:",
        "- Todo dentro de <div class=\"pieza\">, que ya mide " + x.W + "x" + x.H + "px, con position:relative y overflow:hidden. Ubicá con flex o position:absolute; medidas en px.",
        "- Colores SOLO con estas variables (ya definidas en .pieza, no las redefinas): var(--primario) color de la marca, var(--sobre-primario) texto sobre el primario, var(--acento) color de acento (precios, stickers), var(--sobre-acento) texto sobre el acento, var(--oscuro), var(--claro), var(--fondo) papel claro, var(--tinta) texto oscuro; más #fff y negro con transparencia para sombras. Podés usar color-mix(in srgb, …) entre ellas.",
        "- Tipografías SOLO: títulos y precios con font-family: " + e.titulo + " (peso " + e.peso + (e.mayus === "uppercase" ? ", en mayúsculas" : "") + "); el resto con 'Poppins' (400 a 800). Nada de otras fuentes.",
        reglaFotos,
        "- La firma es obligatoria y va tal cual, sin nada adentro más que el marcador: <div class=\"firma\">{{FIRMA}}</div> (el sistema pone ahí el logo y el nombre del negocio). Dale color y un font-size de 28 a 36px; que nada la tape.",
        "- El precio es protagonista: grande (al menos 70px), sobre var(--acento) con var(--sobre-acento), tipo etiqueta o sticker. Si hay precio_antes va tachado y más chico.",
        "- Íconos: <i class=\"fa-solid fa-NOMBRE\"></i>, sólo si suman, y SOLO con estos nombres: " + Iconos.lista.join(", ") + ". Nada de emojis.",
        "- Contraste: todo texto va sobre un color sólido, o sobre la foto con una capa oscura de al menos 55% de opacidad detrás. Tamaños mínimos: título 72px, subtítulo 30px, datos 26px.",
        "- Márgenes internos de al menos 60px" + (x.H > 1500 ? " y, como es una historia, nada importante en los 170px de arriba ni en los 160px de abajo" : "") + ". Ningún texto puede salirse de la placa, quedar cortado ni pisarse con otro.",
        "- PROHIBIDO: degradados tipo arcoíris, efectos de vidrio o desenfoque (backdrop-filter, blur), brillos, neones, sombras largas, textos con degradado, más de 2 tipografías, adornos genéricos (destellos, partículas, confeti).",
        "- Sin <script>, sin eventos, sin enlaces, sin @import, sin url() externas."
      ].join("\n"),
      "TEXTOS (usá exactamente estos, cada uno UNA sola vez; podés partir el título en líneas; no agregues textos nuevos; los ** marcan negrita; en el título, lo que está entre [[ ]] va resaltado con otro color o un recuadro, sin los corchetes):\n" + JSON.stringify(textos),
      "Respondé SOLO con un bloque ```html que tenga <style> y el <div class=\"pieza\">. Sin explicaciones."
    ].join("\n\n");
  }

  function extraer(texto) {
    const t = String(texto || ""), m = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
    return (m ? m[1] : t).trim();
  }

  /* ---------------- Revisión ---------------- */
  function lum(r, g, b) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  // Para cada texto toma una grilla de píxeles de su caja, descarta los del color del texto y
  // compara contra el fondo más parecido al texto (percentil 20): el caso peor razonable.
  function contraste(canvas, medidas) {
    const ctx = canvas.getContext("2d"), probs = [];
    medidas.forEach(m => {
      const tc = (m.color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
      if (tc.length > 3 && tc[3] < 0.3) return;
      const x0 = Math.max(0, Math.floor(m.r.x)), y0 = Math.max(0, Math.floor(m.r.y));
      const w = Math.min(canvas.width - x0, Math.ceil(m.r.w)), h = Math.min(canvas.height - y0, Math.ceil(m.r.h));
      if (w < 4 || h < 4) return;
      const data = ctx.getImageData(x0, y0, w, h).data, fondos = [], todos = [];
      for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 16; gx++) {
        const i = ((Math.floor((gy + 0.5) * h / 12)) * w + Math.floor((gx + 0.5) * w / 16)) * 4;
        const dr = data[i] - tc[0], dg = data[i + 1] - tc[1], db = data[i + 2] - tc[2];
        const lp = lum(data[i], data[i + 1], data[i + 2]);
        todos.push(lp);
        if (Math.sqrt(dr * dr + dg * dg + db * db) > 90) fondos.push(lp);
      }
      const lt = lum(tc[0], tc[1], tc[2]);
      if (fondos.length < 25) {
        todos.sort((a, b) => a - b);
        const lm = todos[Math.floor(todos.length / 2)], rm = (Math.max(lt, lm) + 0.05) / (Math.min(lt, lm) + 0.05);
        if (rm < 1.6 && m.r.w * m.r.h > 2000) probs.push("El texto \"" + m.txt + "\" casi no se ve: es del mismo color que su fondo.");
        return;
      }
      fondos.sort((a, b) => Math.abs(a - lt) - Math.abs(b - lt));
      const lb = fondos[Math.floor(fondos.length * 0.2)];
      const ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
      const minimo = m.tam >= 40 ? 3 : 4.5;
      if (ratio < 2) probs.push("El texto \"" + m.txt + "\" casi no se ve (contraste " + ratio.toFixed(1) + ":1): ponelo sobre un color sólido o una capa mucho más oscura/clara.");
      else if (ratio < minimo) probs.push("Poco contraste en \"" + m.txt + "\" (" + ratio.toFixed(1) + ":1, mínimo " + minimo + ":1): poné el texto sobre un color sólido o una capa más oscura/clara.");
    });
    return probs;
  }

  let banco = null; // lugar fuera de pantalla donde se monta la placa para medirla
  function revisar(codigo, x) {
    if (!banco) {
      banco = document.createElement("div");
      banco.style.cssText = "position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none";
      document.body.appendChild(banco);
    }
    banco.style.width = x.W + "px"; banco.style.height = x.H + "px";
    return Render.montar(banco, codigo, x).then(raiz => {
      const p = [], W = x.W, H = x.H, R = banco.getBoundingClientRect();
      const caja = el => { const r = el.getBoundingClientRect(); return { left: r.left - R.left, top: r.top - R.top, right: r.right - R.left, bottom: r.bottom - R.top, width: r.width, height: r.height }; };
      if (!raiz) return { problemas: ["Falta el <div class=\"pieza\">."] };
      const firma = raiz.querySelector(".firma[data-firma]");
      const fr = firma && caja(firma);
      if (!fr || fr.width < 40 || fr.left < 0 || fr.top < 0 || fr.right > W || fr.bottom > H) p.push("La firma <div class=\"firma\">{{FIRMA}}</div> no aparece completa dentro de la placa.");
      const hojas = $$(raiz, "*").filter(el => {
        if (el.closest("svg,style")) return false;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        return r.width > 0 && cs.display !== "none" && Array.prototype.some.call(el.childNodes, n => n.nodeType === 3 && n.textContent.trim());
      });
      hojas.forEach(el => {
        const r = caja(el), cs = getComputedStyle(el), txt = el.textContent.trim().slice(0, 40);
        if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) p.push("El texto \"" + txt + "\" se sale de la placa.");
        else if (el.scrollWidth > el.clientWidth + 3 && cs.overflow !== "visible") p.push("El texto \"" + txt + "\" queda cortado a lo ancho.");
        else if (el.scrollHeight > el.clientHeight + 3 && cs.overflow !== "visible") p.push("El texto \"" + txt + "\" queda cortado a lo alto.");
      });
      for (let i = 0; i < hojas.length; i++) for (let j = i + 1; j < hojas.length; j++) {
        const a = hojas[i], b = hojas[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)), iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
        if (ix * iy > 0.15 * Math.min(ra.width * ra.height, rb.width * rb.height)) {
          p.push("El texto \"" + a.textContent.trim().slice(0, 30) + "\" se superpone con \"" + b.textContent.trim().slice(0, 30) + "\": separalos (usá flex en columna o más espacio).");
        }
      }
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(raiz.textContent)) p.push("Tiene emojis: sacalos.");
      if (x.fotos.length && !$$(raiz, "img[data-foto]").length && !/var\(--foto/.test(codigo)) p.push("No usaste la foto del producto: tiene que verse.");
      const medidas = hojas.filter(el => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(el.textContent)).slice(0, 30).map(el => {
        const r = caja(el), cs = getComputedStyle(el);
        return { txt: el.textContent.trim().slice(0, 30), r: { x: r.left, y: r.top, w: r.width, h: r.height }, color: cs.color, tam: parseFloat(cs.fontSize) || 30 };
      });
      return Render.exportar(banco, x).then(canvas => { contraste(canvas, medidas).forEach(m => p.push(m)); }, () => {})
        .then(() => ({ problemas: p.filter((v, i, a) => a.indexOf(v) === i).slice(0, 6) }));
    }).finally(() => { if (banco.shadowRoot) banco.shadowRoot.innerHTML = ""; });
  }

  /* ---------------- Generar ---------------- */
  // Si la conexión se corta, se reintenta una vez.
  function pedir(mensajes, reintento) {
    return IA.post("/ia/chat", { messages: mensajes, perfil: "diseno" }, 180000).then(j => {
      Costos.sumar("diseno", j.usage);
      const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!c) throw new Error("La IA no devolvió el diseño.");
      return c;
    }).catch(e => {
      if (!reintento && e instanceof TypeError) return new Promise(ok => setTimeout(ok, 1500)).then(() => pedir(mensajes, true));
      throw e;
    });
  }

  // Problemas que rompen la pieza. El contraste justo se avisa pero no bloquea.
  const graves = problemas => problemas.filter(p => /se sale|cortado|superpone|no aparece|casi no se ve|Falta|No usaste/.test(p));

  // Un intento: diseño + (si hace falta) una corrección.
  function intento(pub, x, direccion, alProgreso) {
    const msgs = [{ role: "user", content: prompt(pub, x, direccion) }];
    alProgreso && alProgreso("Diseñando…");
    return pedir(msgs).then(resp => {
      const c1 = extraer(resp);
      return revisar(c1, x).then(r1 => {
        if (!r1.problemas.length) return { codigo: c1, direccion: direccion.id, problemas: [] };
        alProgreso && alProgreso("Corrigiendo detalles…");
        msgs.push({ role: "assistant", content: "```html\n" + c1 + "\n```" });
        msgs.push({ role: "user", content: "Revisé la placa renderizada y tiene estos problemas:\n- " + r1.problemas.join("\n- ") + "\nCorregilos sin cambiar la idea del diseño. Si algo no entra, achicá tipografías o sacá aire; nunca dejes texto afuera. La firma va tal cual: <div class=\"firma\">{{FIRMA}}</div>. Respondé SOLO con el bloque ```html completo." });
        return pedir(msgs).then(resp2 => {
          const c2 = extraer(resp2);
          return revisar(c2, x).then(r2 => graves(r2.problemas).length <= graves(r1.problemas).length
            ? { codigo: c2, direccion: direccion.id, problemas: r2.problemas }
            : { codigo: c1, direccion: direccion.id, problemas: r1.problemas });
        });
      });
    });
  }

  // Devuelve { codigo, direccion, problemas, prolijo }. Si el primer intento queda roto, prueba otra dirección de arte.
  function generar(pub, x, alProgreso) {
    const d1 = elegirDireccion(x.fotos.length > 0);
    return intento(pub, x, d1, alProgreso).then(r1 => {
      if (!graves(r1.problemas).length) return Object.assign(r1, { prolijo: true });
      alProgreso && alProgreso("Probando otra composición…");
      return intento(pub, x, elegirDireccion(x.fotos.length > 0, d1.id), alProgreso).then(r2 => {
        const mejor = graves(r2.problemas).length < graves(r1.problemas).length ? r2 : r1;
        return Object.assign(mejor, { prolijo: !graves(mejor.problemas).length });
      }, () => Object.assign(r1, { prolijo: false }));
    });
  }

  return { generar, revisar, graves, direcciones: DIRECCIONES };
})();
