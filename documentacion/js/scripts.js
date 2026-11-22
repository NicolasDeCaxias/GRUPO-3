
/* ---------- Constantes y estado global ---------- */

const CLAVE_DATOS = 'bibliotech_datos';
const CLAVE_SESION = 'bibliotech_sesion';
const CLAVE_ULTIMA = 'bibliotech_ultima_solicitud';

// Las páginas están en /pages/, el index en la raíz
const EN_PAGES = window.location.pathname.includes('/pages/');
const RAIZ = EN_PAGES ? '../' : '';
const PAGINAS = EN_PAGES ? '' : 'pages/';

let datos = null;          // estado completo de la aplicación
let usuarioActual = null;  // usuario conectado

const TODOS = ['socio', 'bibliotecario', 'director'];

// Qué roles pueden entrar a cada página
const PERMISOS = {
    index: TODOS,
    catalogo: TODOS,
    stock: TODOS,
    reserva: ['socio', 'bibliotecario'],
    confirmacion: ['socio', 'bibliotecario'],
    resultados: ['socio'],
    gestion: ['bibliotecario'],
    tablero: ['director']
};

// Menú de navegación según el rol
const MENU = {
    socio: [
        ['Inicio', 'index'], ['Catálogo', 'catalogo'], ['Disponibilidad', 'stock'],
        ['Reservas', 'reserva'], ['Mis préstamos', 'resultados']
    ],
    bibliotecario: [
        ['Inicio', 'index'], ['Gestión', 'gestion'], ['Catálogo', 'catalogo'],
        ['Disponibilidad', 'stock'], ['Registrar préstamo', 'reserva']
    ],
    director: [
        ['Inicio', 'index'], ['Tablero', 'tablero'], ['Catálogo', 'catalogo'],
        ['Disponibilidad', 'stock']
    ]
};

// Accesos rápidos de la página de inicio según el rol
const SERVICIOS = {
    socio: [
        ['📚 Catálogo de libros', 'Consultá los libros disponibles buscando por título, autor o género.', 'catalogo', 'Consultar catálogo'],
        ['📦 Disponibilidad', 'Verificá cuántos ejemplares están disponibles, prestados o sin stock.', 'stock', 'Consultar disponibilidad'],
        ['📝 Solicitar un préstamo', 'Seleccioná un ejemplar disponible y realizá una solicitud de préstamo.', 'reserva', 'Solicitar préstamo'],
        ['📋 Mis préstamos', 'Consultá tus préstamos activos, libros devueltos y posibles sanciones.', 'resultados', 'Ver mis préstamos']
    ],
    bibliotecario: [
        ['🗂️ Gestión de préstamos', 'Aprobá entregas, registrá devoluciones, notificá morosos y dá de baja ejemplares.', 'gestion', 'Ir a gestión'],
        ['📝 Registrar un préstamo', 'Cargá una solicitud de préstamo en nombre de un socio.', 'reserva', 'Registrar préstamo'],
        ['📦 Disponibilidad', 'Lista unificada de todo el catálogo con su estado.', 'stock', 'Ver disponibilidad'],
        ['📚 Catálogo de libros', 'Buscá libros por título, autor o género.', 'catalogo', 'Consultar catálogo']
    ],
    director: [
        ['📊 Tablero de control', 'Estado de los libros y actividad de los socios de un vistazo.', 'tablero', 'Ver tablero'],
        ['📦 Disponibilidad', 'Estado de todos los ejemplares del inventario.', 'stock', 'Ver disponibilidad'],
        ['📚 Catálogo de libros', 'Buscá libros por título, autor o género.', 'catalogo', 'Consultar catálogo']
    ]
};


/* ---------- Utilidades para el DOM ---------- */

function crear(etiqueta, texto, clase) {
    const e = document.createElement(etiqueta);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (clase) e.className = clase;
    return e;
}

function campo(etiqueta, valor) {
    const p = crear('p');
    p.append(crear('strong', etiqueta + ':'), ' ' + valor);
    return p;
}

function boton(texto, accion, clase) {
    const b = crear('button', texto, clase);
    b.type = 'button';
    b.addEventListener('click', accion);
    return b;
}

function enlace(texto, href) {
    const a = crear('a', texto);
    a.href = href;
    const p = crear('p');
    p.append(a);
    return p;
}

function tarjeta(titulo, filas, clase) {
    const art = crear('article', null, clase);
    art.append(crear('h3', titulo));
    filas.forEach(([etiqueta, valor]) => art.append(campo(etiqueta, valor)));
    return art;
}

function vacio(contenedor, mensaje) {
    contenedor.append(crear('p', mensaje));
}

