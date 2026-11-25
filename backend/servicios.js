const crypto = require('crypto');
const { crearDatos } = require('./datos');
const { hoyISO, sumarDias, diasEntre } = require('./fechas');

class ErrorApi extends Error {
    constructor(estado, mensaje) {
        super(mensaje);
        this.estado = estado;
    }
}

function hashearClave(clave) {
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(clave, sal, 32).toString('hex');
    return sal + ':' + hash;
}

function claveCorrecta(clave, almacenada) {
    const [sal, hash] = String(almacenada).split(':');
    if (!sal || !hash) return false;
    const calculado = crypto.scryptSync(clave, sal, 32);
    const esperado = Buffer.from(hash, 'hex');
    return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

function crearDatosIniciales() {
    const iniciales = crearDatos();
    iniciales.usuarios = iniciales.usuarios.map((u) => {
        const { clave, ...resto } = u;
        return { ...resto, claveDemo: clave, claveHash: hashearClave(clave), activo: true, fechaAlta: hoyISO(), creadoPor: null };
    });
    return iniciales;
}

let datos = crearDatosIniciales();
const sesiones = new Map();

const ROLES_ALTA = ['socio', 'bibliotecario'];
const MINIMO_CLAVE = 8;

function normalizar(texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nombreVisible(u) {
    return u.esMenor ? u.nombre + ' (socio menor)' : u.nombre + ' ' + u.apellido;
}

function usuarioPublico(u) {
    return {
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        nombreVisible: nombreVisible(u),
        rol: u.rol,
        esMenor: u.esMenor
    };
}

function usuarioAdministrable(u) {
    return {
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        apellido: u.apellido,
        nombreVisible: nombreVisible(u),
        rol: u.rol,
        esMenor: u.esMenor,
        activo: u.activo,
        fechaAlta: u.fechaAlta
    };
}

function libroPorId(id) { return datos.libros.find((l) => l.id === id); }
function usuarioPorId(id) { return datos.usuarios.find((u) => u.id === id); }
function ejemplarPorId(id) { return datos.ejemplares.find((e) => e.id === id); }
function prestamoPorId(id) { return datos.prestamos.find((p) => p.id === id); }

function ejemplaresDe(libroId) {
    return datos.ejemplares.filter((e) => e.libroId === libroId && e.estado !== 'baja');
}

function disponiblesDe(libroId) {
    return ejemplaresDe(libroId).filter((e) => e.estado === 'disponible');
}

function estadoLibro(libro) {
    if (libro.restringido) return 'Consulta en sala';
    return disponiblesDe(libro.id).length > 0 ? 'Disponible' : 'Sin stock';
}

function prestamosVigentesDe(usuarioId) {
    return datos.prestamos.filter((p) =>
        p.usuarioId === usuarioId && (p.estado === 'pendiente' || p.estado === 'activo'));
}

function estaVencido(p) {
    return p.estado === 'activo' && p.fechaLimite < hoyISO();
}

function prestamosVencidos() {
    return datos.prestamos.filter(estaVencido);
}

function vencidosDe(usuarioId) {
    return prestamosVencidos().filter((p) => p.usuarioId === usuarioId);
}

function siguienteId(lista, prefijo, ancho = 3) {
    const mayor = lista.reduce((max, x) =>
        Math.max(max, parseInt(x.id.slice(prefijo.length), 10) || 0), 0);
    return prefijo + String(mayor + 1).padStart(ancho, '0');
}

function presentarPrestamo(p) {
    const libro = libroPorId(p.libroId);
    const socio = usuarioPorId(p.usuarioId);
    const vencido = estaVencido(p);
    return {
        id: p.id,
        socioId: socio.id,
        socio: nombreVisible(socio),
        libroId: libro.id,
        titulo: libro.titulo,
        autor: libro.autor,
        genero: libro.genero,
        ejemplarId: p.ejemplarId,
        estado: p.estado,
        fechaSolicitud: p.fechaSolicitud,
        fechaPrestamo: p.fechaPrestamo,
        fechaLimite: p.fechaLimite,
        fechaDevolucion: p.fechaDevolucion,
        vencido,
        diasAtraso: vencido ? diasEntre(p.fechaLimite, hoyISO()) : 0
    };
}

function exigirTexto(valor, nombre) {
    if (typeof valor !== 'string' || valor.trim() === '') {
        throw new ErrorApi(400, 'Falta el campo "' + nombre + '".');
    }
    return valor.trim();
}

function iniciarSesion(usuario, clave) {
    const nombre = exigirTexto(usuario, 'usuario');
    const pass = exigirTexto(clave, 'clave');
    const encontrado = datos.usuarios.find((u) => u.usuario === nombre.toLowerCase());
    if (!encontrado || !claveCorrecta(pass, encontrado.claveHash)) {
        throw new ErrorApi(401, 'Usuario o contraseña incorrectos.');
    }
    if (!encontrado.activo) {
        throw new ErrorApi(403, 'Tu usuario fue dado de baja. Consultá con la dirección de la biblioteca.');
    }
    const token = crypto.randomUUID();
    sesiones.set(token, encontrado.id);
    return { token, usuario: usuarioPublico(encontrado) };
}

function usuarioDeToken(token) {
    const id = sesiones.get(token);
    if (!id) return null;
    const u = usuarioPorId(id);
    return u && u.activo ? u : null;
}

function cerrarSesion(token) {
    sesiones.delete(token);
}

function obtenerConfig() {
    const hoy = hoyISO();
    return {
        diasPrestamo: datos.config.diasPrestamo,
        maxPrestamos: datos.config.maxPrestamos,
        hoy,
        fechaLimitePrestamo: sumarDias(hoy, datos.config.diasPrestamo)
    };
}

function listarUsuariosDemo(modoDemo) {
    if (!modoDemo) return [];
    return datos.usuarios
        .filter((u) => u.activo && u.claveDemo)
        .map((u) => ({ usuario: u.usuario, rol: u.rol, esMenor: u.esMenor, clave: u.claveDemo }));
}

function listarLibros(busqueda) {
    const texto = normalizar(busqueda || '').trim();
    return datos.libros
        .filter((l) =>
            normalizar(l.titulo).includes(texto) ||
            normalizar(l.autor).includes(texto) ||
            normalizar(l.genero).includes(texto) ||
            l.codigo.includes(texto))
        .map((l) => {
            const total = ejemplaresDe(l.id).length;
            const disponibles = disponiblesDe(l.id);
            return {
                id: l.id,
                codigo: l.codigo,
                titulo: l.titulo,
                autor: l.autor,
                genero: l.genero,
                restringido: l.restringido,
                estado: estadoLibro(l),
                ejemplaresTotales: total,
                ejemplaresDisponibles: disponibles.map((e) => e.id),
                disponibles: disponibles.length,
                prestados: total - disponibles.length,
                bajas: datos.ejemplares.filter((e) => e.libroId === l.id && e.estado === 'baja').length
            };
        });
}

function resumenStock() {
    const vigentes = datos.ejemplares.filter((e) => e.estado !== 'baja').length;
    const disponibles = datos.ejemplares.filter((e) => e.estado === 'disponible').length;
    const sinStock = datos.libros.filter((l) => !l.restringido && disponiblesDe(l.id).length === 0).length;
    return {
        totalLibros: datos.libros.length,
        totalEjemplares: vigentes,
        ejemplaresDisponibles: disponibles,
        ejemplaresPrestados: vigentes - disponibles,
        librosSinStock: sinStock
    };
}

function listarSocios() {
    return datos.usuarios
        .filter((u) => u.rol === 'socio')
        .map((u) => ({
            id: u.id,
            usuario: u.usuario,
            nombreVisible: nombreVisible(u),
            activo: u.activo,
            vigentes: prestamosVigentesDe(u.id).length,
            vencidos: vencidosDe(u.id).length
        }));
}

function validarUsuarioNuevo(valor) {
    const usuario = exigirTexto(valor, 'usuario').toLowerCase();
    if (usuario.includes('@')) {
        throw new ErrorApi(400, 'El usuario no puede ser un correo electrónico. Usá un nombre propio de la biblioteca, por ejemplo \"pepe\" o \"maria.gomez\".');
    }
    if (!/^[a-z][a-z0-9._-]{2,19}$/.test(usuario)) {
        throw new ErrorApi(400, 'El usuario debe tener entre 3 y 20 caracteres, empezar con una letra y usar solo letras minúsculas sin tildes, números, punto, guion o guion bajo.');
    }
    if (datos.usuarios.some((u) => u.usuario === usuario)) {
        throw new ErrorApi(409, 'Ya existe un usuario llamado \"' + usuario + '\". Elegí otro.');
    }
    return usuario;
}

function validarNombrePersona(valor, etiqueta) {
    const texto = exigirTexto(valor, etiqueta);
    if (!/^[\p{L}][\p{L} '.-]{0,39}$/u.test(texto)) {
        throw new ErrorApi(400, 'El campo \"' + etiqueta + '\" solo admite letras y hasta 40 caracteres.');
    }
    return texto;
}

function registrarUsuario(actor, cuerpo) {
    const rol = exigirTexto(cuerpo.rol, 'rol');
    if (!ROLES_ALTA.includes(rol)) {
        throw new ErrorApi(400, 'Solo se pueden registrar usuarios con rol \"socio\" o \"bibliotecario\".');
    }
    if (actor.rol === 'bibliotecario' && rol !== 'socio') {
        throw new ErrorApi(403, 'Un bibliotecario solo puede registrar socios.');
    }
    const usuario = validarUsuarioNuevo(cuerpo.usuario);
    const clave = exigirTexto(cuerpo.clave, 'clave');
    if (clave.length < MINIMO_CLAVE || clave.length > 64) {
        throw new ErrorApi(400, 'La contraseña debe tener entre ' + MINIMO_CLAVE + ' y 64 caracteres.');
    }
    if (!/[A-Za-z]/.test(clave) || !/[0-9]/.test(clave)) {
        throw new ErrorApi(400, 'La contraseña debe combinar letras y números.');
    }
    if (clave.toLowerCase().includes(usuario)) {
        throw new ErrorApi(400, 'La contraseña no puede contener el nombre de usuario.');
    }
    const nombre = validarNombrePersona(cuerpo.nombre, 'nombre');
    const apellido = validarNombrePersona(cuerpo.apellido, 'apellido');
    const esMenor = rol === 'socio' && cuerpo.esMenor === true;

    const nuevo = {
        id: siguienteId(datos.usuarios, 'U', 2),
        usuario,
        claveHash: hashearClave(clave),
        nombre,
        apellido,
        rol,
        esMenor,
        activo: true,
        fechaAlta: hoyISO(),
        creadoPor: actor.id
    };
    datos.usuarios.push(nuevo);
    return usuarioAdministrable(nuevo);
}

function listarUsuarios(rol) {
    if (rol && !['socio', 'bibliotecario', 'director'].includes(rol)) {
        throw new ErrorApi(400, 'El parámetro \"rol\" debe ser socio, bibliotecario o director.');
    }
    return datos.usuarios.filter((u) => !rol || u.rol === rol).map(usuarioAdministrable);
}

function cambiarEstadoUsuario(actor, id, activo) {
    if (typeof activo !== 'boolean') {
        throw new ErrorApi(400, 'El campo \"activo\" debe ser true o false.');
    }
    const objetivo = usuarioPorId(id);
    if (!objetivo) throw new ErrorApi(404, 'El usuario indicado no existe.');
    if (actor.rol === 'bibliotecario' && objetivo.rol !== 'socio') {
        throw new ErrorApi(403, 'Un bibliotecario solo puede dar de baja o reactivar socios.');
    }
    if (objetivo.rol === 'director') {
        throw new ErrorApi(403, 'No se puede modificar el estado de un director.');
    }
    if (objetivo.id === actor.id) {
        throw new ErrorApi(403, 'No podés darte de baja a vos mismo.');
    }
    if (!activo && objetivo.rol === 'socio' && prestamosVigentesDe(objetivo.id).length > 0) {
        throw new ErrorApi(422, nombreVisible(objetivo) + ' tiene préstamos pendientes o activos. Registrá la devolución antes de darlo de baja.');
    }
    objetivo.activo = activo;
    if (!activo) {
        for (const [token, usuarioId] of sesiones) {
            if (usuarioId === objetivo.id) sesiones.delete(token);
        }
    }
    return usuarioAdministrable(objetivo);
}

function validarSolicitud(actor, socio, libro, ejemplar) {
    const sujeto = actor.rol === 'socio' ? 'Tenés' : nombreVisible(socio) + ' tiene';

    if (vencidosDe(socio.id).length > 0) {
        throw new ErrorApi(422, sujeto + ' una sanción vigente por préstamos vencidos. Debe devolverlos antes de pedir otro libro.');
    }
    if (prestamosVigentesDe(socio.id).length >= datos.config.maxPrestamos) {
        throw new ErrorApi(422, 'No se puede llevar un libro más: el máximo permitido es de ' +
            datos.config.maxPrestamos + ' préstamos simultáneos.');
    }
    if (libro.restringido) {
        throw new ErrorApi(422, '"' + libro.titulo + '" pertenece a una colección restringida. Solo puede consultarse en sala de lectura.');
    }
    if (disponiblesDe(libro.id).length === 0) {
        throw new ErrorApi(422, '"' + libro.titulo + '" no tiene ejemplares disponibles en este momento.');
    }
    if (ejemplar.estado !== 'disponible') {
        throw new ErrorApi(422, 'El ejemplar ' + ejemplar.id + ' no está disponible. Seleccioná otro ejemplar.');
    }
}

function crearPrestamo(actor, cuerpo) {
    let socio;
    if (actor.rol === 'socio') {
        if (cuerpo.socioId && cuerpo.socioId !== actor.id) {
            throw new ErrorApi(403, 'Un socio solo puede solicitar préstamos a su nombre.');
        }
        socio = actor;
    } else {
        socio = usuarioPorId(exigirTexto(cuerpo.socioId, 'socioId'));
        if (!socio || socio.rol !== 'socio') throw new ErrorApi(404, 'El socio indicado no existe.');
        if (!socio.activo) throw new ErrorApi(422, 'El socio indicado está dado de baja.');
    }

    const libro = libroPorId(exigirTexto(cuerpo.libroId, 'libroId'));
    if (!libro) throw new ErrorApi(404, 'El libro indicado no existe.');

    const ejemplar = ejemplarPorId(exigirTexto(cuerpo.ejemplarId, 'ejemplarId'));
    if (!ejemplar) throw new ErrorApi(404, 'El ejemplar indicado no existe.');
    if (ejemplar.libroId !== libro.id) throw new ErrorApi(400, 'El ejemplar no pertenece al libro seleccionado.');

    validarSolicitud(actor, socio, libro, ejemplar);

    const hoy = hoyISO();
    const prestamo = {
        id: siguienteId(datos.prestamos, 'P'),
        usuarioId: socio.id,
        libroId: libro.id,
        ejemplarId: ejemplar.id,
        fechaSolicitud: hoy,
        fechaPrestamo: null,
        fechaLimite: sumarDias(hoy, datos.config.diasPrestamo),
        fechaDevolucion: null,
        estado: 'pendiente'
    };
    ejemplar.estado = 'reservado';
    datos.prestamos.push(prestamo);
    return presentarPrestamo(prestamo);
}

function obtenerPrestamo(actor, id) {
    const prestamo = prestamoPorId(id);
    if (!prestamo) throw new ErrorApi(404, 'El préstamo indicado no existe.');
    if (actor.rol === 'socio' && prestamo.usuarioId !== actor.id) {
        throw new ErrorApi(403, 'No tenés permiso para ver este préstamo.');
    }
    return presentarPrestamo(prestamo);
}

function prestamosDeSocio(actor) {
    return datos.prestamos
        .filter((p) => p.usuarioId === actor.id)
        .sort((a, b) => (b.fechaSolicitud > a.fechaSolicitud ? 1 : b.fechaSolicitud < a.fechaSolicitud ? -1 : 0))
        .map(presentarPrestamo);
}

function resumenSocio(actor) {
    return {
        vigentes: prestamosVigentesDe(actor.id).length,
        maxPrestamos: datos.config.maxPrestamos,
        vencidos: vencidosDe(actor.id).length,
        avisosSinLeer: datos.notificaciones.filter((n) => n.usuarioId === actor.id && !n.leida).length
    };
}

function listarPrestamos(estado) {
    const hoy = hoyISO();
    let lista;
    switch (estado) {
        case 'pendiente':
            lista = datos.prestamos.filter((p) => p.estado === 'pendiente');
            break;
        case 'activo':
            lista = datos.prestamos.filter((p) => p.estado === 'activo');
            break;
        case 'vencido':
            lista = prestamosVencidos();
            break;
        case 'vence-hoy':
            lista = datos.prestamos.filter((p) => p.estado === 'activo' && p.fechaLimite === hoy);
            break;
        default:
            throw new ErrorApi(400, 'El parámetro "estado" debe ser pendiente, activo, vencido o vence-hoy.');
    }
    return lista.map(presentarPrestamo);
}

function cambiarEstadoPrestamo(id, nuevoEstado) {
    const prestamo = prestamoPorId(id);
    if (!prestamo) throw new ErrorApi(404, 'El préstamo indicado no existe.');
    const ejemplar = ejemplarPorId(prestamo.ejemplarId);
    const hoy = hoyISO();

    if (nuevoEstado === 'activo') {
        if (prestamo.estado !== 'pendiente') {
            throw new ErrorApi(409, 'Solo se puede aprobar una solicitud pendiente.');
        }
        prestamo.estado = 'activo';
        prestamo.fechaPrestamo = hoy;
        prestamo.fechaLimite = sumarDias(hoy, datos.config.diasPrestamo);
        ejemplar.estado = 'prestado';
    } else if (nuevoEstado === 'rechazado') {
        if (prestamo.estado !== 'pendiente') {
            throw new ErrorApi(409, 'Solo se puede rechazar una solicitud pendiente.');
        }
        prestamo.estado = 'rechazado';
        ejemplar.estado = 'disponible';
    } else if (nuevoEstado === 'devuelto') {
        if (prestamo.estado !== 'activo') {
            throw new ErrorApi(409, 'Solo se puede registrar la devolución de un préstamo activo.');
        }
        prestamo.estado = 'devuelto';
        prestamo.fechaDevolucion = hoy;
        ejemplar.estado = 'disponible';
    } else {
        throw new ErrorApi(400, 'El estado debe ser "activo", "rechazado" o "devuelto".');
    }
    return presentarPrestamo(prestamo);
}

function notificarMoroso(prestamoId, actor) {
    const prestamo = prestamoPorId(prestamoId);
    if (!prestamo) throw new ErrorApi(404, 'El préstamo indicado no existe.');
    if (!estaVencido(prestamo)) {
        throw new ErrorApi(409, 'Solo se puede notificar un préstamo vencido.');
    }
    const socio = usuarioPorId(prestamo.usuarioId);
    const yaAvisado = datos.notificaciones.some((n) => n.prestamoId === prestamo.id && !n.leida);
    if (yaAvisado) {
        return { creada: false, mensaje: 'Ese socio ya tiene un aviso pendiente de lectura.' };
    }
    const libro = libroPorId(prestamo.libroId);
    datos.notificaciones.push({
        id: siguienteId(datos.notificaciones, 'N'),
        usuarioId: prestamo.usuarioId,
        prestamoId: prestamo.id,
        mensaje: 'Tenés un préstamo vencido de "' + libro.titulo + '" (límite: ' +
            prestamo.fechaLimite.split('-').reverse().join('/') +
            '). Por favor acercate a la biblioteca a devolverlo.',
        fecha: hoyISO(),
        leida: false,
        emisorId: actor ? actor.id : null
    });
    return { creada: true, mensaje: 'Aviso enviado a ' + nombreVisible(socio) + '.' };
}

function enviarAviso(actor, cuerpo) {
    const socioId = exigirTexto(cuerpo.socioId, 'socioId');
    const mensaje = exigirTexto(cuerpo.mensaje, 'mensaje');
    if (mensaje.length < 3 || mensaje.length > 300) {
        throw new ErrorApi(400, 'El mensaje debe tener entre 3 y 300 caracteres.');
    }
    const socio = usuarioPorId(socioId);
    if (!socio || socio.rol !== 'socio') throw new ErrorApi(404, 'El socio indicado no existe.');
    if (!socio.activo) throw new ErrorApi(422, 'El socio indicado está dado de baja.');
    datos.notificaciones.push({
        id: siguienteId(datos.notificaciones, 'N'),
        usuarioId: socio.id,
        prestamoId: null,
        mensaje,
        fecha: hoyISO(),
        leida: false,
        emisorId: actor.id
    });
    return { creada: true, mensaje: 'Aviso enviado a ' + nombreVisible(socio) + '.' };
}

function listarNotificaciones(actor) {
    return datos.notificaciones
        .filter((n) => n.usuarioId === actor.id)
        .slice()
        .reverse()
        .map((n) => {
            const emisor = n.emisorId ? usuarioPorId(n.emisorId) : null;
            return {
                id: n.id,
                mensaje: n.mensaje,
                fecha: n.fecha,
                leida: n.leida,
                emisor: emisor ? nombreVisible(emisor) : null
            };
        });
}

function marcarNotificacionesLeidas(actor) {
    let cantidad = 0;
    datos.notificaciones.forEach((n) => {
        if (n.usuarioId === actor.id && !n.leida) {
            n.leida = true;
            cantidad += 1;
        }
    });
    return { marcadas: cantidad };
}

function listarEjemplares(estado) {
    const validos = ['disponible', 'reservado', 'prestado', 'baja'];
    if (estado && !validos.includes(estado)) {
        throw new ErrorApi(400, 'El parámetro "estado" debe ser disponible, reservado, prestado o baja.');
    }
    return datos.ejemplares
        .filter((e) => !estado || e.estado === estado)
        .map((e) => ({
            id: e.id,
            libroId: e.libroId,
            titulo: libroPorId(e.libroId).titulo,
            estado: e.estado
        }));
}

function darDeBajaEjemplar(id, nuevoEstado) {
    if (nuevoEstado !== 'baja') {
        throw new ErrorApi(400, 'El único cambio de estado permitido para un ejemplar es "baja".');
    }
    const ejemplar = ejemplarPorId(id);
    if (!ejemplar) throw new ErrorApi(404, 'El ejemplar indicado no existe.');
    if (ejemplar.estado !== 'disponible') {
        throw new ErrorApi(409, 'Solo se puede dar de baja un ejemplar disponible.');
    }
    ejemplar.estado = 'baja';
    return { id: ejemplar.id, libroId: ejemplar.libroId, titulo: libroPorId(ejemplar.libroId).titulo, estado: ejemplar.estado };
}

function generarTablero() {
    const resumen = resumenStock();
    const indicadores = [
        { etiqueta: 'Libros en catálogo', valor: resumen.totalLibros },
        { etiqueta: 'Ejemplares totales', valor: resumen.totalEjemplares },
        { etiqueta: 'Ejemplares disponibles', valor: resumen.ejemplaresDisponibles },
        { etiqueta: 'Ejemplares prestados', valor: resumen.ejemplaresPrestados },
        { etiqueta: 'Solicitudes pendientes', valor: datos.prestamos.filter((p) => p.estado === 'pendiente').length },
        { etiqueta: 'Préstamos vencidos', valor: prestamosVencidos().length },
        { etiqueta: 'Socios activos', valor: datos.usuarios.filter((u) => u.rol === 'socio' && u.activo).length },
        { etiqueta: 'Bibliotecarios activos', valor: datos.usuarios.filter((u) => u.rol === 'bibliotecario' && u.activo).length }
    ];

    const conteo = {};
    datos.prestamos.filter((p) => p.estado !== 'rechazado').forEach((p) => {
        const genero = libroPorId(p.libroId).genero;
        conteo[genero] = (conteo[genero] || 0) + 1;
    });
    const categorias = Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .map(([genero, cantidad]) => ({ genero, cantidad }));

    const librosSinStock = datos.libros
        .filter((l) => !l.restringido && disponiblesDe(l.id).length === 0)
        .map((l) => ({ titulo: l.titulo, autor: l.autor, ejemplaresTotales: ejemplaresDe(l.id).length }));

    const bajas = datos.ejemplares.filter((e) => e.estado === 'baja').map((e) => e.id);

    const actividadSocios = datos.usuarios
        .filter((u) => u.rol === 'socio' && u.activo)
        .map((u) => ({
            socio: nombreVisible(u),
            vigentes: prestamosVigentesDe(u.id).length,
            devueltos: datos.prestamos.filter((p) => p.usuarioId === u.id && p.estado === 'devuelto').length,
            vencidos: vencidosDe(u.id).length
        }));

    return { indicadores, categorias, librosSinStock, bajas, actividadSocios };
}

function reiniciarDatos() {
    datos = crearDatosIniciales();
    sesiones.clear();
    return { reiniciado: true };
}

module.exports = {
    ErrorApi,
    iniciarSesion,
    usuarioDeToken,
    usuarioPublico,
    cerrarSesion,
    obtenerConfig,
    listarUsuariosDemo,
    listarLibros,
    resumenStock,
    listarSocios,
    registrarUsuario,
    listarUsuarios,
    cambiarEstadoUsuario,
    crearPrestamo,
    obtenerPrestamo,
    prestamosDeSocio,
    resumenSocio,
    listarPrestamos,
    cambiarEstadoPrestamo,
    notificarMoroso,
    enviarAviso,
    listarNotificaciones,
    marcarNotificacionesLeidas,
    listarEjemplares,
    darDeBajaEjemplar,
    generarTablero,
    reiniciarDatos
};
