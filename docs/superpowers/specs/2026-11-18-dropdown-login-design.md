# Caso de login con el form dentro de un dropdown — diseño

## Intención

Sumar un caso de login más al repo (`/dropdown-login`) para probar si un agente
sabe encontrar y abrir un dropdown que se desliza, donde está el form de login.
Si el agente logra loguearse, queda validado que llegó al form. Igual que el del
cookie banner, no es un caso de seguridad ni de credenciales: es de interacción
con la UI.

## Objetivos

- Form de usuario y contraseña igual que los otros casos (mismos usuarios de
  `app/lib/users.ts`, misma pantalla de éxito "Acceso concedido").
- El form no está a la vista al cargar. Está dentro de un panel que se desliza
  hacia abajo desde un botón "Iniciar sesión ▾" en una barra superior.
- Mientras el panel está cerrado, los campos no se pueden clickear ni enfocar.

## No objetivos

- Abrir con hover, menús anidados, iframe o shadow DOM: son otros casos.
- Guardar el estado del panel. Arranca cerrado en cada carga.
- Tests automáticos: el repo no tiene framework de tests y no se agrega uno.

## Anti-objetivos (el caso fallaría aunque "funcione")

- Que se resuelva sin esfuerzo: que los campos estén accesibles con el panel
  cerrado.
- Que sea imposible: que el botón no esté claramente rotulado, que haga falta
  hover o que el panel se cierre solo.

## Enfoques considerados

- **A. Panel que se desliza con `grid-template-rows` 0fr → 1fr, cerrado con
  `visibility: hidden` (elegido).** Slide real sin alturas fijas, y los campos
  quedan fuera del alcance (click, foco, Tab) hasta que se abre. Mantiene lo
  escrito al cerrar.
- **B. Montar y desmontar el form al abrir y cerrar.** Más simple, pero se pierde
  la animación de cierre y lo escrito.
- **C. `<details>` o `popover` nativos.** Sin JS, pero el deslizamiento no es
  controlable y el caso queda más fácil de lo pedido.

## Diseño

- **Página:** `app/dropdown-login/page.tsx` (`'use client'`), con las clases CSS
  de los otros casos. Barra fija arriba con "TestAuth · Dropdown" a la izquierda
  y el botón a la derecha. Al centro, una card "Área privada" ("Necesitás iniciar
  sesión para continuar."), sin decir dónde.
- **Panel:** hermano de la card, no hijo (la card tiene `overflow:hidden`), anclado
  bajo el botón y alineado a su derecha, 340 px de ancho como máximo. Se abre
  con un click en ~0.4 s. Cerrado es `visibility: hidden`, con la visibilidad
  demorada lo que dura la animación para que se vea cerrarse.
- **Botón:** `<button>` con `aria-expanded` y `aria-controls`.
- **Cierre:** un click fuera o Escape cierran el panel. Lo escrito se mantiene.
- **Form:** un `<form>` real: Enter envía. El obstáculo es llegar al form, no
  enviarlo.
- **Éxito y error:** un login mal hecho muestra el error dentro del panel y lo deja
  abierto. Uno bien hecho cierra el panel y muestra "Acceso concedido" en la card
  de la página, con "Cerrar sesión" para empezar de nuevo (el botón de la barra
  desaparece mientras hay sesión).
- **API:** `POST /api/auth/dropdown/login` con `{username, password}`. Igual que la
  del cookie banner: valida contra `USERS` (con `Object.hasOwn`), devuelve
  `200 {"ok":true,"role":...}` o `401 {"error":"invalid_credentials"}`, un body mal
  formado cuenta como credenciales vacías y no setea cookies.
- **README:** sección en inglés "Dropdown test case", al final del archivo.

## Verificación

- `npm run lint` y `npx tsc --noEmit` sin errores.
- Navegador real (1280×720, 1920×1080 y 390×700): con el panel cerrado los
  campos no son visibles ni enfocables con Tab; a los 120 ms de abrir el panel
  está a mitad de altura; abierto, `elementFromPoint` en el centro de cada campo
  devuelve el campo; un click fuera y Escape lo cierran sin perder lo escrito;
  login incorrecto muestra el error, y uno correcto (con Enter) da "Acceso
  concedido".
- El log del middleware muestra el `POST /api/auth/dropdown/login` solo cuando
  el form se envió.

## Decisiones mías (a revisar)

- Rótulo del botón "Iniciar sesión", sin esconderlo detrás de un ícono o un
  nombre ambiguo como "Mi cuenta".
- Se abre solo con click (sin hover), en ~0.4 s.
- Un click fuera y Escape cierran el panel, como un dropdown normal.
- Form real con envío por Enter, a diferencia del cookie banner: ahí Enter se
  saltaba el obstáculo, acá no.
- El botón de la barra desaparece mientras hay sesión iniciada.
- La card del medio dice "Necesitás iniciar sesión para continuar." sin señalar
  el botón.
- Los nombres de ruta y de archivos de arriba.
