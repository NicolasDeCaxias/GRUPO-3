const CLAVE_SESION = 'bibliotech_sesion';

const EN_PAGES = window.location.pathname.includes('/pages/');
const RAIZ = EN_PAGES ? '../' : '';
const PAGINAS = EN_PAGES ? '' : 'pages/';

let usuarioActual = null;

const TODOS = ['socio', 'bibliotecario', 'director'];

const PERMISOS = {
    index: TODOS,
    catalogo: TODOS,
    stock: TODOS,
    reserva: ['socio', 'bibliotecario'],
    confirmacion: ['socio', 'bibliotecario'],
    resultados: ['socio'],
    gestion: ['bibliotecario'],
    socios: ['bibliotecario'],
    tablero: ['director'],
    usuarios: ['director']
};

const MENU = {
    socio: [
        ['Inicio', 'index'], ['Catálogo', 'catalogo'], ['Disponibilidad', 'stock'],
        ['Reservas', 'reserva'], ['Mis préstamos', 'resultados']
    ],
    bibliotecario: [
        ['Inicio', 'index'], ['Gestión', 'gestion'], ['Socios', 'socios'], ['Catálogo', 'catalogo'],
        ['Disponibilidad', 'stock'], ['Registrar préstamo', 'reserva']
    ],
    director: [
        ['Inicio', 'index'], ['Tablero', 'tablero'], ['Usuarios', 'usuarios'], ['Catálogo', 'catalogo'],
        ['Disponibilidad', 'stock']
    ]
};

const SERVICIOS = {
    socio: [
        ['📚 Catálogo de libros', 'Consultá los libros disponibles buscando por título, autor o género.', 'catalogo', 'Consultar catálogo'],
        ['📦 Disponibilidad', 'Verificá cuántos ejemplares están disponibles, prestados o sin stock.', 'stock', 'Consultar disponibilidad'],
        ['📝 Solicitar un préstamo', 'Seleccioná un ejemplar disponible y realizá una solicitud de préstamo.', 'reserva', 'Solicitar préstamo'],
        ['📋 Mis préstamos', 'Consultá tus préstamos activos, libros devueltos y posibles sanciones.', 'resultados', 'Ver mis préstamos']
    ],
    bibliotecario: [
        ['🗂️ Gestión de préstamos', 'Aprobá entregas, registrá devoluciones, notificá morosos y dá de baja ejemplares.', 'gestion', 'Ir a gestión'],
        ['🧑‍🤝‍🧑 Registro de socios', 'Dá de alta a un nuevo socio con su usuario y contraseña y consultá los socios registrados.', 'socios', 'Registrar socios'],
        ['📝 Registrar un préstamo', 'Cargá una solicitud de préstamo en nombre de un socio.', 'reserva', 'Registrar préstamo'],
        ['📦 Disponibilidad', 'Lista unificada de todo el catálogo con su estado.', 'stock', 'Ver disponibilidad'],
        ['📚 Catálogo de libros', 'Buscá libros por título, autor o género.', 'catalogo', 'Consultar catálogo']
    ],
    director: [
        ['📊 Tablero de control', 'Estado de los libros y actividad de los socios de un vistazo.', 'tablero', 'Ver tablero'],
        ['👥 Usuarios y roles', 'Registrá bibliotecarios y socios con su usuario y contraseña, y dalos de baja o reactivalos.', 'usuarios', 'Administrar usuarios'],
        ['📦 Disponibilidad', 'Estado de todos los ejemplares del inventario.', 'stock', 'Ver disponibilidad'],
        ['📚 Catálogo de libros', 'Buscá libros por título, autor o género.', 'catalogo', 'Consultar catálogo']
    ]
};


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
    return d;
}

function quitarAvisos(...tipos) {
    tipos.forEach(tipo => {
        contenedorAvisos().querySelectorAll('.aviso-' + tipo).forEach(a => a.remove());
    });
}

function formatearFecha(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return d + '/' + m + '/' + a;
}


class ErrorApi extends Error {
    constructor(estado, mensaje) {
        super(mensaje);
        this.estado = estado;
    }
}

function leerSesion() {
    const texto = localStorage.getItem(CLAVE_SESION);
    if (!texto) return null;
    try {
        const sesion = JSON.parse(texto);
        return sesion && sesion.token ? sesion : null;
    } catch (e) {
        return null;
    }
}

function borrarSesion() {
    localStorage.removeItem(CLAVE_SESION);
}

