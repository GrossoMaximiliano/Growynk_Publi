/* =========================================================
   Fotos de fondo para avisos y saludos (adaptado de fotos.js de MUNI_NOTICIAS).
   Busca fotos reales en bancos libres que se pueden usar desde el navegador:
   Wikimedia Commons y Openverse, sólo con licencias que permiten uso comercial
   y modificar la foto. Cada resultado guarda autor, licencia y fuente.
   Fotos.suave() deja la foto desenfocada y liviana, lista para ir de fondo.
   ========================================================= */
window.Fotos = (function () {
  function limpiarHTML(t) { const d = new DOMParser().parseFromString(t || "", "text/html"); return (d.body.textContent || "").trim(); }

  function wikimedia(q) {
    const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6" +
      "&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap") + "&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280";
    return fetch(url).then(r => r.json()).then(j => {
      const ps = j.query ? Object.values(j.query.pages) : [];
      return ps.sort((a, b) => a.index - b.index).map(p => {
        const ii = p.imageinfo && p.imageinfo[0];
        if (!ii || ii.width < 900 || /\.(svg|tif|tiff)$/i.test(ii.url)) return null;
        const md = ii.extmetadata || {}, lic = (md.LicenseShortName && md.LicenseShortName.value) || "";
        if (/\b(ND|NC)\b|fair use/i.test(lic)) return null;
        return { completa: ii.thumburl, fuente: "Wikimedia Commons", autor: limpiarHTML(md.Artist && md.Artist.value).slice(0, 80) || "Autor desconocido",
          licencia: lic || "Ver en la fuente", pagina: ii.descriptionurl };
      }).filter(Boolean);
    }).catch(() => []);
  }

  function openverse(q) {
    const url = "https://api.openverse.org/v1/images/?q=" + encodeURIComponent(q) + "&license=cc0,pdm,by,by-sa&page_size=12&mature=false";
    return fetch(url).then(r => r.json()).then(j => (j.results || []).filter(x => (x.width || 0) >= 900).map(x => ({
      completa: x.url, respaldo: x.thumbnail, fuente: "Openverse", autor: String(x.creator || "Autor desconocido").slice(0, 80),
      licencia: ("CC " + (x.license || "").toUpperCase() + " " + (x.license_version || "")).replace("CC CC0", "CC0").replace("CC PDM", "Dominio público").trim(),
      pagina: x.foreign_landing_url
    }))).catch(() => []);
  }

  // q: búsqueda en español; qEn: en inglés. Devuelve hasta 10, intercaladas.
  function buscar(q, qEn) {
    // Commons está descripto sobre todo en inglés: se busca en los dos idiomas.
    // Si un banco tarda o no responde, se sigue con lo que haya de los otros.
    const pronto = pr => Promise.race([pr, new Promise(ok => setTimeout(() => ok([]), 7000))]);
    return Promise.all([pronto(qEn ? wikimedia(qEn) : Promise.resolve([])), pronto(openverse(qEn || q)), pronto(wikimedia(q))]).then(r => {
      const mix = [], vistas = {};
      for (let i = 0; i < 12; i++) r.forEach(lista => { const x = lista[i]; if (x && !vistas[x.completa]) { vistas[x.completa] = 1; mix.push(x); } });
      return mix.slice(0, 10);
    });
  }

  function cargar(url) {
    return new Promise((ok, mal) => {
      const im = new Image();
      if (!/^data:/.test(url)) im.crossOrigin = "anonymous";
      im.onload = () => ok(im);
      im.onerror = () => mal(new Error("No se pudo descargar la foto"));
      im.src = url;
    });
  }

  // Foto (URL de un resultado o dataURL propia) → dataURL de hasta 1080 px, desenfocada.
  // El desenfoque se hace achicando y agrandando (anda en todos los navegadores, también al exportar).
  function suave(origen) {
    const url = typeof origen === "string" ? origen : origen.completa, respaldo = typeof origen === "string" ? null : origen.respaldo;
    return cargar(url).catch(e => { if (respaldo) return cargar(respaldo); throw e; }).then(im => {
      const k = Math.min(1, 1080 / Math.max(im.naturalWidth, im.naturalHeight));
      const W = Math.round(im.naturalWidth * k), H = Math.round(im.naturalHeight * k);
      const chico = document.createElement("canvas"), c = document.createElement("canvas");
      chico.width = Math.max(8, Math.round(W / 9)); chico.height = Math.max(8, Math.round(H / 9));
      chico.getContext("2d").drawImage(im, 0, 0, chico.width, chico.height);
      c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(chico, 0, 0, W, H);
      x.globalAlpha = 0.35; x.drawImage(im, 0, 0, W, H); // un poco de la foto nítida para que se entienda qué es
      try { return c.toDataURL("image/jpeg", 0.82); } catch (e) { throw new Error("Esa foto no se puede usar desde la página."); }
    });
  }

  return { buscar, suave };
})();
