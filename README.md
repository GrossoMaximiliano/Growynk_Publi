# Vidriera (maqueta)

Prueba de concepto de un SaaS para comercios: el dueño sube fotos de sus productos, cuenta en un audio qué quiere
publicar y recibe el **flyer** y el **texto para Instagram** listos para retocar y descargar.

Está basada en [MUNI_NOTICIAS](https://github.com/GrossoMaximiliano/MUNI_NOTICIAS): usa el mismo proxy de IA
(`https://server.brl-vcmp.com`) y reutiliza su grabación de voz, sus íconos y su motor de diseño en HTML.
Es HTML + CSS + JS puro, sin build ni dependencias.

## Probar

**Publicada**: https://grossomaximiliano.github.io/Growynk_Publi/ (GitHub Pages). Funciona todo, también el
micrófono desde el celular, porque es HTTPS y ese dominio está entre los orígenes que acepta el proxy de IA.

**En local**:

```bash
node servidor.js        # o: python3 -m http.server 5520
```

Abrir **http://localhost:5520**. Tiene que ser ese puerto: es el único origen local que acepta el proxy de IA.
Por otra dirección (por ejemplo la IP del servidor) se ven las pantallas pero el asistente no responde.

## Qué se puede hacer

La pantalla está pensada primero para el celular y para gente con poco tiempo: letra y botones grandes, una
tarea por pantalla, tres secciones (Inicio, Calendario, Mi negocio) y siempre la opción de hablar en vez de escribir.

1. **Crear una publicación**: fotos (opcionales) + un audio o texto. Devuelve la imagen, el texto de Instagram,
   los hashtags y una versión para WhatsApp. Si no entiende qué promocionar, pregunta.
   Con varias fotos ninguna queda afuera sin aviso: productos distintos van en un catálogo o en un **carrusel**
   (portada + una imagen por producto), varias fotos del mismo producto van en carrusel, y si alguna foto no entra
   la pantalla lo dice y ofrece sumarla, armar un carrusel o **publicarla otro día** (pasa a "Planificar varias"
   con lo que ya se sabe de cada foto). En el carrusel, "Guardar" baja todas las imágenes numeradas.
2. **Planificar varias**: se suben hasta 12 fotos juntas, se cuenta qué es cada una y cada cuánto se quiere
   publicar. El asistente propone un plan como haría un community manager: qué fotos van juntas, qué día, si es
   post o historia y por qué. Se puede cambiar el día, quitar publicaciones o pedir cambios hablando. Al aceptar,
   escribe cada publicación en segundo plano y quedan en el calendario.
3. **Calendario**: lo de hoy, lo que viene, lo atrasado, los borradores y lo ya publicado. Cada publicación se
   programa para un día y se marca con "Ya la publiqué".
4. **Fechas importantes**: vienen cargadas las más comunes (Navidad, Día de la Madre, etc.) y se agregan las
   propias dictándolas ("el 25 de febrero la biblioteca cumple 60 años, avisame una semana antes"). Unos días
   antes aparecen destacadas en Inicio con el botón **Preparar**, que arma el saludo para esa fecha.
5. **Historias**: cualquier publicación se pasa a Post, Cuadrado o Historia (9:16) con un toque.
6. **Retocar**: se toca un texto de la imagen para corregirlo, o se pide un cambio hablando ("sacá lo del domingo").
   En "Cambiar el diseño" están los modelos (Destacado, Oferta, Catálogo, Novedad, Anuncio, Saludo), los colores,
   el diseño libre hecho por la IA y, para técnicos, el HTML.
7. **Foto de fondo**: los avisos y saludos sin foto buscan solos una foto real en bancos libres (Wikimedia
   Commons y Openverse) y la ponen desenfocada y teñida con el color del negocio, detrás del texto. Se puede pedir
   otra, usar una propia o sacarla. La pantalla muestra autor y licencia y permite sumar el crédito al texto.
8. **Logos**: en "Mi negocio" se cargan uno o varios logos; el primero va en todas las imágenes y los demás se
   eligen en cada publicación. También se suma el logo de un invitado sólo para esa publicación (un auspiciante,
   otra institución, un funcionario).
9. **Guardar imagen** (PNG de 1080 px de ancho) y **Copiar texto** para pegar en Instagram.

En "Mi negocio" se elige el negocio (no hay usuarios) y se carga lo que el asistente sabe de él: qué vende, a
quién, cómo habla, contacto, colores, letra y logo.

## Cómo está hecho

| Archivo | Qué hace |
|---|---|
| `assets/js/config.js` | Proxy, formatos, estilos de letra |
| `assets/js/negocios.js` | Negocios de ejemplo, paleta a partir de dos colores, contexto para el prompt |
| `assets/js/fechas.js` | Calendario y fechas importantes con su aviso |
| `assets/js/ia.js` | Prompts (publicación, plan, fecha dictada), `/ia/chat` y `/ia/transcribe`, costos |
| `assets/js/plantillas.js` | Las seis plantillas HTML/CSS |
| `assets/js/fotos.js` | Búsqueda de fotos libres para el fondo y desenfoque (de MUNI_NOTICIAS) |
| `assets/js/render.js` | Saneado del HTML, montaje, ajuste de texto y exportación a imagen |
| `assets/js/diseno.js` | Diseño libre con IA: direcciones de arte, revisión y corrección |
| `assets/js/voz.js`, `iconos.js` | Grabación → WAV → transcripción; íconos SVG (de MUNI_NOTICIAS) |
| `assets/js/app.js`, `almacen.js` | Pantallas y guardado en el navegador (IndexedDB) |
| `servidor.js` | Servidor estático en el puerto 5520 |

La IA nunca arma el flyer a ciegas: devuelve un JSON con textos cortos y la plantilla sugerida, y el diseño lo
ponen las plantillas. Por eso el resultado es consistente y editable.

## Límites de la maqueta

- **La IA no ve las fotos**: el proxy sólo acepta texto. Sabe lo que el cliente dice de cada foto.
- **Nada se publica solo ni avisa fuera de la página**: el calendario y los avisos se ven al abrir la maqueta.
  Publicar en Instagram y avisar por WhatsApp o notificación necesitan un servidor propio.
- Los datos viven en el navegador; no hay cuentas ni servidor propio.
- Las fotos de fondo son de terceros con licencia libre: varias piden nombrar al autor al publicar.
- El recorte de cada foto es automático (centrado); no se puede reencuadrar.
- Costos medidos: textos ~USD 0,002 por pedido; diseño libre con IA ~USD 0,07 a 0,15.

El plan para pasar de esto a un producto está en [PLAN.md](PLAN.md).