async function api(metodo, ruta, cuerpo, conSesion = true) {
    const sesion = conSesion ? leerSesion() : null;
    const cabeceras = {};
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    if (sesion) cabeceras.Authorization = 'Bearer ' + sesion.token;

    let respuesta;
    try {
        respuesta = await fetch(API_URL + ruta, {
            method: metodo,
            headers: cabeceras,
            body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
        });
    } catch (e) {
        throw new ErrorApi(0, 'No se pudo conectar con el servidor. Intentá nuevamente en unos segundos.');
    }

    let contenido = null;
    try {
        contenido = await respuesta.json();
    } catch (e) {
        contenido = null;
    }

    if (!respuesta.ok) {
        if (respuesta.status === 401 && sesion) {
            borrarSesion();
            window.location.href = PAGINAS + 'login.html';
        }
        throw new ErrorApi(respuesta.status, (contenido && contenido.error) || 'Ocurrió un error inesperado.');
    }
    return contenido;
}

function cerrarSesion() {
    api('POST', '/api/logout').catch(() => {}).finally(() => {
        borrarSesion();
        window.location.href = PAGINAS + 'login.html';
    });
}

function retrasar(funcion, milisegundos) {
    let temporizador = null;
    return (...argumentos) => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => funcion(...argumentos), milisegundos);
    };
}


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
    if (!footer || !usuarioActual) return;
    const p = crear('p');
    p.style.marginTop = '10px';
    p.append(boton('Restablecer datos de demostración', async () => {
        if (!window.confirm('Se restablecerán los datos del servidor a su estado inicial. ¿Continuar?')) return;
        try {
            await api('POST', '/api/demo/reiniciar');
            window.location.href = RAIZ + 'index.html';
        } catch (error) {
            quitarAvisos('error', 'ok');
            mostrarAviso('⛔ ' + error.message, 'error');
        }
    }));
    footer.append(p);
}

const INTERVALO_AVISOS = 8000;

function actualizarCampana(cantidad) {
    const enlace = document.querySelector('#menu a[href$="resultados.html"]');
    if (!enlace) return;
    enlace.textContent = 'Mis préstamos' + (cantidad > 0 ? ' 🔔 ' + cantidad : '');
}

function mostrarAvisoFlotante(notificacion) {
    const caja = crear('div', null, 'aviso aviso-alerta aviso-flotante');
    caja.setAttribute('role', 'status');
    caja.append(crear('strong', '🔔 Nuevo aviso de la biblioteca'));
    if (notificacion.emisor) caja.append(crear('p', 'De: ' + notificacion.emisor));
    caja.append(crear('p', notificacion.mensaje));
    const fila = crear('div', null, 'botones');
    fila.append(
        boton('Ver mis avisos', () => { window.location.href = PAGINAS + 'resultados.html'; }),
        boton('Cerrar', () => caja.remove(), 'boton-secundario')
    );
    caja.append(fila);
    document.body.append(caja);
    setTimeout(() => caja.remove(), 30000);
}

