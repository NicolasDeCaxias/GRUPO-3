# Sistema de Gestión de Biblioteca - BiblioTech

## Caso de estudio

**Sistema de Gestión de Biblioteca "BiblioTech"** para la
**Biblioteca Provincial "Manuel Belgrano"**.

Este proyecto corresponde al desarrollo de un prototipo web
navegable realizado como parte de los Hitos 2 y 3 de la asignatura
Prácticas Profesionalizantes I.

---

## Equipo desarrollador

**Equipo:** Grupo 3

### Integrantes

- Nicolas De Caxias
- Leila Nahir
- Tobias Corominas Leandro

---

## Descripción del sistema

BiblioTech es una aplicación web destinada a mejorar la gestión
de préstamos, reservas, inventario y socios de la Biblioteca
Provincial "Manuel Belgrano".

El sistema permitirá a los socios consultar el catálogo de libros,
verificar la disponibilidad de los ejemplares, solicitar préstamos
y consultar el estado de sus préstamos e historial de lecturas.

También permitirá al personal de la biblioteca gestionar los
préstamos, devoluciones, ejemplares disponibles y libros que se
encuentren restringidos para préstamo a domicilio.

En el Hito 2 se desarrolló un prototipo navegable con HTML5 y CSS.
En el Hito 3 se incorporó JavaScript: los datos se cargan desde
`data/datos.json` con `fetch()`, los cambios y la sesión se guardan
en `localStorage` y la interfaz se genera dinámicamente según el rol.

---

## Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript (DOM, fetch, localStorage, JSON)
- Git
- GitHub

---

## Organización del proyecto

```
BiblioTech/
├── index.html
├── README.md
├── css/styles.css
├── data/datos.json
├── images/logo_bibliotech.png
├── js/scripts.js
├── documentacion/
└── pages/
    ├── login.html
    ├── catalogo.html
    ├── stock.html
    ├── reserva.html
    ├── confirmacion.html
    ├── resultados.html   (socio)
    ├── gestion.html      (bibliotecario)
    └── tablero.html      (director)
```

---

## Cómo ejecutar

La app carga `data/datos.json` con `fetch()`, por lo que lo ideal es usar
un servidor local, por ejemplo la extensión **Live Server** de VS Code
(clic derecho en `index.html` > *Open with Live Server*).

Si se abre el HTML con doble clic, `fetch()` falla y la app usa una copia
de respaldo (`data/datos.js`). Funciona bien en Chrome; en Firefox
`localStorage` puede no compartirse entre páginas, por eso se recomienda
el servidor local.

Para volver a los datos originales usar el botón
**Restablecer datos de demostración** del pie de página.

---

## Usuarios de prueba (contraseña: `1234`)

| Rol           | Usuarios                                  |
|---------------|-------------------------------------------|
| Socio         | lucia, carlos (moroso), tomas (menor), sofia |
| Bibliotecario | julia, roberto                            |
| Director      | alicia, hector                            |

---

## Funcionalidades del Hito 3

- Inicio de sesión simulado con los usuarios de `datos.json`.
- Menú y páginas según el rol (socio, bibliotecario, director).
- Catálogo y disponibilidad generados desde los datos, con búsqueda.
- Solicitud de préstamo con validaciones: máximo 3 préstamos
  simultáneos, libros restringidos solo en sala, sin stock y socios
  con préstamos vencidos.
- Comprobante con fecha límite de devolución (14 días).
- Bibliotecario: aprobar o rechazar solicitudes, registrar devoluciones,
  reporte de vencidos, notificar morosos y dar de baja ejemplares
  (interfaz de alto contraste y botones grandes).
- Director: tablero con indicadores, categorías más leídas, libros sin
  stock y actividad de socios.
- Privacidad: no se muestra el apellido de los socios menores.
