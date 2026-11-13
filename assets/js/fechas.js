/* =========================================================
   Fechas: utilidades de calendario y fechas importantes de cada negocio
   (feriados, días comerciales, aniversarios propios) con su aviso previo.
   Una fecha: { id, nombre, dia, mes, avisar (días antes), nota, regla? }
   regla "dom3" = tercer domingo del mes (Día del Padre, del Niño, de la Madre).
   ========================================================= */
window.Fechas = (function () {
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const dos = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
  const aDate = s => { const p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const valida = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(aDate(s).getTime());
  const hoy = () => iso(new Date());
  const sumar = (s, n) => { const d = aDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const dif = (a, b) => Math.round((aDate(a) - aDate(b)) / 86400000); // días de b hasta a
  const diaSemana = s => DIAS[aDate(s).getDay()];
  const larga = s => { const d = aDate(s); return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()]; };
  function relativa(s) {
    const n = dif(s, hoy());
    if (n === 0) return "hoy"; if (n === 1) return "mañana"; if (n === -1) return "ayer";
    return n > 0 ? "en " + n + " días" : "hace " + (-n) + " días";
  }

  const BASE = [
    ["Año Nuevo", 1, 1], ["San Valentín", 14, 2], ["Día de la Mujer", 8, 3], ["Día del Trabajador", 1, 5], ["25 de Mayo", 25, 5],
    ["Día del Padre", 0, 6, "dom3"], ["Día de la Independencia", 9, 7], ["Día del Amigo", 20, 7], ["Día del Niño", 0, 8, "dom3"],
    ["Día de la Primavera", 21, 9], ["Día de la Madre", 0, 10, "dom3"], ["Navidad", 25, 12], ["Fin de año", 31, 12]
  ];
  const basicas = () => BASE.map((f, i) => ({ id: "base-" + i, nombre: f[0], dia: f[1], mes: f[2], regla: f[3] || "", avisar: 3, nota: "" }));

  function enAnio(f, anio) {
    if (f.regla === "dom3") { const d = new Date(anio, f.mes - 1, 1); d.setDate(1 + ((7 - d.getDay()) % 7) + 14); return iso(d); }
    return iso(new Date(anio, f.mes - 1, f.dia));
  }
  // Próxima vez que cae cada fecha (de hoy en adelante), ordenadas. clave identifica esa ocurrencia.
  function proximas(neg) {
    const h = hoy(), anio = aDate(h).getFullYear();
    return (neg.fechas || []).map(f => {
      let cuando = enAnio(f, anio);
      if (cuando < h) cuando = enAnio(f, anio + 1);
      const faltan = dif(cuando, h);
      return { id: f.id, nombre: f.nombre, nota: f.nota || "", fecha: cuando, faltan, avisar: f.avisar || 3, cerca: faltan <= (f.avisar || 3), clave: f.id + ":" + cuando };
    }).sort((a, b) => a.faltan - b.faltan);
  }
  const textoFecha = f => f.regla === "dom3" ? "Tercer domingo de " + MESES[f.mes - 1] : f.dia + " de " + MESES[f.mes - 1];

  return { MESES, hoy, sumar, dif, valida, diaSemana, larga, relativa, basicas, proximas, textoFecha };
})();
