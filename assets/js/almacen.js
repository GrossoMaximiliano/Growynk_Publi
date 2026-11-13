/* =========================================================
   Almacén clave → valor en IndexedDB (las fotos pesan demasiado
   para localStorage). API: Almacen.leer(k), guardar(k, v), borrar(k)
   ========================================================= */
window.Almacen = (function () {
  let base = null;
  function abrir() {
    if (base) return base;
    base = new Promise((ok, mal) => {
      const p = indexedDB.open("vidriera", 1);
      p.onupgradeneeded = () => p.result.createObjectStore("kv");
      p.onsuccess = () => ok(p.result);
      p.onerror = () => mal(p.error);
    });
    return base;
  }
  function op(modo, f) {
    return abrir().then(db => new Promise((ok, mal) => {
      const tx = db.transaction("kv", modo), r = f(tx.objectStore("kv"));
      tx.oncomplete = () => ok(r.result);
      tx.onerror = tx.onabort = () => mal(tx.error);
    }));
  }
  return {
    leer: k => op("readonly", s => s.get(k)),
    guardar: (k, v) => op("readwrite", s => s.put(v, k)),
    borrar: k => op("readwrite", s => s.delete(k))
  };
})();