function iniciarAvisosEnVivo() {
    if (!usuarioActual || usuarioActual.rol !== 'socio') return;
    let conocidos = null;

    async function revisar() {
        if (document.hidden) return;
        try {
            const notificaciones = await api('GET', '/api/notificaciones/mias');
            const sinLeer = notificaciones.filter(n => !n.leida);
            actualizarCampana(sinLeer.length);
            if (conocidos !== null) {
                sinLeer.filter(n => !conocidos.has(n.id)).forEach(mostrarAvisoFlotante);
            }
            conocidos = new Set(sinLeer.map(n => n.id));
        } catch (error) {
            // Un fallo momentáneo de conexión no debe molestar al socio.
        }
    }

    revisar();
    setInterval(revisar, INTERVALO_AVISOS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
}

async function mostrarAvisosDelSocio() {
    if (usuarioActual.rol !== 'socio') return null;
    const resumen = await api('GET', '/api/prestamos/resumen');
    if (resumen.avisosSinLeer > 0) {
        mostrarAviso('🔔 Tenés ' + resumen.avisosSinLeer + ' aviso(s) de la biblioteca sin leer. Revisalos en "Mis préstamos".', 'alerta');
    }
    if (resumen.vencidos > 0) {
        mostrarAviso('⚠️ Tenés ' + resumen.vencidos + ' préstamo(s) vencido(s). Mientras no los devuelvas no podrás pedir nuevos libros.', 'error');
    }
    return resumen;
}


async function iniciarLogin() {
    document.querySelector('#form-login').addEventListener('submit', async e => {
        e.preventDefault();
        quitarAvisos('error');
        const botonEnviar = e.target.querySelector('button[type="submit"]');
        botonEnviar.disabled = true;
        try {
            const respuesta = await api('POST', '/api/login', {
                usuario: document.querySelector('#usuario').value.trim(),
                clave: document.querySelector('#clave').value
            }, false);
            localStorage.setItem(CLAVE_SESION, JSON.stringify({
                token: respuesta.token,
                usuario: respuesta.usuario
            }));
            window.location.href = RAIZ + 'index.html';
        } catch (error) {
            mostrarAviso('⛔ ' + error.message, 'error');
            botonEnviar.disabled = false;
        }
    });

    const cont = document.querySelector('#usuarios-demo');
    if (cont) {
        try {
            const { usuarios } = await api('GET', '/api/demo-usuarios', undefined, false);
            if (usuarios.length === 0) {
                const seccion = document.querySelector('#seccion-demo');
                if (seccion) seccion.remove();
                return;
            }
            TODOS.forEach(rol => {
                const art = crear('article');
                art.append(crear('h3', rol.charAt(0).toUpperCase() + rol.slice(1) + 's'));
                usuarios.filter(u => u.rol === rol).forEach(u => {
                    const clave = u.clave ? ' — Contraseña: ' + u.clave : '';
                    art.append(crear('p', 'Usuario: ' + u.usuario + clave + (u.esMenor ? ' (socio menor)' : '')));
                });
                cont.append(art);
            });
        } catch (error) {
            vacio(cont, 'No se pudo obtener la lista de usuarios de prueba.');
        }
    }
}


async function iniciarIndex(resumenSocio) {
    document.querySelector('#titulo-bienvenida').textContent = 'Bienvenido/a, ' + usuarioActual.nombre;

    const resumen = document.querySelector('#resumen-usuario');
    resumen.append(crear('p', 'Ingresaste como ' + usuarioActual.rol + '.'));
    if (resumenSocio) {
        resumen.append(crear('p', 'Tenés ' + resumenSocio.vigentes + ' de ' + resumenSocio.maxPrestamos +
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


async function iniciarCatalogo() {
    const form = document.querySelector('#form-busqueda');
    const input = document.querySelector('#busqueda');
    const lista = document.querySelector('#lista-libros');
    let ultimaConsulta = 0;

    async function dibujar() {
        const consulta = ++ultimaConsulta;
        let libros;
        try {
            libros = await api('GET', '/api/libros?q=' + encodeURIComponent(input.value.trim()));
        } catch (error) {
            quitarAvisos('error');
            mostrarAviso('⛔ ' + error.message, 'error');
            return;
        }
        if (consulta !== ultimaConsulta) return;
        lista.replaceChildren();

        if (libros.length === 0) {
            vacio(lista, 'No se encontraron libros para esa búsqueda.');
            return;
        }

        libros.forEach(libro => {
            const art = tarjeta(libro.titulo, [
                ['Autor', libro.autor],
                ['Género', libro.genero],
                ['Ejemplares disponibles', libro.disponibles],
                ['Estado', libro.estado]
            ]);

            if (libro.estado === 'Sin stock') {
                art.append(crear('p', '⚠️ Actualmente no hay ejemplares disponibles para préstamo.', 'aviso aviso-alerta'));
            } else if (libro.estado === 'Consulta en sala') {
                art.append(crear('p', '📖 Este ejemplar pertenece a una colección restringida. No está permitido realizar préstamos a domicilio.', 'aviso aviso-info'));
            } else if (usuarioActual.rol !== 'director') {
                art.append(enlace('Reservar ejemplar', 'reserva.html?libro=' + libro.id));
            }
            lista.append(art);
        });
    }

    form.addEventListener('submit', e => { e.preventDefault(); dibujar(); });
    input.addEventListener('input', retrasar(dibujar, 250));
    await dibujar();
}


async function iniciarStock() {
    const form = document.querySelector('#form-busqueda');
    const input = document.querySelector('#busqueda');
    const lista = document.querySelector('#lista-stock');
    let ultimaConsulta = 0;

    async function dibujar() {
        const consulta = ++ultimaConsulta;
        let libros;
        try {
            libros = await api('GET', '/api/libros?q=' + encodeURIComponent(input.value.trim()));
        } catch (error) {
            quitarAvisos('error');
            mostrarAviso('⛔ ' + error.message, 'error');
            return;
        }
        if (consulta !== ultimaConsulta) return;
        lista.replaceChildren();

        if (libros.length === 0) {
            vacio(lista, 'No se encontraron libros para esa búsqueda.');
            return;
        }

        libros.forEach(libro => {
            const filas = [
                ['Código', libro.codigo],
                ['Autor', libro.autor],
                ['Ejemplares totales', libro.ejemplaresTotales],
                ['Disponibles', libro.disponibles],
                ['Prestados', libro.prestados],
                ['Estado', libro.estado]
            ];
            if (libro.bajas > 0) filas.splice(5, 0, ['Dados de baja', libro.bajas]);
            lista.append(tarjeta(libro.titulo, filas));
        });
    }

    form.addEventListener('submit', e => { e.preventDefault(); dibujar(); });
    input.addEventListener('input', retrasar(dibujar, 250));

    const [resumen] = await Promise.all([api('GET', '/api/stock/resumen'), dibujar()]);
    const art = crear('article');
    art.append(
        campo('Total de libros', resumen.totalLibros),
        campo('Total de ejemplares', resumen.totalEjemplares),
        campo('Ejemplares disponibles', resumen.ejemplaresDisponibles),
        campo('Ejemplares prestados', resumen.ejemplaresPrestados),
        campo('Libros sin stock', resumen.librosSinStock)
    );
    document.querySelector('#resumen-stock').append(art);
}


async function iniciarReserva() {
    const selLibro = document.querySelector('#libro');
    const selEjemplar = document.querySelector('#ejemplar');
    const inputFecha = document.querySelector('#fecha');
    const inputSocio = document.querySelector('#nombre');
    const formulario = document.querySelector('#form-reserva');
    const previa = crear('p', null, 'aviso aviso-info');
    inputFecha.closest('p').after(previa);

    const esBibliotecario = usuarioActual.rol === 'bibliotecario';
    const pedidos = [api('GET', '/api/config'), api('GET', '/api/libros')];
    if (esBibliotecario) pedidos.push(api('GET', '/api/socios'));
    const [config, libros, socios] = await Promise.all(pedidos);

    let obtenerSocioId;
    if (!esBibliotecario) {
        inputSocio.value = usuarioActual.nombreVisible;
        inputSocio.readOnly = true;
        obtenerSocioId = () => undefined;
    } else {
        const selSocio = crear('select');
        selSocio.id = 'nombre';
        selSocio.name = 'nombre';
        selSocio.required = true;
        selSocio.append(new Option('Seleccionar socio', ''));
        socios.filter(s => s.activo).forEach(s => selSocio.append(new Option(s.nombreVisible, s.id)));
        inputSocio.replaceWith(selSocio);
        obtenerSocioId = () => selSocio.value;
    }

    libros.forEach(l => {
        let texto = l.titulo;
        if (l.estado === 'Sin stock') texto += ' (sin stock)';
        if (l.estado === 'Consulta en sala') texto += ' (solo sala de lectura)';
        const op = new Option(texto, l.id);
        op.disabled = l.estado !== 'Disponible';
        selLibro.append(op);
    });

    inputFecha.value = config.hoy;
    inputFecha.readOnly = true;
    previa.textContent = 'Fecha límite de devolución: ' + formatearFecha(config.fechaLimitePrestamo) +
        ' (' + config.diasPrestamo + ' días desde hoy).';

    function cargarEjemplares() {
        selEjemplar.replaceChildren(new Option('Seleccionar ejemplar', ''));
        const libro = libros.find(l => l.id === selLibro.value);
        if (libro) {
            libro.ejemplaresDisponibles.forEach(id => selEjemplar.append(new Option('Ejemplar ' + id, id)));
        }
    }
    selLibro.addEventListener('change', cargarEjemplares);

    const pedido = new URLSearchParams(window.location.search).get('libro');
    if (pedido && libros.some(l => l.id === pedido)) {
        selLibro.value = pedido;
        cargarEjemplares();
    }

    formulario.addEventListener('submit', async e => {
        e.preventDefault();
        quitarAvisos('error');
        const botonEnviar = formulario.querySelector('button[type="submit"]');
        botonEnviar.disabled = true;
        try {
            const prestamo = await api('POST', '/api/prestamos', {
                socioId: obtenerSocioId(),
                libroId: selLibro.value,
                ejemplarId: selEjemplar.value
            });
            window.location.href = 'confirmacion.html?id=' + encodeURIComponent(prestamo.id);
        } catch (error) {
            mostrarAviso('⛔ ' + error.message, 'error');
            window.scrollTo(0, 0);
            botonEnviar.disabled = false;
        }
    });
}


async function iniciarConfirmacion() {
    const cont = document.querySelector('#detalle-confirmacion');
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        mostrarAviso('No hay ninguna solicitud reciente para mostrar.', 'info');
        return;
    }
    const prestamo = await api('GET', '/api/prestamos/' + encodeURIComponent(id));

    const art = tarjeta('✅ Solicitud registrada correctamente', [
        ['Comprobante', prestamo.id],
        ['Socio', prestamo.socio],
        ['Libro', prestamo.titulo],
        ['Autor', prestamo.autor],
        ['Ejemplar', prestamo.ejemplarId],
        ['Estado', 'Pendiente de aprobación'],
        ['Fecha de solicitud', formatearFecha(prestamo.fechaSolicitud)],
        ['Fecha límite de devolución', formatearFecha(prestamo.fechaLimite)]
    ]);
    art.insertBefore(crear('p', 'La solicitud fue registrada correctamente en el sistema BiblioTech.'), art.children[1]);
    cont.append(art);
}


async function iniciarResultados() {
    const [mios, notis] = await Promise.all([
        api('GET', '/api/prestamos/mios'),
        api('GET', '/api/notificaciones/mias')
    ]);

    const activos = document.querySelector('#prestamos-activos');
    const vigentes = mios.filter(p => p.estado === 'pendiente' || p.estado === 'activo');
    if (vigentes.length === 0) vacio(activos, 'No tenés préstamos activos.');
    vigentes.forEach(p => {
        const filas = [
            ['Autor', p.autor],
            ['Fecha de solicitud', formatearFecha(p.fechaSolicitud)]
        ];
        if (p.estado === 'activo') filas.push(['Fecha de préstamo', formatearFecha(p.fechaPrestamo)]);
        filas.push(['Fecha límite de devolución', formatearFecha(p.fechaLimite)]);
        filas.push(['Estado', p.vencido ? 'VENCIDO' : (p.estado === 'pendiente' ? 'Pendiente de retiro' : 'Préstamo activo')]);
        activos.append(tarjeta(p.titulo, filas, p.vencido ? 'tarjeta-alerta' : ''));
    });

    const historial = document.querySelector('#historial');
    const pasados = mios.filter(p => p.estado === 'devuelto' || p.estado === 'rechazado');
    if (pasados.length === 0) vacio(historial, 'Todavía no tenés libros en tu historial.');
    pasados.forEach(p => {
        const filas = [['Autor', p.autor], ['Fecha de solicitud', formatearFecha(p.fechaSolicitud)]];
        if (p.estado === 'devuelto') {
            filas.push(['Fecha de préstamo', formatearFecha(p.fechaPrestamo)]);
            filas.push(['Fecha de devolución', formatearFecha(p.fechaDevolucion)]);
        }
        filas.push(['Estado', p.estado === 'devuelto' ? 'Devuelto' : 'Solicitud rechazada']);
        historial.append(tarjeta(p.titulo, filas));
    });

    const sanciones = document.querySelector('#sanciones');
    const vencidos = mios.filter(p => p.vencido);
    if (vencidos.length === 0) {
        const art = tarjeta('Estado de cuenta', [['Sanciones vigentes', 'Ninguna']]);
        art.append(crear('p', 'Actualmente no tenés sanciones por demoras en la devolución de libros.'));
        sanciones.append(art);
    } else {
        vencidos.forEach(p => {
            sanciones.append(tarjeta('Sanción vigente: ' + p.titulo, [
                ['Fecha límite', formatearFecha(p.fechaLimite)],
                ['Días de atraso', p.diasAtraso],
                ['Consecuencia', 'No podés solicitar nuevos préstamos hasta devolver el libro.']
            ], 'tarjeta-alerta'));
        });
    }

    const avisos = document.querySelector('#avisos-biblioteca');
    if (notis.length === 0) vacio(avisos, 'No tenés avisos de la biblioteca.');
    notis.forEach(n => {
        const filasAviso = [['Fecha', formatearFecha(n.fecha)]];
        if (n.emisor) filasAviso.push(['Enviado por', n.emisor]);
        const art = tarjeta(n.leida ? 'Aviso' : '🔔 Aviso nuevo', filasAviso,
            n.leida ? '' : 'tarjeta-alerta');
        art.append(crear('p', n.mensaje));
        avisos.append(art);
    });
    if (notis.some(n => !n.leida)) {
        await api('PATCH', '/api/notificaciones/mias/leidas');
        actualizarCampana(0);
    }
}


async function ejecutarAccionGestion(accion, mensajeOk) {
    quitarAvisos('error', 'ok', 'info');
    try {
        const resultado = await accion();
        await dibujarGestion();
        const mensaje = typeof mensajeOk === 'function' ? mensajeOk(resultado) : mensajeOk;
        if (mensaje) mostrarAviso(mensaje.texto, mensaje.tipo);
    } catch (error) {
        mostrarAviso('⛔ ' + error.message, 'error');
        await dibujarGestion().catch(() => {});
    }
}

function cambiarEstadoPrestamo(p, estado, textoOk) {
    return ejecutarAccionGestion(
        () => api('PATCH', '/api/prestamos/' + p.id + '/estado', { estado }),
        { texto: '✅ ' + textoOk + ' (' + p.titulo + ').', tipo: 'ok' }
    );
}

function aprobarEntrega(p) {
    return cambiarEstadoPrestamo(p, 'activo', 'Entrega aprobada para ' + p.socio);
}

function rechazarSolicitud(p) {
    return cambiarEstadoPrestamo(p, 'rechazado', 'Solicitud de ' + p.socio + ' rechazada');
}

function registrarDevolucion(p) {
    return cambiarEstadoPrestamo(p, 'devuelto', 'Devolución registrada de ' + p.socio);
}

function notificarMoroso(p) {
    return ejecutarAccionGestion(
        () => api('POST', '/api/prestamos/' + p.id + '/notificaciones'),
        r => ({ texto: (r.creada ? '✅ ' : '') + r.mensaje, tipo: r.creada ? 'ok' : 'info' })
    );
}

function darDeBaja(ejemplarId, descripcion) {
    if (!window.confirm('¿Dar de baja el ejemplar ' + descripcion + '?')) return Promise.resolve();
    return ejecutarAccionGestion(
        () => api('PATCH', '/api/ejemplares/' + encodeURIComponent(ejemplarId) + '/estado', { estado: 'baja' }),
        { texto: '✅ El ejemplar ' + ejemplarId + ' fue dado de baja.', tipo: 'ok' }
    );
}

function tarjetaPrestamoGestion(p, botones, clase) {
    const art = tarjeta(p.titulo, [
        ['Socio', p.socio],
        ['Ejemplar', p.ejemplarId],
        ['Fecha límite', formatearFecha(p.fechaLimite)]
    ], clase);
    const fila = crear('div', null, 'botones');
    botones.forEach(b => fila.append(b));
    art.append(fila);
    return art;
}

async function dibujarGestion() {
    const [pendientes, deHoy, vencidos, activos, disponibles] = await Promise.all([
        api('GET', '/api/prestamos?estado=pendiente'),
        api('GET', '/api/prestamos?estado=vence-hoy'),
        api('GET', '/api/prestamos?estado=vencido'),
        api('GET', '/api/prestamos?estado=activo'),
        api('GET', '/api/ejemplares?estado=disponible')
    ]);

    const ids = ['#solicitudes-pendientes', '#devoluciones-hoy', '#reporte-vencidos', '#prestamos-vigentes'];
    ids.forEach(id => document.querySelector(id).replaceChildren());

    const cPend = document.querySelector('#solicitudes-pendientes');
    if (pendientes.length === 0) vacio(cPend, 'No hay solicitudes pendientes.');
    pendientes.forEach(p => cPend.append(tarjetaPrestamoGestion(p, [
        boton('Aprobar entrega', () => aprobarEntrega(p)),
        boton('Rechazar', () => rechazarSolicitud(p), 'boton-secundario')
    ])));

    const cHoy = document.querySelector('#devoluciones-hoy');
    if (deHoy.length === 0) vacio(cHoy, 'Hoy no vencen devoluciones.');
    deHoy.forEach(p => cHoy.append(tarjetaPrestamoGestion(p, [
        boton('Registrar devolución', () => registrarDevolucion(p))
    ])));

    const cVenc = document.querySelector('#reporte-vencidos');
    if (vencidos.length === 0) vacio(cVenc, 'No hay préstamos vencidos.');
    vencidos.forEach(p => {
        const art = tarjetaPrestamoGestion(p, [
            boton('Registrar devolución', () => registrarDevolucion(p)),
            boton('Notificar al socio', () => notificarMoroso(p), 'boton-secundario')
        ], 'tarjeta-alerta');
        art.insertBefore(campo('Días de atraso', p.diasAtraso), art.querySelector('.botones'));
        cVenc.append(art);
    });

    const cAct = document.querySelector('#prestamos-vigentes');
    if (activos.length === 0) vacio(cAct, 'No hay préstamos activos.');
    activos.forEach(p => cAct.append(tarjetaPrestamoGestion(p, [
        boton('Registrar devolución', () => registrarDevolucion(p))
    ])));

    const sel = document.querySelector('#ejemplar-baja');
    sel.replaceChildren(new Option('Seleccionar ejemplar', ''));
    disponibles.forEach(e => sel.append(new Option(e.id + ' — ' + e.titulo, e.id)));
}

async function iniciarGestion() {
    await dibujarGestion();
    document.querySelector('#form-baja').addEventListener('submit', e => {
        e.preventDefault();
        const select = document.querySelector('#ejemplar-baja');
        if (!select.value) {
            quitarAvisos('error');
            mostrarAviso('Seleccioná el ejemplar que querés dar de baja.', 'error');
            return;
        }
        quitarAvisos('error');
        darDeBaja(select.value, select.options[select.selectedIndex].text);
    });
}


async function iniciarTablero() {
    const tablero = await api('GET', '/api/tablero');

    const ind = document.querySelector('#indicadores');
    tablero.indicadores.forEach(({ etiqueta, valor }) => {
        const art = crear('article', null, 'indicador');
        art.append(crear('p', String(valor), 'indicador-valor'), crear('p', etiqueta));
        ind.append(art);
    });

    const cat = document.querySelector('#categorias');
    const maximo = tablero.categorias.length ? tablero.categorias[0].cantidad : 1;
    tablero.categorias.forEach(({ genero, cantidad }) => {
        const art = crear('article');
        art.append(campo(genero, cantidad + ' préstamo(s)'));
        const barra = crear('div', null, 'barra');
        barra.style.width = Math.round(cantidad / maximo * 100) + '%';
        art.append(barra);
        cat.append(art);
    });

    const faltan = document.querySelector('#libros-faltantes');
    if (tablero.librosSinStock.length === 0) vacio(faltan, 'Todos los libros tienen ejemplares disponibles.');
    tablero.librosSinStock.forEach(l => faltan.append(tarjeta(l.titulo, [
        ['Autor', l.autor],
        ['Ejemplares totales', l.ejemplaresTotales],
        ['Estado', 'Sin stock']
    ], 'tarjeta-alerta')));
    if (tablero.bajas.length > 0) {
        faltan.append(crear('p', 'Ejemplares dados de baja: ' + tablero.bajas.join(', ') + '.'));
    }

    const act = document.querySelector('#actividad-socios');
    tablero.actividadSocios.forEach(s => {
        act.append(tarjeta(s.socio, [
            ['Préstamos vigentes', s.vigentes],
            ['Libros devueltos', s.devueltos],
            ['Préstamos vencidos', s.vencidos]
        ], s.vencidos > 0 ? 'tarjeta-alerta' : ''));
    });
}


const ROLES_ETIQUETA = { socio: 'Socio', bibliotecario: 'Bibliotecario', director: 'Director' };

function prepararAlta(alRegistrar) {
    const form = document.querySelector('#form-alta');
    const selRol = document.querySelector('#alta-rol');
    const campoMenor = document.querySelector('#campo-menor');
    const casillaMenor = document.querySelector('#alta-menor');
    const clave = document.querySelector('#alta-clave');

    document.querySelector('#alta-mostrar').addEventListener('change', e => {
        clave.type = e.target.checked ? 'text' : 'password';
    });

    if (selRol && campoMenor) {
        const actualizar = () => {
            campoMenor.hidden = selRol.value !== 'socio';
            if (campoMenor.hidden) casillaMenor.checked = false;
        };
        selRol.addEventListener('change', actualizar);
        actualizar();
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        quitarAvisos('error', 'ok');
        const botonEnviar = form.querySelector('button[type="submit"]');
        botonEnviar.disabled = true;
        try {
            const nuevo = await api('POST', '/api/usuarios', {
                usuario: document.querySelector('#alta-usuario').value.trim(),
                clave: clave.value,
                nombre: document.querySelector('#alta-nombre').value.trim(),
                apellido: document.querySelector('#alta-apellido').value.trim(),
                dni: document.querySelector('#alta-dni').value.trim(),
                rol: selRol ? selRol.value : 'socio',
                esMenor: casillaMenor ? casillaMenor.checked : false
            });
            form.reset();
            clave.type = 'password';
            if (selRol) selRol.dispatchEvent(new Event('change'));
            await alRegistrar();
            mostrarAviso('✅ Se registró a ' + nuevo.nombreVisible + ' como ' +
                ROLES_ETIQUETA[nuevo.rol].toLowerCase() + ' con el usuario \"' + nuevo.usuario +
                '\". Entregale su usuario y contraseña para que pueda ingresar.', 'ok');
        } catch (error) {
            mostrarAviso('⛔ ' + error.message, 'error');
        }
        window.scrollTo(0, 0);
        botonEnviar.disabled = false;
    });
}

async function iniciarSocios() {
    async function dibujar() {
        const socios = await api('GET', '/api/socios');
        const selAviso = document.querySelector('#aviso-socio');
        const elegido = selAviso.value;
        selAviso.replaceChildren();
        socios.filter(s => s.activo).forEach(s => selAviso.append(new Option(s.nombreVisible + ' (' + s.usuario + ')', s.id)));
        if (elegido) selAviso.value = elegido;
        const lista = document.querySelector('#lista-socios');
        lista.replaceChildren();
        if (socios.length === 0) vacio(lista, 'Todavía no hay socios registrados.');
        socios.forEach(s => {
            const art = tarjeta(s.nombreVisible, [
                ['Usuario', s.usuario],
                ['DNI', s.dni],
                ['Préstamos vigentes', s.vigentes],
                ['Préstamos vencidos', s.vencidos],
                ['Estado', s.activo ? 'Activo' : 'Dado de baja']
            ], !s.activo ? 'tarjeta-inactiva' : (s.vencidos > 0 ? 'tarjeta-alerta' : ''));
            const fila = crear('div', null, 'botones');
            fila.append(s.activo
                ? boton('Dar de baja', () => cambiarActividadUsuario(s, false, dibujar), 'boton-secundario')
                : boton('Reactivar', () => cambiarActividadUsuario(s, true, dibujar)));
            art.append(fila);
            lista.append(art);
        });
    }
    prepararAlta(dibujar);
    prepararAviso();
    await dibujar();
}

function prepararAviso() {
    const form = document.querySelector('#form-aviso');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        quitarAvisos('error', 'ok', 'info');
        const botonEnviar = form.querySelector('button[type="submit"]');
        botonEnviar.disabled = true;
        try {
            const resultado = await api('POST', '/api/notificaciones', {
                socioId: document.querySelector('#aviso-socio').value,
                mensaje: document.querySelector('#aviso-mensaje').value.trim()
            });
            document.querySelector('#aviso-mensaje').value = '';
            mostrarAviso('✅ ' + resultado.mensaje, 'ok');
        } catch (error) {
            mostrarAviso('⛔ ' + error.message, 'error');
        }
        window.scrollTo(0, 0);
        botonEnviar.disabled = false;
    });
}

async function cambiarActividadUsuario(u, activo, dibujar) {
    if (!activo && !window.confirm('¿Dar de baja a ' + u.nombreVisible + ' (' + u.usuario + ')? No podrá ingresar al sistema.')) return;
    quitarAvisos('error', 'ok', 'info');
    try {
        await api('PATCH', '/api/usuarios/' + encodeURIComponent(u.id) + '/estado', { activo });
        await dibujar();
        mostrarAviso('✅ ' + u.nombreVisible + (activo ? ' fue reactivado/a.' : ' fue dado/a de baja.'), 'ok');
    } catch (error) {
        mostrarAviso('⛔ ' + error.message, 'error');
        await dibujar().catch(() => {});
    }
    window.scrollTo(0, 0);
}

async function iniciarUsuarios() {
    const contenedores = {
        bibliotecario: document.querySelector('#lista-bibliotecarios'),
        socio: document.querySelector('#lista-socios'),
        director: document.querySelector('#lista-directores')
    };

    async function dibujar() {
        const usuarios = await api('GET', '/api/usuarios');
        Object.entries(contenedores).forEach(([rol, cont]) => {
            cont.replaceChildren();
            const deRol = usuarios.filter(u => u.rol === rol);
            if (deRol.length === 0) vacio(cont, 'No hay usuarios con este rol.');
            deRol.forEach(u => {
                const art = tarjeta(u.nombreVisible, [
                    ['Usuario', u.usuario],
                    ['DNI', u.dni],
                    ['Rol', ROLES_ETIQUETA[u.rol]],
                    ['Fecha de alta', formatearFecha(u.fechaAlta)],
                    ['Estado', u.activo ? 'Activo' : 'Dado de baja']
                ], u.activo ? '' : 'tarjeta-inactiva');
                if (u.rol !== 'director' && u.id !== usuarioActual.id) {
                    const fila = crear('div', null, 'botones');
                    fila.append(u.activo
                        ? boton('Dar de baja', () => cambiarActividadUsuario(u, false, dibujar), 'boton-secundario')
                        : boton('Reactivar', () => cambiarActividadUsuario(u, true, dibujar)));
                    art.append(fila);
                }
                cont.append(art);
            });
        });
    }

    prepararAlta(dibujar);
    await dibujar();
}

const INICIADORES = {
    login: iniciarLogin,
    index: iniciarIndex,
    catalogo: iniciarCatalogo,
    stock: iniciarStock,
    reserva: iniciarReserva,
    confirmacion: iniciarConfirmacion,
    resultados: iniciarResultados,
    gestion: iniciarGestion,
    tablero: iniciarTablero,
    socios: iniciarSocios,
    usuarios: iniciarUsuarios
};

async function iniciar() {
    const pagina = document.body.dataset.pagina;
    const sesion = leerSesion();

    if (pagina === 'login') {
        if (sesion) {
            window.location.href = RAIZ + 'index.html';
            return;
        }
        construirMenu();
        const conectando = mostrarAviso('Conectando con el servidor… la primera vez puede demorar hasta un minuto.', 'info');
        try {
            await INICIADORES.login();
        } finally {
            conectando.remove();
        }
        return;
    }

    if (!sesion) {
        window.location.href = PAGINAS + 'login.html';
        return;
    }

    const conectando = mostrarAviso('Conectando con el servidor… la primera vez puede demorar hasta un minuto.', 'info');
    try {
        usuarioActual = await api('GET', '/api/sesion');
    } catch (error) {
        conectando.remove();
        mostrarAviso('⛔ ' + error.message, 'error');
        return;
    }

    if (!PERMISOS[pagina].includes(usuarioActual.rol)) {
        window.location.href = RAIZ + 'index.html';
        return;
    }

    construirMenu();
    construirPie();

    try {
        const resumenSocio = await mostrarAvisosDelSocio();
        await INICIADORES[pagina](resumenSocio);
    } catch (error) {
        mostrarAviso('⛔ ' + error.message, 'error');
    } finally {
        conectando.remove();
    }
    iniciarAvisosEnVivo();
}

document.addEventListener('DOMContentLoaded', iniciar);
