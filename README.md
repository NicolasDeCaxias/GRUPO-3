# BiblioTech - Sistema de Gestión de Biblioteca

Sistema de gestión para la **Biblioteca Provincial "Manuel Belgrano"**. Esta versión (Hito Final) es un MVP integrado: un frontend en HTML/CSS/JavaScript que consume una API REST propia hecha con Node.js y Express.

**Equipo:** Grupo 3 - Nicolas De Caxias, Leila Nahir, Tobias Corominas Leandro.

## Sistema publicado

| Servicio | URL |
| --- | --- |
| Frontend (Static Site) | `COMPLETAR: https://bibliotech-frontend.onrender.com` |
| Backend / API (Web Service) | `COMPLETAR: https://bibliotech-api.onrender.com` |

El backend corre en el plan gratuito de Render: tras un rato sin uso se "duerme" y la primera solicitud puede tardar hasta un minuto. Los datos viven en memoria, por lo que se reinician cuando el servidor se reinicia.

## Caso de uso implementado

**Solicitud, entrega y control de un préstamo**, con los tres roles:

1. **Socio** busca un libro y solicita un préstamo (queda *pendiente*).
2. **Bibliotecario** aprueba o rechaza la solicitud, registra la devolución, notifica a los socios morosos y da de baja ejemplares.
3. **Socio** consulta el estado de sus préstamos, sanciones y avisos.
4. **Director** consulta el tablero con indicadores y actividad de los socios, y **administra los usuarios**: registra bibliotecarios y socios asignándoles un usuario y una contraseña, y los da de baja o los reactiva.
5. **Bibliotecario** registra socios nuevos desde la sección *Socios*.

### Reglas de negocio (validadas en el servidor)

- Máximo de 3 préstamos simultáneos por socio (pendientes + activos).
- Un socio con préstamos vencidos queda sancionado y no puede pedir nuevos libros.
- Los libros de colección restringida solo se consultan en sala.
- Solo se puede prestar un ejemplar disponible que pertenezca al libro elegido.
- La fecha de solicitud y la fecha límite (14 días) las calcula el servidor.
- Las transiciones de estado son controladas: solo se aprueba o rechaza una solicitud pendiente, solo se devuelve un préstamo activo, solo se da de baja un ejemplar disponible.
- Cada rol accede únicamente a sus operaciones; un socio solo ve sus propios préstamos.
- Privacidad de menores: el apellido de los socios menores nunca sale del servidor.
- Alta de usuarios: solo el director registra bibliotecarios; el director y el bibliotecario registran socios. No se pueden crear directores desde la aplicación.
- El usuario es un nombre propio de la biblioteca (ej.: `pepe`, `maria.gomez`): 3 a 20 caracteres, minúsculas, números, punto, guion o guion bajo, sin `@` (no se aceptan correos). Es único, sin distinguir mayúsculas.
- La contraseña tiene entre 8 y 64 caracteres, combina letras y números, no puede contener el nombre de usuario y se guarda con hash (scrypt), nunca en texto plano.
- Un usuario dado de baja no puede ingresar y su sesión se cierra en el acto. No se da de baja a un socio con préstamos pendientes o activos, ni a un director, ni uno mismo. A un socio de baja no se le pueden registrar préstamos.

## Tecnologías

- **Backend:** Node.js, Express, datos en memoria (arrays y objetos).
- **Frontend:** HTML5, CSS3, JavaScript (DOM y `fetch`).
- **Despliegue:** Render (Static Site + Web Service).

## Estructura del repositorio

```
GRUPO-3/
├── backend/
│   ├── index.js
│   ├── servicios.js
│   ├── docs.js
│   ├── datos.js
│   ├── fechas.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── assets/
├── documentacion/
├── render.yaml
└── README.md
```

## Instalación y ejecución local

Requisitos: Node.js 18 o superior.

**Backend**

```bash
cd backend
npm install
npm start
```

La API queda en `http://localhost:3000`.

**Frontend**

Abrir `frontend/` con un servidor estático, por ejemplo la extensión Live Server de VS Code (clic derecho en `frontend/index.html` > *Open with Live Server*), o desde una terminal:

```bash
cd frontend
npx serve .
```

En local el frontend se conecta automáticamente a `http://localhost:3000`.

## Despliegue en Render

1. **Backend (Web Service):** New > Web Service, elegir este repositorio.
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Variable de entorno `FRONTEND_URL` con la URL pública del frontend (sin barra final).
2. **Frontend (Static Site):** New > Static Site, mismo repositorio.
   - Root Directory: `frontend`
   - Build Command: vacío
   - Publish Directory: `.`
3. Editar `frontend/js/config.js` y reemplazar `https://REEMPLAZAR-POR-URL-DEL-BACKEND.onrender.com` por la URL pública del backend. Hacer commit y push para que Render republique el frontend.
4. Verificar abriendo la URL del frontend e iniciando sesión.

El archivo `render.yaml` describe ambos servicios por si se prefiere crearlos como Blueprint.

## Usuarios de prueba

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Socio | lucia | `Lucia#Libro26` |
| Socio (moroso) | carlos | `Carlos#Mapa26` |
| Socio (menor) | tomas | `Tomas#Luna26` |
| Socio | sofia | `Sofia#Rio26` |
| Bibliotecario | julia | `Julia#Tinta26` |
| Bibliotecario | roberto | `Roberto#Lupa26` |
| Director | alicia | `Alicia#Faro26` |
| Director | hector | `Hector#Cima26` |

