/* =========================================================
   Configuración de Vidriera (maqueta).
   - apiBase: el mismo proxy de IA que MUNI_NOTICIAS (BRLDiscord). La clave
     de OpenRouter vive en el servidor. Rutas: /ia/chat (perfil "redaccion"
     para los textos, "diseno" para el HTML del diseño libre) y /ia/transcribe.
   - El proxy sólo acepta ciertos orígenes: en local hay que abrir la
     maqueta en http://localhost:5520 (node servidor.js).
   ========================================================= */
window.VID_CONFIG = {
  apiBase: "https://server.brl-vcmp.com",
  origenesIA: ["grossomaximiliano.github.io", "localhost:5520", "127.0.0.1:5520"],

  maxGrabacion: 120,  // segundos por audio
  maxFotos: 6,        // por publicación
  maxFotosPlan: 12,   // al planificar varias publicaciones
  maxLadoFoto: 1400,  // las fotos se achican a este lado máximo

  formatos: {
    "4:5":  { w: 1080, h: 1350, nombre: "Post", clase: "f-45" },
    "1:1":  { w: 1080, h: 1080, nombre: "Cuadrado", clase: "f-11" },
    "9:16": { w: 1080, h: 1920, nombre: "Historia", clase: "f-916" }
  },

  // Estilo tipográfico de cada negocio: define la letra de los títulos y de los precios.
  estilos: {
    moderno:  { nombre: "Moderno",  titulo: "'Poppins',sans-serif",          peso: 800, mayus: "none",      espaciado: "-0.02em", alto: 1.04, factor: 1,    num: "'Poppins',sans-serif", pesoNum: 800 },
    elegante: { nombre: "Elegante", titulo: "'Playfair Display',serif",      peso: 800, mayus: "none",      espaciado: "-0.01em", alto: 1.06, factor: 1,    num: "'Poppins',sans-serif", pesoNum: 700 },
    impacto:  { nombre: "Impacto",  titulo: "'Bebas Neue',sans-serif",       peso: 400, mayus: "uppercase", espaciado: "0.01em",  alto: 0.95, factor: 1.28, num: "'Bebas Neue',sans-serif", pesoNum: 400 }
  },

  fuentesCss: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Bebas+Neue&display=block",

  limiteInstagram: 2200
};