function contenedorAvisos() {
    let c = document.querySelector('#avisos');
    if (!c) {
        c = crear('div');
        c.id = 'avisos';
        document.querySelector('main').prepend(c);
    }
    return c;
}

function mostrarAviso(texto, tipo) {
    const d = crear('div', texto, 'aviso aviso-' + (tipo || 'info'));
    d.setAttribute('role', 'alert');
    contenedorAvisos().append(d);
}

function quitarAvisos(tipo) {
    contenedorAvisos().querySelectorAll('.aviso-' + tipo).forEach(a => a.remove());
}

function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


/* ---------- Fechas ---------- */

function fechaISO(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function hoyISO() {
    return fechaISO(new Date());
}

function sumarDias(iso, dias) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    return fechaISO(d);
}

function diasEntre(desde, hasta) {
    return Math.round((new Date(hasta + 'T12:00:00') - new Date(desde + 'T12:00:00')) / 86400000);
}

function formatearFecha(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return d + '/' + m + '/' + a;
}


/* ---------- Persistencia: fetch + localStorage ---------- */

async function cargarDatos() {
    const guardado = localStorage.getItem(CLAVE_DATOS);
    if (guardado) {
        try {
            datos = JSON.parse(guardado);
            return;
        } catch (e) {
            localStorage.removeItem(CLAVE_DATOS);
        }
    }
    try {
        const respuesta = await fetch(RAIZ + 'data/datos.json');
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        datos = await respuesta.json();
    } catch (error) {
        // Sin servidor (doble clic sobre el HTML) fetch() falla: se usa la copia de data/datos.js
        if (typeof DATOS_RESPALDO === 'undefined') throw error;
        datos = JSON.parse(JSON.stringify(DATOS_RESPALDO));
    }
    guardar();
}

function guardar() {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
}

function leerSesion() {
    const texto = localStorage.getItem(CLAVE_SESION);
    if (!texto) return null;
    try {
        const sesion = JSON.parse(texto);
        return datos.usuarios.find(u => u.id === sesion.id) || null;
    } catch (e) {
        return null;
    }
}

function cerrarSesion() {
    localStorage.removeItem(CLAVE_SESION);
    window.location.href = PAGINAS + 'login.html';
}


/* ---------- Lógica de negocio ---------- */

function libroPorId(id) { return datos.libros.find(l => l.id === id); }
function usuarioPorId(id) { return datos.usuarios.find(u => u.id === id); }
function ejemplarPorId(id) { return datos.ejemplares.find(e => e.id === id); }

function ejemplaresDe(libroId) {
    return datos.ejemplares.filter(e => e.libroId === libroId && e.estado !== 'baja');
}

function disponiblesDe(libroId) {
    return ejemplaresDe(libroId).filter(e => e.estado === 'disponible');
}

function estadoLibro(libro) {
    if (libro.restringido) return 'Consulta en sala';
    return disponiblesDe(libro.id).length > 0 ? 'Disponible' : 'Sin stock';
}

// Préstamos que cuentan para el cupo (pendientes + activos)
function prestamosVigentesDe(usuarioId) {
    return datos.prestamos.filter(p =>
        p.usuarioId === usuarioId && (p.estado === 'pendiente' || p.estado === 'activo'));
}

function prestamosVencidos() {
    const hoy = hoyISO();
    return datos.prestamos.filter(p => p.estado === 'activo' && p.fechaLimite < hoy);
}

function vencidosDe(usuarioId) {
    return prestamosVencidos().filter(p => p.usuarioId === usuarioId);
}

// Protección de menores: no se muestra el apellido
function nombreVisible(u) {
    return u.esMenor ? u.nombre + ' (socio menor)' : u.nombre + ' ' + u.apellido;
}

function siguienteId(lista, prefijo) {
    const mayor = lista.reduce((max, x) => Math.max(max, parseInt(x.id.slice(prefijo.length), 10) || 0), 0);
    return prefijo + String(mayor + 1).padStart(3, '0');
}

// Devuelve un mensaje de error si la solicitud no es válida, o null si está bien
function validarSolicitud(socioId, libroId, ejemplarId) {
    const socio = usuarioPorId(socioId);
    const libro = libroPorId(libroId);
    const ejemplar = ejemplarPorId(ejemplarId);

    if (!socio) return 'Seleccioná un socio.';
    if (!libro) return 'Seleccioná un libro.';

    const sujeto = usuarioActual.rol === 'socio' ? 'Tenés' : nombreVisible(socio) + ' tiene';

    if (vencidosDe(socioId).length > 0) {
        return sujeto + ' una sanción vigente por préstamos vencidos. Debe devolverlos antes de pedir otro libro.';
    }
    if (prestamosVigentesDe(socioId).length >= datos.config.maxPrestamos) {
        return 'No se puede llevar un libro más: el máximo permitido es de ' +
            datos.config.maxPrestamos + ' préstamos simultáneos.';
    }
    if (libro.restringido) {
        return '"' + libro.titulo + '" pertenece a una colección restringida. Solo puede consultarse en sala de lectura.';
    }
    if (disponiblesDe(libroId).length === 0) {
        return '"' + libro.titulo + '" no tiene ejemplares disponibles en este momento.';
    }
    if (!ejemplar || ejemplar.estado !== 'disponible') {
        return 'Seleccioná un ejemplar disponible.';
    }
    return null;
}


