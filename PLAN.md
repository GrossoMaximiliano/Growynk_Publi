# De la maqueta al SaaS

## Qué valida la maqueta

- Que con fotos + un audio desordenado sale una publicación usable en menos de 20 segundos.
- Que el contexto por negocio (rubro, tono, contacto, colores) alcanza para que el texto suene a esa marca.
- Que plantillas HTML con variables de marca dan un flyer prolijo sin modelo de imágenes.

## Qué probar con comercios reales antes de construir más

1. ¿Publican el flyer tal cual o lo retocan? ¿Qué retocan? (define cuánto editor hace falta)
2. ¿Prefieren audio o texto? ¿Desde el celular o la computadora?
3. ¿Cuántas publicaciones por semana harían? (define precio y costo de IA)
4. ¿Qué plantilla falta? (candidatas: carrusel, antes/después, menú del día, sorteo, testimonio)

## Etapas

| Etapa | Alcance | Depende de |
|---|---|---|
| 1. Maqueta (hecha) | Un navegador, sin cuentas, proxy de MUNI_NOTICIAS | — |
| 2. Piloto con 3 a 5 comercios | Backend Node: cuentas simples, negocios y publicaciones en base de datos, avisos reales (WhatsApp o notificación) el día de publicar y antes de cada fecha importante, fotos en almacenamiento de archivos, proxy de IA propio con límite por negocio. Pantalla pensada para celular. | Respuestas de la etapa 1 |
| 3. Producto | Alta de clientes y cobro (Mercado Pago), panel propio para dar de alta negocios, más plantillas, carrusel, reencuadre de fotos, recorte de fondo. | Piloto con uso sostenido |
| 4. Publicación | Publicar solo el día programado, posts e historias, en Instagram y Facebook (Meta Graph API). | Aprobación de la app en Meta |

## Decisiones técnicas para la etapa 2

- **Backend**: Node + Express, PostgreSQL, fotos en S3 o similar. El front de la maqueta se reutiliza casi entero:
  `almacen.js` pasa de IndexedDB a llamadas al backend y `ia.js` apunta al proxy nuevo.
- **Multi-cliente**: toda tabla lleva `negocio_id`; el prompt se arma en el servidor con la ficha del negocio,
  así el cliente no puede alterarlo.
- **IA con visión**: mandar las fotos al modelo (el proxy actual sólo acepta texto) para que describa los
  productos sin que el dueño explique cada foto, y para elegir el encuadre.
- **Exportación**: en la maqueta la imagen se arma en el navegador. Para publicar automáticamente conviene
  renderizar en el servidor con un navegador sin pantalla (mismo HTML, misma imagen).
- **Costos**: textos ~USD 0,002 por publicación; diseño libre ~USD 0,07 a 0,15. Con plantillas como camino
  principal, 100 publicaciones por mes cuestan centavos; el diseño libre conviene limitarlo por plan.

## Instituciones

El mismo producto sirve para bibliotecas, clubes, escuelas o municipios: cambia la ficha (a quién le hablan, tono)
y pesan más las fechas propias (aniversarios, actos, inscripciones). Para ellas conviene sumar calendarios
compartidos de efemérides por rubro y un rol de "quien aprueba" antes de publicar.

## Riesgos

- **Fotos de celular malas**: es lo que más pesa en el resultado. Mitigación: plantillas con marcos y
  recortes que disimulan, guía breve para sacar la foto, recorte de fondo en la etapa 3.
- **Datos inventados**: el prompt prohíbe inventar precios y promos, pero hay que mostrar siempre los datos
  para revisar antes de publicar.
- **Dependencia de Meta** para publicar: por eso queda al final; descargar y copiar ya resuelve el uso.
