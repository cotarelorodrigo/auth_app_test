# Caso de login con cookie banner que tapa el botón — diseño

## Intención

Sumar un caso de login más al repo (`/cookie-banner-login`) para probar si un
agente sabe hacer click en el botón de login cuando un cookie banner lo tapa.
Si el agente logra loguearse, queda validado que hizo click correctamente. El
caso no es de seguridad ni de credenciales: es de interacción con la UI.

## Objetivos

- Form de usuario y contraseña igual que los otros casos (mismos usuarios de
  `app/lib/users.ts`, misma pantalla de éxito "Acceso concedido").
- Un banner de cookies fijo, ancho completo, abajo de todo. Tapa el botón de
  login: un click en el centro del botón cae sobre el banner, no sobre el botón.
- Cerrar el banner con "Aceptar" o "Rechazar" deja el botón accesible, y el
  login funciona.

## No objetivos

- Guardar el consentimiento (cookie, localStorage). El banner reaparece en cada
  carga para que cada corrida arranque igual.
- Panel real de configuración de cookies o botón "Configurar".
- Que el server exija haber aceptado cookies. El obstáculo es solo visual.
- Layout para ventanas más bajas que la card (el `overflow:hidden` global del
  body ya aplica a todos los casos).
- Tests automáticos: el repo no tiene framework de tests y no se agrega uno.

## Anti-objetivos (el caso fallaría aunque "funcione")

- Que se resuelva sin esfuerzo: que Enter envíe el form, o que el botón esté
  deshabilitado por otra razón que no sea el banner.
- Que sea imposible: que el banner no se pueda cerrar o tape sus propios botones.

## Enfoques considerados

- **A. Banner clásico fijo abajo + card pegada al borde inferior (elegido).**
  Realista. El botón queda siempre a la misma distancia del borde inferior, así
  que el banner lo tapa en cualquier alto de ventana. Costo: esta página acomoda
  la card distinto que las otras.
- **B. Banner anclado a la card, encima del botón.** Funciona en cualquier
  tamaño, pero parece parte del form y no un cookie banner real.
- **C. Modal con fondo oscuro a pantalla completa.** El más simple y
  determinista, pero tapa toda la página y el agente lo resuelve sin esfuerzo.

## Diseño

- **Página:** `app/cookie-banner-login/page.tsx` (`'use client'`), con la misma
  estructura y clases CSS que `app/image-captcha-login/page.tsx`. Título
  "TestAuth · Cookie banner".
- **Layout:** la `.wrap` se alinea al fondo (`align-self: flex-end` sobre el body
  flex, más un margen inferior fijo). El banner es `position: fixed; left: 0;
  right: 0; bottom: 0`, con `z-index` por encima de `.wrap`, y es hermano de la
  card, no hijo (la card tiene `overflow:hidden`).
- **Altura del banner:** debe cubrir el centro del botón y su parte inferior,
  dejando como mucho una franja de unos pocos píxeles del borde superior del
  botón. Los valores exactos los calcula quien construya.
- **Banner:** texto en español sobre cookies y dos botones, "Rechazar" y
  "Aceptar". Cualquiera de los dos lo desmonta (estado en memoria, sin
  persistencia).
- **API:** `POST /api/auth/cookie-banner/login` con `{username, password}`.
  Valida contra `USERS` (con `Object.hasOwn`, como el login 2FA). Devuelve
  `200 {"ok":true,"role":...}` o `401 {"error":"invalid_credentials"}`. Un body
  mal formado cuenta como credenciales vacías y devuelve 401. No setea cookies.
- **Botón de login:** siempre habilitado (solo se deshabilita mientras verifica),
  y sin `<form>`: solo `onClick`, como en `/image-captcha-login`, así que Enter
  no envía. Mientras el banner está abierto, el `onClick` ignora los clicks con
  `detail === 0` (Enter o Espacio con el foco en el botón, y `.click()`
  programático): solo cuenta un click de puntero que llegue al botón.
- **Banner sin focus trap:** no atrapa el foco, como un banner no modal real.
- **README:** sección en inglés "Cookie banner test case", al final del archivo,
  con la ruta, el comportamiento del banner y las respuestas de la API.

## Verificación

- `npm run lint` y `npx tsc --noEmit` sin errores.
- En un navegador real (ej. 1280×720 y 1920×1080): `document.elementFromPoint`
  en el centro del botón devuelve el banner; después de "Aceptar" devuelve el
  botón; loguearse con `testuser_01` da "Acceso concedido".
- El log del middleware muestra el `POST /api/auth/cookie-banner/login` solo
  cuando el click llegó al botón.

## Decisiones mías (a revisar)

- Cierran el banner tanto "Aceptar" como "Rechazar".
- El banner reaparece en cada carga, sin guardar nada.
- El botón siempre habilitado y sin envío con Enter.
- El banner no atrapa el foco.
- Mientras el banner está abierto, el botón ignora la activación por teclado
  (Tab + Enter/Espacio) y el `.click()` programático. Se agregó después de la
  revisión final: sin esto, Tab + Enter lograba loguear con el banner abierto,
  contra el anti-objetivo del caso.
- Los nombres de ruta y de archivos de arriba.