/* ---------- Estructura común de las páginas ---------- */

function construirMenu() {
    const ul = document.querySelector('#menu');
    if (!ul) return;
    ul.replaceChildren();

    const items = usuarioActual ? MENU[usuarioActual.rol] : [['Inicio', 'index'], ['Ingresar', 'login']];
    items.forEach(([texto, pagina]) => {
        const li = crear('li');
        const a = crear('a', texto);
        a.href = pagina === 'index' ? RAIZ + 'index.html' : PAGINAS + pagina + '.html';
        li.append(a);
        ul.append(li);
    });

    if (usuarioActual) {
        const li = crear('li');
        const a = crear('a', 'Salir (' + usuarioActual.nombre + ')');
        a.href = '#';
        a.addEventListener('click', e => { e.preventDefault(); cerrarSesion(); });
        li.append(a);
        ul.append(li);
    }
}

function construirPie() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const p = crear('p');
    p.style.marginTop = '10px';
    p.append(boton('Restablecer datos de demostración', () => {
        if (window.confirm('Se borrarán todos los cambios y se volverá a cargar datos.json. ¿Continuar?')) {
            localStorage.removeItem(CLAVE_DATOS);
            localStorage.removeItem(CLAVE_SESION);
            localStorage.removeItem(CLAVE_ULTIMA);
            window.location.href = PAGINAS + 'login.html';
        }
    }));
    footer.append(p);
}

function mostrarAvisosDelSocio() {
    if (usuarioActual.rol !== 'socio') return;
    const sinLeer = datos.notificaciones.filter(n => n.usuarioId === usuarioActual.id && !n.leida);
    if (sinLeer.length > 0) {
        mostrarAviso('🔔 Tenés ' + sinLeer.length + ' aviso(s) de la biblioteca sin leer. Revisalos en "Mis préstamos".', 'alerta');
    }
    const vencidos = vencidosDe(usuarioActual.id);
    if (vencidos.length > 0) {
        mostrarAviso('⚠️ Tenés ' + vencidos.length + ' préstamo(s) vencido(s). Mientras no los devuelvas no podrás pedir nuevos libros.', 'error');
    }
}


/* ---------- Inicio de sesión ---------- */

function iniciarLogin() {
    if (usuarioActual) {
        window.location.href = RAIZ + 'index.html';
        return;
    }

    document.querySelector('#form-login').addEventListener('submit', e => {
        e.preventDefault();
        quitarAvisos('error');
        const usuario = document.querySelector('#usuario').value.trim();
        const clave = document.querySelector('#clave').value;
        const encontrado = datos.usuarios.find(u => u.usuario === usuario && u.clave === clave);

        if (!encontrado) {
            mostrarAviso('Usuario o contraseña incorrectos.', 'error');
            return;
        }
        localStorage.setItem(CLAVE_SESION, JSON.stringify({
            id: encontrado.id,
            usuario: encontrado.usuario,
            nombre: encontrado.nombre,
            rol: encontrado.rol
        }));
        window.location.href = RAIZ + 'index.html';
    });

    // Lista de usuarios de prueba, generada desde datos.json
    const cont = document.querySelector('#usuarios-demo');
    if (cont) {
        TODOS.forEach(rol => {
            const art = crear('article');
            art.append(crear('h3', rol.charAt(0).toUpperCase() + rol.slice(1) + 's'));
            datos.usuarios.filter(u => u.rol === rol).forEach(u => {
                art.append(crear('p', 'Usuario: ' + u.usuario + ' — Contraseña: ' + u.clave +
                    (u.esMenor ? ' (socio menor)' : '')));
            });
            cont.append(art);
        });
    }
}


/* ---------- Inicio ---------- */

function iniciarIndex() {
    document.querySelector('#titulo-bienvenida').textContent = 'Bienvenido/a, ' + usuarioActual.nombre;

    const resumen = document.querySelector('#resumen-usuario');
    resumen.append(crear('p', 'Ingresaste como ' + usuarioActual.rol + '.'));
    if (usuarioActual.rol === 'socio') {
        const vigentes = prestamosVigentesDe(usuarioActual.id).length;
        resumen.append(crear('p', 'Tenés ' + vigentes + ' de ' + datos.config.maxPrestamos +
            ' préstamos simultáneos permitidos.'));
    }

    const cont = document.querySelector('#servicios');
    SERVICIOS[usuarioActual.rol].forEach(([titulo, texto, pagina, enlaceTexto]) => {
        const art = crear('article');
        art.append(crear('h3', titulo), crear('p', texto),
            enlace(enlaceTexto, PAGINAS + pagina + '.html'));
        cont.append(art);
    });
}


