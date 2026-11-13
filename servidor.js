#!/usr/bin/env node
/* Servidor estático mínimo (sin dependencias) para la maqueta.
   Tiene que ser el puerto 5520: es el origen local que acepta el proxy de IA.
   Uso: node servidor.js   →   http://localhost:5520 */
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = __dirname, PUERTO = 5520;
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  let ruta;
  try { ruta = decodeURIComponent(req.url.split("?")[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (ruta.endsWith("/")) ruta += "index.html";
  const archivo = path.join(RAIZ, path.normalize(ruta));
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log("Vidriera en http://localhost:" + PUERTO));