Son contraseñas de demostración. Para dejar de exponerlas en la pantalla de login, definir `MODO_DEMO=false` en el servidor.

La pantalla de inicio de sesión lista estos usuarios consultándolos al servidor. Con la variable `MODO_DEMO=false` el servidor deja de informar usuarios y contraseñas y deshabilita el botón de restablecer datos.

Los usuarios que se registran desde la aplicación (por ejemplo `pepe`) viven en memoria y desaparecen cuando el servidor se reinicia o se usa *Restablecer datos de demostración*.

### Sugerencia de recorrido para la demo

1. **Director** (`alicia`) entra a *Usuarios* y registra a `pepe` como bibliotecario.
2. **Bibliotecario** (`pepe`) ingresa, entra a *Socios* y registra a `marta`.
3. **Socio** (`marta`) ingresa y solicita un préstamo.
4. **Bibliotecario** (`pepe`) aprueba la solicitud en *Gestión*.
5. **Director** consulta el tablero y, si quiere, da de baja a un usuario.

Para repetir la demostración desde cero, usar el botón **Restablecer datos de demostración** del pie de página.

## Documentación de la API

La documentación también se publica como **página web** en la raíz del backend (`https://<url-del-backend>/`, o `http://localhost:3000/` en local), con la tabla de endpoints y botones para probar los pedidos públicos. La versión en JSON está en `GET /api/docs`. Ambas salen de la lista definida en `backend/docs.js`; si se agrega un endpoint, hay que sumarlo ahí.

Base: `/api`. Todos los intercambios son JSON. Salvo los endpoints públicos, se envía la cabecera `Authorization: Bearer <token>` obtenida en el login. Los errores responden `{ "error": "mensaje" }`.

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/api/salud` | público | Comprueba que el servidor está activo. |
| GET | `/api/docs` | público | Documentación de la API en JSON (la página está en `/`). |
| GET | `/api/config` | público | Días de préstamo, máximo de préstamos, fecha de hoy y fecha límite estimada. |
| GET | `/api/demo-usuarios` | público | Usuarios de demostración para la pantalla de login. |
| POST | `/api/login` | público | Inicia sesión con `usuario` y `clave`; devuelve `token` y datos del usuario. |
| POST | `/api/logout` | autenticado | Cierra la sesión. |
| GET | `/api/sesion` | autenticado | Devuelve el usuario de la sesión actual. |
| POST | `/api/demo/reiniciar` | autenticado | Restablece los datos de demostración. |
| GET | `/api/libros?q=` | autenticado | Lista libros con disponibilidad; `q` filtra por título, autor, género o código. |
| GET | `/api/stock/resumen` | autenticado | Totales del inventario. |
| GET | `/api/socios` | bibliotecario | Lista de socios (usuario, nombre visible, estado, préstamos vigentes y vencidos). |
| GET | `/api/usuarios?rol=` | director | Lista los usuarios (sin contraseñas); `rol` filtra por `socio`, `bibliotecario` o `director`. |
| POST | `/api/usuarios` | director, bibliotecario | Registra un usuario con `usuario`, `clave`, `nombre`, `apellido`, `rol` (`socio` o `bibliotecario`) y `esMenor` opcional. El bibliotecario solo puede registrar socios. |
| PATCH | `/api/usuarios/:id/estado` | director | Da de baja o reactiva un usuario con `{ "activo": false \| true }`. |
| POST | `/api/prestamos` | socio, bibliotecario | Crea una solicitud de préstamo (`libroId`, `ejemplarId`, y `socioId` si lo registra el bibliotecario). |
| GET | `/api/prestamos/mios` | socio | Préstamos del socio con estado, vencimiento y atraso. |
| GET | `/api/prestamos/resumen` | socio | Cupo usado, vencidos y avisos sin leer. |
| GET | `/api/prestamos?estado=` | bibliotecario | Lista préstamos por estado: `pendiente`, `activo`, `vencido` o `vence-hoy`. |
| GET | `/api/prestamos/:id` | socio (propio), bibliotecario | Comprobante de un préstamo. |
| PATCH | `/api/prestamos/:id/estado` | bibliotecario | Cambia el estado: `activo` (aprobar), `rechazado` o `devuelto`. |
| POST | `/api/prestamos/:id/notificaciones` | bibliotecario | Envía un aviso al socio por un préstamo vencido. |
| GET | `/api/notificaciones/mias` | socio | Avisos de la biblioteca del socio. |
| PATCH | `/api/notificaciones/mias/leidas` | socio | Marca los avisos como leídos. |
| GET | `/api/ejemplares?estado=` | bibliotecario | Lista ejemplares, opcionalmente por estado. |
| PATCH | `/api/ejemplares/:id/estado` | bibliotecario | Da de baja un ejemplar (`estado: "baja"`). |
| GET | `/api/tablero` | director | Indicadores, categorías más leídas, libros sin stock y actividad de socios. |

Códigos de estado: `200` OK, `201` creado, `400` datos inválidos, `401` sin sesión, `403` rol sin permiso, `404` no existe, `409` conflicto de estado o usuario repetido, `422` regla de negocio incumplida.

## Limitaciones y mejoras futuras

- Los datos están en memoria y se pierden al reiniciar el servidor; el siguiente paso es una base de datos.
- La autenticación es simple: las contraseñas se guardan con hash, pero las sesiones son tokens en memoria. Corresponde usar JWT o sesiones persistentes, y que el usuario pueda cambiar su propia contraseña.
- Falta la gestión de reservas con lista de espera, la renovación de préstamos y el alta de libros desde la interfaz.
- No hay pruebas automatizadas.