/* ---------- Catálogo ---------- */

function iniciarCatalogo() {
    const form = document.querySelector('#form-busqueda');
    const input = document.querySelector('#busqueda');
    const lista = document.querySelector('#lista-libros');

    function dibujar() {
        const texto = normalizar(input.value.trim());
        lista.replaceChildren();

        const resultado = datos.libros.filter(l =>
            normalizar(l.titulo).includes(texto) ||
            normalizar(l.autor).includes(texto) ||
            normalizar(l.genero).includes(texto));

        if (resultado.length === 0) {
            vacio(lista, 'No se encontraron libros para esa búsqueda.');
            return;
        }

        resultado.forEach(libro => {
            const estado = estadoLibro(libro);
            const art = tarjeta(libro.titulo, [
                ['Autor', libro.autor],
                ['Género', libro.genero],
                ['Ejemplares disponibles', disponiblesDe(libro.id).length],
                ['Estado', estado]
            ]);

            if (estado === 'Sin stock') {
                art.append(crear('p', '⚠️ Actualmente no hay ejemplares disponibles para préstamo.', 'aviso aviso-alerta'));
            } else if (estado === 'Consulta en sala') {
                art.append(crear('p', '📖 Este ejemplar pertenece a una colección restringida. No está permitido realizar préstamos a domicilio.', 'aviso aviso-info'));
            } else if (usuarioActual.rol !== 'director') {
                art.append(enlace('Reservar ejemplar', 'reserva.html?libro=' + libro.id));
            }
            lista.append(art);
        });
    }

    form.addEventListener('submit', e => { e.preventDefault(); dibujar(); });
    input.addEventListener('input', dibujar);
    dibujar();
}


/* ---------- Disponibilidad ---------- */

function iniciarStock() {
    const form = document.querySelector('#form-busqueda');
    const input = document.querySelector('#busqueda');
    const lista = document.querySelector('#lista-stock');

    function dibujar() {
        const texto = normalizar(input.value.trim());
        lista.replaceChildren();

        const resultado = datos.libros.filter(l =>
            normalizar(l.titulo).includes(texto) ||
            normalizar(l.autor).includes(texto) ||
            l.codigo.includes(texto));

        if (resultado.length === 0) {
            vacio(lista, 'No se encontraron libros para esa búsqueda.');
            return;
        }

        resultado.forEach(libro => {
            const total = ejemplaresDe(libro.id).length;
            const disponibles = disponiblesDe(libro.id).length;
            const bajas = datos.ejemplares.filter(e => e.libroId === libro.id && e.estado === 'baja').length;
            const filas = [
                ['Código', libro.codigo],
                ['Autor', libro.autor],
                ['Ejemplares totales', total],
                ['Disponibles', disponibles],
                ['Prestados', total - disponibles],
                ['Estado', estadoLibro(libro)]
            ];
            if (bajas > 0) filas.splice(5, 0, ['Dados de baja', bajas]);
            lista.append(tarjeta(libro.titulo, filas));
        });
    }

    form.addEventListener('submit', e => { e.preventDefault(); dibujar(); });
    input.addEventListener('input', dibujar);
    dibujar();

    // Resumen del inventario
    const resumen = document.querySelector('#resumen-stock');
    const totalEj = datos.ejemplares.filter(e => e.estado !== 'baja').length;
    const dispEj = datos.ejemplares.filter(e => e.estado === 'disponible').length;
    const sinStock = datos.libros.filter(l => !l.restringido && disponiblesDe(l.id).length === 0).length;
    const art = crear('article');
    art.append(
        campo('Total de libros', datos.libros.length),
        campo('Total de ejemplares', totalEj),
        campo('Ejemplares disponibles', dispEj),
        campo('Ejemplares prestados', totalEj - dispEj),
        campo('Libros sin stock', sinStock)
    );
    resumen.append(art);
}


/* ---------- Solicitud de préstamo ---------- */

