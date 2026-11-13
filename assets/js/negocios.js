/* =========================================================
   Negocios (los clientes del SaaS). Cada uno tiene su contexto para la
   IA (qué vende, a quién, cómo habla) y su marca (colores, letra, logo).
   En la maqueta no hay inicio de sesión: se elige el negocio en la barra.
   ========================================================= */
window.Negocios = (function () {
  const C = window.VID_CONFIG;

  const EJEMPLOS = [
    { id: "rayuela", nombre: "Rayuela Juguetes", rubro: "Juguetería", ciudad: "Las Toscas, Santa Fe",
      descripcion: "Juguetería de barrio con juguetes didácticos, de madera, juegos de mesa, peluches y rodados para chicos de 0 a 12 años. Armamos regalos y listas de cumpleaños.",
      publico: "Madres, padres, abuelos y tíos que buscan regalos para chicos.",
      tono: "Alegre, cálido y juguetón, sin ser infantil. Tuteo rioplatense (vos).",
      whatsapp: "3482 55-0101", instagram: "rayuela.juguetes", direccion: "San Martín 742", horarios: "Lunes a sábado de 9 a 12:30 y de 17 a 20:30",
      extra: "Envolvemos para regalo sin cargo. Aceptamos transferencia y tarjetas.", hashtags: "#RayuelaJuguetes #LasToscas",
      colores: { primario: "#2f55d4", acento: "#ffc531" }, estilo: "moderno", logo: null },
    { id: "espiga", nombre: "La Espiga", rubro: "Panadería y confitería", ciudad: "Las Toscas, Santa Fe",
      descripcion: "Panadería artesanal: pan de masa madre, facturas, tortas por encargo, sándwiches de miga y cosas ricas para el mate. Todo se hornea en el día.",
      publico: "Vecinos del barrio, familias y gente que encarga para cumpleaños y reuniones.",
      tono: "Casero, cercano y tentador. Tuteo rioplatense (vos).",
      whatsapp: "3482 55-0202", instagram: "laespiga.panaderia", direccion: "Belgrano 315", horarios: "Todos los días de 7 a 13 y de 16:30 a 20:30",
      extra: "Las tortas se encargan con 48 horas de anticipación.", hashtags: "#LaEspigaPanaderia #LasToscas",
      colores: { primario: "#6b3f24", acento: "#e8a838" }, estilo: "elegante", logo: null },
    { id: "mora", nombre: "Mora", rubro: "Indumentaria femenina", ciudad: "Las Toscas, Santa Fe",
      descripcion: "Showroom de ropa de mujer: básicos, denim, vestidos y accesorios de temporada. Talles del S al XXL.",
      publico: "Mujeres de 20 a 45 años.",
      tono: "Canchero, seguro y directo. Tuteo rioplatense (vos).",
      whatsapp: "3482 55-0303", instagram: "mora.showroom", direccion: "Calle 12 n.º 480", horarios: "Lunes a sábado de 17 a 21",
      extra: "Envíos a todo el país. 3 cuotas sin interés con tarjeta.", hashtags: "#MoraShowroom",
      colores: { primario: "#17171c", acento: "#f0567a" }, estilo: "impacto", logo: null }
  ];

  /* ---------------- Color ---------------- */
  function rgb(hex) {
    let h = String(hex || "#000").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h, 16) || 0;
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const hex = c => "#" + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  // mezcla(a, b, t): t = cuánto de b
  function mezcla(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const [r, g, b] = rgb(c);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contraste(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* Paleta completa a partir de los dos colores de la marca.
     esquema: "claro" (fondo papel), "color" (fondo del color principal) u "oscuro". */
  function paleta(neg, esquema) {
    const p = neg.colores.primario, a = neg.colores.acento;
    const tinta = mezcla(p, "#101014", 0.86);
    const oscuro = lum(p) < 0.03 ? mezcla(p, "#ffffff", 0.06) : mezcla(p, "#000000", 0.62);
    const claro = mezcla(p, "#ffffff", 0.86), fondo = mezcla(p, "#fffdf9", 0.955);
    const sobre = c => contraste(c, "#ffffff") >= 3 ? "#ffffff" : tinta;
    let bg, fg, panel, realce;
    if (esquema === "color") {
      bg = p; fg = sobre(p); panel = mezcla(p, fg, 0.13);
      realce = contraste(a, p) >= 2.2 ? a : fg;
    } else if (esquema === "oscuro") {
      bg = oscuro; fg = "#ffffff"; panel = mezcla(oscuro, "#ffffff", 0.11);
      realce = contraste(a, oscuro) >= 3 ? a : (contraste(p, oscuro) >= 3 ? p : claro);
    } else {
      bg = fondo; fg = tinta; panel = claro;
      realce = contraste(p, fondo) >= 3 ? p : (contraste(a, fondo) >= 3 ? a : oscuro);
    }
    const sello = contraste(a, bg) >= 1.3 ? a : fg;
    return { primario: p, acento: a, oscuro, claro, fondo, tinta, "sobre-primario": sobre(p), "sobre-acento": sobre(a),
      bg, fg, panel, "sobre-panel": contraste(fg, panel) >= 4 ? fg : sobre(panel), realce, "sobre-realce": contraste(bg, realce) >= 3 ? bg : sobre(realce),
      sello, "sobre-sello": sello === a ? sobre(a) : bg };
  }

  // Declaraciones CSS (colores + letra) que se inyectan en .pieza
  function variables(neg, esquema) {
    const pal = paleta(neg, esquema), e = C.estilos[neg.estilo] || C.estilos.moderno;
    return Object.keys(pal).map(k => "--" + k + ":" + pal[k]).join(";") +
      ";--f-tit:" + e.titulo + ";--w-tit:" + e.peso + ";--tt-tit:" + e.mayus + ";--ls-tit:" + e.espaciado + ";--lh-tit:" + e.alto +
      ";--kf:" + e.factor + ";--f-num:" + e.num + ";--w-num:" + e.pesoNum;
  }

  function nuevo() {
    return { id: "neg-" + Date.now().toString(36), nombre: "", rubro: "", ciudad: "", descripcion: "", publico: "", tono: "Cercano y claro. Tuteo rioplatense (vos).",
      whatsapp: "", instagram: "", direccion: "", horarios: "", extra: "", hashtags: "", colores: { primario: "#2f55d4", acento: "#ffc531" }, estilo: "moderno", logos: [], fechas: Fechas.basicas() };
  }

  // Texto del negocio para el prompt
  function paraPrompt(n) {
    const f = (t, v) => v ? "- " + t + ": " + v : null;
    return [
      f("Nombre", n.nombre), f("Rubro", n.rubro), f("Ciudad", n.ciudad), f("Qué hace y qué vende", n.descripcion), f("Público", n.publico),
      f("Tono de la marca", n.tono), f("WhatsApp", n.whatsapp), f("Instagram", n.instagram ? "@" + n.instagram.replace(/^@/, "") : ""),
      f("Dirección", n.direccion), f("Horarios", n.horarios), f("Datos fijos (envíos, pagos, etc.)", n.extra), f("Hashtags propios", n.hashtags)
    ].filter(Boolean).join("\n");
  }

  return { ejemplos: () => JSON.parse(JSON.stringify(EJEMPLOS)).map(n => { n.fechas = Fechas.basicas(); n.logos = []; return n; }), paleta, variables, nuevo, paraPrompt, contraste, mezcla };
})();
