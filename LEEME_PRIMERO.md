# NutriFoto — app para iPhone (gratis)

Esta es una **aplicación web instalable (PWA)** pensada para iPhone. No se publica en la App Store, no requiere pagar por una cuenta de desarrollador de Apple, no tiene suscripciones y no usa servidores de pago.

## ¿Qué puede hacer?

- **Hacer una foto o elegir una imagen**, reconocer una de 101 clases de platos mediante un modelo de IA gratuito e indicar un **cálculo aproximado** de kcal.
- Proponer hasta 3 platos; puedes elegir el correcto, modificar los gramos y las kcal por cada 100 g.
- Añadir comida manualmente con un buscador de **171 alimentos**, o introducir una comida nueva y sus kcal por 100 g.
- Elegir tu propio **límite diario** de calorías y consultar consumidas y restantes.
- Guardar desayuno, comida, cena y entre horas; consultar el historial por fecha y un gráfico de 7 días.
- Registrar peso y fecha, ver una gráfica de progreso, editar el peso de un día y borrar mediciones.
- Exportar e importar copias de seguridad `.json` desde Ajustes.

## Instalarla gratis en el iPhone (con GitHub Pages)

El paquete está listo, pero **no está publicado todavía en una URL**. Para instalarlo necesitas alojarlo en un sitio HTTPS. GitHub Pages permite hacerlo gratis en un repositorio público (el código será público, pero las comidas y los pesos que registres no se suben al repositorio).

### 1. Publicarla (preferiblemente desde un ordenador)

1. Descomprime `NutriFoto_iOS_gratis.zip`.
2. En https://github.com/ crea una cuenta gratuita, si todavía no tienes.
3. Crea un repositorio **Public** llamado, por ejemplo, `nutrifoto`.
4. En ese repositorio, usa **Add file → Upload files** y sube el **contenido** de la carpeta descomprimida, respetando las subcarpetas `icons/`. Deben quedar `index.html`, `app.js`, `foods.js`, `styles.css`, `manifest.webmanifest`, `sw.js` y `icons/` en la raíz del repositorio. Pulsa **Commit changes**.
5. Ve a **Settings → Pages → Build and deployment → Deploy from a branch**. Selecciona **main**, carpeta **/(root)** y guarda.
6. GitHub Pages publicará una dirección similar a `https://TU-USUARIO.github.io/nutrifoto/`. Puedes encontrar la URL exacta en **Settings → Pages**.

### 2. Añadirla a la pantalla de inicio

1. Abre la URL de GitHub Pages **con Safari en el iPhone**.
2. Pulsa **Compartir** y después **Añadir a pantalla de inicio** (a veces está en el menú `···` de Safari).
3. Mantén activado **Abrir como app web** y pulsa **Añadir**.
4. Ya tendrás el icono verde de **NutriFoto** como si fuese una app. Ábrela desde allí.

## Primer uso de la cámara

1. Pulsa **Hacer una foto**, y después **Abrir cámara** o **Elegir de Fotos**.
2. El primer reconocimiento necesita conexión a internet para descargar un modelo gratuito de aproximadamente **93 MB**; no te pedirá tarjeta, cuenta ni clave API.
3. El modelo analiza la imagen dentro de tu navegador y propone un nombre para el plato. La cantidad (gramos) es inicialmente una ración típica: **corrígela tú**.
4. Revisa el alimento y los valores energéticos, elige desayuno/comida/cena/entre horas y pulsa **Añadir al diario**.
5. Si el reconocimiento no se carga en tu iPhone, podrás registrar la comida manualmente en el mismo formulario.

## Privacidad, precisión y conservación

- Las comidas, las mediciones de peso y el límite diario se guardan mediante `localStorage` **en ese dispositivo y en esa instalación de la app**. No hay cuenta ni sincronización entre dispositivos.
- Las fotografías se utilizan temporalmente para el cálculo local y **no se almacenan** en el diario. El navegador descarga el código y el modelo desde servicios de terceros (CDN/Hugging Face), pero la fotografía no se envía a una API de reconocimiento.
- Es importante usar **Ajustes → Exportar copia de seguridad** de vez en cuando. Si desinstalas la app, borras los datos del sitio o el sistema limpia el almacenamiento, podrías perder los registros.
- El diario funciona sin conexión después de instalarlo y abrirlo con conexión. El reconocimiento de fotos depende de que el modelo se haya descargado y siga almacenado en la caché del navegador.
- Una foto **no permite determinar de forma fiable** el peso de la ración, ingredientes ocultos, aceite, salsas ni calorías exactas. El modelo solo está entrenado para 101 tipos de plato y puede equivocarse, especialmente con platos compuestos. Las kcal de la base de datos son **orientativas, no valores verificados de cada receta**.
- No sustituye etiquetas nutricionales ni asesoramiento sanitario. El límite diario se configura por el usuario y no es una recomendación automática de dieta.
- La descarga y disponibilidad de los recursos públicos de Hugging Face/CDN están sujetas al servicio de sus proveedores; no generan cargos a tu cuenta en esta aplicación.

## Archivos de la aplicación

- `index.html`: pantallas y estructura.
- `styles.css`: diseño adaptado al móvil.
- `app.js`: registro diario, cámara, IA, historial, peso y copias.
- `foods.js`: catálogo de alimentos y calorías aproximadas.
- `manifest.webmanifest`, `sw.js`, `icons/`: instalación en iPhone, soporte sin conexión y logotipo.

## Verla antes en el ordenador

Con Python instalado, abre una terminal dentro de la carpeta y ejecuta:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000` en el navegador. Para instalarla en el iPhone sí necesitas la URL HTTPS, por ejemplo con GitHub Pages.

Proyecto original preparado como primera versión funcional. La inferencia específica y el aspecto en un iPhone físico no se han podido probar en este entorno; comprueba el funcionamiento en Safari al publicarla.