function iniciarReserva() {
    const selLibro = document.querySelector('#libro');
    const selEjemplar = document.querySelector('#ejemplar');
    const inputFecha = document.querySelector('#fecha');
    const inputSocio = document.querySelector('#nombre');
    const previa = crear('p', null, 'aviso aviso-info');
    inputFecha.closest('p').after(previa);

    // Socio: queda fijo. Bibliotecario: elige a qué socio le registra el préstamo.
    let obtenerSocioId;
    if (usuarioActual.rol === 'socio') {
        inputSocio.value = nombreVisible(usuarioActual);
        inputSocio.readOnly = true;
        obtenerSocioId = () => usuarioActual.id;
    } else {
        const selSocio = crear('select');
        selSocio.id = 'nombre';
        selSocio.name = 'nombre';
        selSocio.required = true;
        selSocio.append(new Option('Seleccionar socio', ''));
        datos.usuarios.filter(u => u.rol === 'socio')
            .forEach(u => selSocio.append(new Option(nombreVisible(u), u.id)));
        inputSocio.replaceWith(selSocio);
        obtenerSocioId = () => selSocio.value;
    }

    // Libros
    datos.libros.forEach(l => {
        const estado = estadoLibro(l);
        let texto = l.titulo;
        if (estado === 'Sin stock') texto += ' (sin stock)';
        if (estado === 'Consulta en sala') texto += ' (solo sala de lectura)';
        const op = new Option(texto, l.id);
        op.disabled = estado !== 'Disponible';
        selLibro.append(op);
    });

    // Fecha de solicitud: hoy
    inputFecha.value = hoyISO();
    inputFecha.readOnly = true;
    previa.textContent = 'Fecha límite de devolución: ' +
        formatearFecha(sumarDias(hoyISO(), datos.config.diasPrestamo)) +
        ' (' + datos.config.diasPrestamo + ' días desde hoy).';

    function cargarEjemplares() {
        selEjemplar.replaceChildren(new Option('Seleccionar ejemplar', ''));
        disponiblesDe(selLibro.value).forEach(e =>
            selEjemplar.append(new Option('Ejemplar ' + e.id, e.id)));
    }
    selLibro.addEventListener('change', cargarEjemplares);

    // Libro preseleccionado desde el catálogo (?libro=L001)
    const pedido = new URLSearchParams(window.location.search).get('libro');
    if (pedido && libroPorId(pedido)) {
        selLibro.value = pedido;
        cargarEjemplares();
    }

    document.querySelector('#form-reserva').addEventListener('submit', e => {
        e.preventDefault();
        quitarAvisos('error');

        const socioId = obtenerSocioId();
        const error = validarSolicitud(socioId, selLibro.value, selEjemplar.value);
        if (error) {
            mostrarAviso('⛔ ' + error, 'error');
            window.scrollTo(0, 0);
            return;
        }

        const hoy = hoyISO();
        const prestamo = {
            id: siguienteId(datos.prestamos, 'P'),
            usuarioId: socioId,
            libroId: selLibro.value,
            ejemplarId: selEjemplar.value,
            fechaSolicitud: hoy,
            fechaPrestamo: null,
            fechaLimite: sumarDias(hoy, datos.config.diasPrestamo),
            fechaDevolucion: null,
            estado: 'pendiente'
        };
        ejemplarPorId(prestamo.ejemplarId).estado = 'reservado';
        datos.prestamos.push(prestamo);
        guardar();
        localStorage.setItem(CLAVE_ULTIMA, prestamo.id);
        window.location.href = 'confirmacion.html';
    });
}


/* ---------- Confirmación (comprobante) ---------- */

function iniciarConfirmacion() {
    const cont = document.querySelector('#detalle-confirmacion');
    const prestamo = datos.prestamos.find(p => p.id === localStorage.getItem(CLAVE_ULTIMA));

    if (!prestamo) {
        mostrarAviso('No hay ninguna solicitud reciente para mostrar.', 'info');
        return;
    }
    const libro = libroPorId(prestamo.libroId);
    const socio = usuarioPorId(prestamo.usuarioId);

    const art = tarjeta('✅ Solicitud registrada correctamente', [
        ['Comprobante', prestamo.id],
        ['Socio', nombreVisible(socio)],
        ['Libro', libro.titulo],
        ['Autor', libro.autor],
        ['Ejemplar', prestamo.ejemplarId],
        ['Fecha de solicitud', formatearFecha(prestamo.fechaSolicitud)],
        ['Fecha límite de devolución', formatearFecha(prestamo.fechaLimite)]
    ]);
    art.insertBefore(crear('p', 'La solicitud fue registrada correctamente en el sistema BiblioTech.'), art.children[1]);
    cont.append(art);
}


/* ---------- Mis préstamos (socio) ---------- */

function iniciarResultados() {
    const hoy = hoyISO();
    const mios = datos.prestamos.filter(p => p.usuarioId === usuarioActual.id);

    // Activos y pendientes
    const activos = document.querySelector('#prestamos-activos');
    const vigentes = mios.filter(p => p.estado === 'pendiente' || p.estado === 'activo');
    if (vigentes.length === 0) vacio(activos, 'No tenés préstamos activos.');
    vigentes.forEach(p => {
        const libro = libroPorId(p.libroId);
        const vencido = p.estado === 'activo' && p.fechaLimite < hoy;
        const filas = [
            ['Autor', libro.autor],
            ['Fecha de solicitud', formatearFecha(p.fechaSolicitud)]
        ];
        if (p.estado === 'activo') filas.push(['Fecha de préstamo', formatearFecha(p.fechaPrestamo)]);
        filas.push(['Fecha límite de devolución', formatearFecha(p.fechaLimite)]);
        filas.push(['Estado', vencido ? 'VENCIDO' : (p.estado === 'pendiente' ? 'Pendiente de retiro' : 'Préstamo activo')]);
        activos.append(tarjeta(libro.titulo, filas, vencido ? 'tarjeta-alerta' : ''));
    });

    // Historial
    const historial = document.querySelector('#historial');
    const pasados = mios.filter(p => p.estado === 'devuelto' || p.estado === 'rechazado')
        .sort((a, b) => (b.fechaSolicitud > a.fechaSolicitud ? 1 : -1));
    if (pasados.length === 0) vacio(historial, 'Todavía no tenés libros en tu historial.');
    pasados.forEach(p => {
        const libro = libroPorId(p.libroId);
        const filas = [['Autor', libro.autor], ['Fecha de solicitud', formatearFecha(p.fechaSolicitud)]];
        if (p.estado === 'devuelto') {
            filas.push(['Fecha de préstamo', formatearFecha(p.fechaPrestamo)]);
            filas.push(['Fecha de devolución', formatearFecha(p.fechaDevolucion)]);
        }
        filas.push(['Estado', p.estado === 'devuelto' ? 'Devuelto' : 'Solicitud rechazada']);
        historial.append(tarjeta(libro.titulo, filas));
    });

    // Sanciones
    const sanciones = document.querySelector('#sanciones');
    const vencidos = vencidosDe(usuarioActual.id);
    if (vencidos.length === 0) {
        const art = tarjeta('Estado de cuenta', [['Sanciones vigentes', 'Ninguna']]);
        art.append(crear('p', 'Actualmente no tenés sanciones por demoras en la devolución de libros.'));
        sanciones.append(art);
    } else {
        vencidos.forEach(p => {
            const libro = libroPorId(p.libroId);
            sanciones.append(tarjeta('Sanción vigente: ' + libro.titulo, [
                ['Fecha límite', formatearFecha(p.fechaLimite)],
                ['Días de atraso', diasEntre(p.fechaLimite, hoy)],
                ['Consecuencia', 'No podés solicitar nuevos préstamos hasta devolver el libro.']
            ], 'tarjeta-alerta'));
        });
    }

    // Avisos de la biblioteca (se marcan como leídos al verlos)
    const avisos = document.querySelector('#avisos-biblioteca');
    const notis = datos.notificaciones.filter(n => n.usuarioId === usuarioActual.id);
    if (notis.length === 0) vacio(avisos, 'No tenés avisos de la biblioteca.');
    notis.slice().reverse().forEach(n => {
        const art = tarjeta(n.leida ? 'Aviso' : '🔔 Aviso nuevo', [['Fecha', formatearFecha(n.fecha)]],
            n.leida ? '' : 'tarjeta-alerta');
        art.append(crear('p', n.mensaje));
        avisos.append(art);
    });
    if (notis.some(n => !n.leida)) {
        notis.forEach(n => { n.leida = true; });
        guardar();
    }
}


/* ---------- Gestión (bibliotecario) ---------- */

function aprobarEntrega(p) {
    const hoy = hoyISO();
    p.estado = 'activo';
    p.fechaPrestamo = hoy;
    p.fechaLimite = sumarDias(hoy, datos.config.diasPrestamo);
    ejemplarPorId(p.ejemplarId).estado = 'prestado';
    guardar();
    dibujarGestion();
}

function rechazarSolicitud(p) {
    p.estado = 'rechazado';
    ejemplarPorId(p.ejemplarId).estado = 'disponible';
    guardar();
    dibujarGestion();
}

function registrarDevolucion(p) {
    p.estado = 'devuelto';
    p.fechaDevolucion = hoyISO();
    ejemplarPorId(p.ejemplarId).estado = 'disponible';
    guardar();
    dibujarGestion();
}

function notificarMoroso(p) {
    const libro = libroPorId(p.libroId);
    const yaAvisado = datos.notificaciones.some(n => n.prestamoId === p.id && !n.leida);
    if (!yaAvisado) {
        datos.notificaciones.push({
            id: siguienteId(datos.notificaciones, 'N'),
            usuarioId: p.usuarioId,
            prestamoId: p.id,
            mensaje: 'Tenés un préstamo vencido de "' + libro.titulo +
                '" (límite: ' + formatearFecha(p.fechaLimite) + '). Por favor acercate a la biblioteca a devolverlo.',
            fecha: hoyISO(),
            leida: false
        });
        guardar();
    }
    dibujarGestion();
    mostrarAviso(yaAvisado
        ? 'Ese socio ya tiene un aviso pendiente de lectura.'
        : '✅ Aviso enviado a ' + nombreVisible(usuarioPorId(p.usuarioId)) + '.',
        yaAvisado ? 'info' : 'ok');
}

function darDeBaja(ejemplarId) {
    const e = ejemplarPorId(ejemplarId);
    if (!e || e.estado !== 'disponible') return;
    const libro = libroPorId(e.libroId);
    if (window.confirm('¿Dar de baja el ejemplar ' + e.id + ' de "' + libro.titulo + '"?')) {
        e.estado = 'baja';
        guardar();
        dibujarGestion();
        mostrarAviso('✅ El ejemplar ' + e.id + ' fue dado de baja.', 'ok');
    }
}

function tarjetaPrestamoGestion(p, botones, clase) {
    const libro = libroPorId(p.libroId);
    const socio = usuarioPorId(p.usuarioId);
    const art = tarjeta(libro.titulo, [
        ['Socio', nombreVisible(socio)],
        ['Ejemplar', p.ejemplarId],
        ['Fecha límite', formatearFecha(p.fechaLimite)]
    ], clase);
    const fila = crear('div', null, 'botones');
    botones.forEach(b => fila.append(b));
    art.append(fila);
    return art;
}

function dibujarGestion() {
    const hoy = hoyISO();
    const ids = ['#solicitudes-pendientes', '#devoluciones-hoy', '#reporte-vencidos', '#prestamos-vigentes'];
    ids.forEach(id => document.querySelector(id).replaceChildren());

    // Solicitudes pendientes
    const pendientes = datos.prestamos.filter(p => p.estado === 'pendiente');
    const cPend = document.querySelector('#solicitudes-pendientes');
    if (pendientes.length === 0) vacio(cPend, 'No hay solicitudes pendientes.');
    pendientes.forEach(p => cPend.append(tarjetaPrestamoGestion(p, [
        boton('Aprobar entrega', () => aprobarEntrega(p)),
        boton('Rechazar', () => rechazarSolicitud(p), 'boton-secundario')
    ])));

    // Devoluciones de hoy
    const deHoy = datos.prestamos.filter(p => p.estado === 'activo' && p.fechaLimite === hoy);
    const cHoy = document.querySelector('#devoluciones-hoy');
    if (deHoy.length === 0) vacio(cHoy, 'Hoy no vencen devoluciones.');
    deHoy.forEach(p => cHoy.append(tarjetaPrestamoGestion(p, [
        boton('Registrar devolución', () => registrarDevolucion(p))
    ])));

    // Reporte de vencidos
    const vencidos = prestamosVencidos();
    const cVenc = document.querySelector('#reporte-vencidos');
    if (vencidos.length === 0) vacio(cVenc, 'No hay préstamos vencidos.');
    vencidos.forEach(p => {
        const art = tarjetaPrestamoGestion(p, [
            boton('Registrar devolución', () => registrarDevolucion(p)),
            boton('Notificar al socio', () => notificarMoroso(p), 'boton-secundario')
        ], 'tarjeta-alerta');
        art.insertBefore(campo('Días de atraso', diasEntre(p.fechaLimite, hoy)), art.querySelector('.botones'));
        cVenc.append(art);
    });

    // Préstamos vigentes
    const activos = datos.prestamos.filter(p => p.estado === 'activo');
    const cAct = document.querySelector('#prestamos-vigentes');
    if (activos.length === 0) vacio(cAct, 'No hay préstamos activos.');
    activos.forEach(p => cAct.append(tarjetaPrestamoGestion(p, [
        boton('Registrar devolución', () => registrarDevolucion(p))
    ])));

    // Select para dar de baja ejemplares
    const sel = document.querySelector('#ejemplar-baja');
    sel.replaceChildren(new Option('Seleccionar ejemplar', ''));
    datos.ejemplares.filter(e => e.estado === 'disponible').forEach(e =>
        sel.append(new Option(e.id + ' — ' + libroPorId(e.libroId).titulo, e.id)));
}

function iniciarGestion() {
    dibujarGestion();
    document.querySelector('#form-baja').addEventListener('submit', e => {
        e.preventDefault();
        const valor = document.querySelector('#ejemplar-baja').value;
        if (!valor) {
            mostrarAviso('Seleccioná el ejemplar que querés dar de baja.', 'error');
            return;
        }
        quitarAvisos('error');
        darDeBaja(valor);
    });
}


/* ---------- Tablero (director) ---------- */

function iniciarTablero() {
    // Indicadores
    const ind = document.querySelector('#indicadores');
    const totalEj = datos.ejemplares.filter(e => e.estado !== 'baja').length;
    const disp = datos.ejemplares.filter(e => e.estado === 'disponible').length;
    const indicadores = [
        ['Libros en catálogo', datos.libros.length],
        ['Ejemplares totales', totalEj],
        ['Ejemplares disponibles', disp],
        ['Ejemplares prestados', totalEj - disp],
        ['Solicitudes pendientes', datos.prestamos.filter(p => p.estado === 'pendiente').length],
        ['Préstamos vencidos', prestamosVencidos().length],
        ['Socios registrados', datos.usuarios.filter(u => u.rol === 'socio').length]
    ];
    indicadores.forEach(([etiqueta, valor]) => {
        const art = crear('article', null, 'indicador');
        art.append(crear('p', String(valor), 'indicador-valor'), crear('p', etiqueta));
        ind.append(art);
    });

    // Categorías más leídas
    const cat = document.querySelector('#categorias');
    const conteo = {};
    datos.prestamos.filter(p => p.estado !== 'rechazado').forEach(p => {
        const genero = libroPorId(p.libroId).genero;
        conteo[genero] = (conteo[genero] || 0) + 1;
    });
    const orden = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    const maximo = orden.length ? orden[0][1] : 1;
    orden.forEach(([genero, cantidad]) => {
        const art = crear('article');
        art.append(campo(genero, cantidad + ' préstamo(s)'));
        const barra = crear('div', null, 'barra');
        barra.style.width = Math.round(cantidad / maximo * 100) + '%';
        art.append(barra);
        cat.append(art);
    });

    // Libros que faltan en el inventario
    const faltan = document.querySelector('#libros-faltantes');
    const sinStock = datos.libros.filter(l => !l.restringido && disponiblesDe(l.id).length === 0);
    if (sinStock.length === 0) vacio(faltan, 'Todos los libros tienen ejemplares disponibles.');
    sinStock.forEach(l => faltan.append(tarjeta(l.titulo, [
        ['Autor', l.autor],
        ['Ejemplares totales', ejemplaresDe(l.id).length],
        ['Estado', 'Sin stock']
    ], 'tarjeta-alerta')));
    const bajas = datos.ejemplares.filter(e => e.estado === 'baja');
    if (bajas.length > 0) {
        faltan.append(crear('p', 'Ejemplares dados de baja: ' +
            bajas.map(e => e.id).join(', ') + '.'));
    }

    // Actividad de los socios (sin apellido de menores)
    const act = document.querySelector('#actividad-socios');
    datos.usuarios.filter(u => u.rol === 'socio').forEach(u => {
        const propios = datos.prestamos.filter(p => p.usuarioId === u.id);
        const vencidos = vencidosDe(u.id).length;
        act.append(tarjeta(nombreVisible(u), [
            ['Préstamos vigentes', prestamosVigentesDe(u.id).length],
            ['Libros devueltos', propios.filter(p => p.estado === 'devuelto').length],
            ['Préstamos vencidos', vencidos]
        ], vencidos > 0 ? 'tarjeta-alerta' : ''));
    });
}


/* ---------- Arranque ---------- */

const INICIADORES = {
    login: iniciarLogin,
    index: iniciarIndex,
    catalogo: iniciarCatalogo,
    stock: iniciarStock,
    reserva: iniciarReserva,
    confirmacion: iniciarConfirmacion,
    resultados: iniciarResultados,
    gestion: iniciarGestion,
    tablero: iniciarTablero
};

async function iniciar() {
    const pagina = document.body.dataset.pagina;

    try {
        await cargarDatos();
    } catch (error) {
        mostrarAviso('No se pudieron cargar los datos. Abrí el sitio desde un servidor local ' +
            '(por ejemplo la extensión Live Server de VS Code) y no con doble clic sobre el archivo.', 'error');
        return;
    }

    usuarioActual = leerSesion();
    construirMenu();
    construirPie();

    if (pagina === 'login') {
        iniciarLogin();
        return;
    }

    // Hay que iniciar sesión antes de acceder a cualquier funcionalidad
    if (!usuarioActual) {
        window.location.href = PAGINAS + 'login.html';
        return;
    }

    // Cada rol solo accede a sus páginas
    if (!PERMISOS[pagina].includes(usuarioActual.rol)) {
        window.location.href = RAIZ + 'index.html';
        return;
    }

    mostrarAvisosDelSocio();
    INICIADORES[pagina]();
}

document.addEventListener('DOMContentLoaded', iniciar);
