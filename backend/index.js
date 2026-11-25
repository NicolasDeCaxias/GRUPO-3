const express = require('express');
const servicios = require('./servicios');
const docs = require('./docs');

const { ErrorApi } = servicios;

const app = express();
const PUERTO = process.env.PORT || 3000;
const ORIGEN_PERMITIDO = (process.env.FRONTEND_URL || '*').replace(/\/$/, '');
const MODO_DEMO = process.env.MODO_DEMO !== 'false';

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', ORIGEN_PERMITIDO);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});

app.use(express.json());

app.use((req, res, next) => {
    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
    req.token = token;
    req.usuario = token ? servicios.usuarioDeToken(token) : null;
    next();
});

function requerirSesion(req, res, next) {
    if (!req.usuario) {
        next(new ErrorApi(401, 'Sesión inválida o vencida. Iniciá sesión nuevamente.'));
        return;
    }
    next();
}

function requerirRol(...roles) {
    return (req, res, next) => {
        if (!req.usuario) {
            next(new ErrorApi(401, 'Sesión inválida o vencida. Iniciá sesión nuevamente.'));
            return;
        }
        if (!roles.includes(req.usuario.rol)) {
            next(new ErrorApi(403, 'Tu rol no tiene permiso para realizar esta operación.'));
            return;
        }
        next();
    };
}

function responder(funcion, estado) {
    return (req, res, next) => {
        try {
            res.status(estado || 200).json(funcion(req));
        } catch (error) {
            next(error);
        }
    };
}

app.get('/api/salud', responder(() => ({ estado: 'ok' })));

app.get('/api/docs', responder(() => ({ servicio: 'BiblioTech API', endpoints: docs.ENDPOINTS, codigos: docs.CODIGOS })));

app.get('/api/config', responder(() => servicios.obtenerConfig()));

app.get('/api/demo-usuarios', responder(() => ({
    usuarios: servicios.listarUsuariosDemo(MODO_DEMO)
})));

app.post('/api/login', (req, res, next) => {
    try {
        const cuerpo = req.body || {};
        res.json(servicios.iniciarSesion(cuerpo.usuario, cuerpo.clave));
    } catch (error) {
        next(error);
    }
});

app.post('/api/logout', requerirSesion, responder((req) => {
    servicios.cerrarSesion(req.token);
    return { sesionCerrada: true };
}));

app.get('/api/sesion', requerirSesion, responder((req) => servicios.usuarioPublico(req.usuario)));

app.post('/api/demo/reiniciar', requerirSesion, (req, res, next) => {
    if (!MODO_DEMO) {
        next(new ErrorApi(403, 'El reinicio de datos está deshabilitado.'));
        return;
    }
    responder(() => servicios.reiniciarDatos())(req, res, next);
});

app.get('/api/libros', requerirSesion, responder((req) => servicios.listarLibros(req.query.q)));

app.get('/api/stock/resumen', requerirSesion, responder(() => servicios.resumenStock()));

app.get('/api/socios', requerirRol('bibliotecario'), responder(() => servicios.listarSocios()));

app.get('/api/usuarios', requerirRol('director'),
    responder((req) => servicios.listarUsuarios(req.query.rol)));

app.post('/api/usuarios', requerirRol('director', 'bibliotecario'),
    responder((req) => servicios.registrarUsuario(req.usuario, req.body || {}), 201));

app.patch('/api/usuarios/:id/estado', requerirRol('director', 'bibliotecario'),
    responder((req) => servicios.cambiarEstadoUsuario(req.usuario, req.params.id, (req.body || {}).activo)));

app.post('/api/prestamos', requerirRol('socio', 'bibliotecario'),
    responder((req) => servicios.crearPrestamo(req.usuario, req.body || {}), 201));

app.get('/api/prestamos/mios', requerirRol('socio'),
    responder((req) => servicios.prestamosDeSocio(req.usuario)));

app.get('/api/prestamos/resumen', requerirRol('socio'),
    responder((req) => servicios.resumenSocio(req.usuario)));

app.get('/api/prestamos', requerirRol('bibliotecario'),
    responder((req) => servicios.listarPrestamos(req.query.estado)));

app.get('/api/prestamos/:id', requerirRol('socio', 'bibliotecario'),
    responder((req) => servicios.obtenerPrestamo(req.usuario, req.params.id)));

app.patch('/api/prestamos/:id/estado', requerirRol('bibliotecario'),
    responder((req) => servicios.cambiarEstadoPrestamo(req.params.id, (req.body || {}).estado)));

app.post('/api/prestamos/:id/notificaciones', requerirRol('bibliotecario'), (req, res, next) => {
    try {
        const resultado = servicios.notificarMoroso(req.params.id);
        res.status(resultado.creada ? 201 : 200).json(resultado);
    } catch (error) {
        next(error);
    }
});

app.get('/api/notificaciones/mias', requerirRol('socio'),
    responder((req) => servicios.listarNotificaciones(req.usuario)));

app.patch('/api/notificaciones/mias/leidas', requerirRol('socio'),
    responder((req) => servicios.marcarNotificacionesLeidas(req.usuario)));

app.get('/api/ejemplares', requerirRol('bibliotecario'),
    responder((req) => servicios.listarEjemplares(req.query.estado)));

app.patch('/api/ejemplares/:id/estado', requerirRol('bibliotecario'),
    responder((req) => servicios.darDeBajaEjemplar(req.params.id, (req.body || {}).estado)));

app.get('/api/tablero', requerirRol('director'), responder(() => servicios.generarTablero()));

app.use('/api', (req, res, next) => {
    next(new ErrorApi(404, 'La ruta ' + req.method + ' ' + req.originalUrl + ' no existe.'));
});

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(docs.paginaHtml());
});

app.use((error, req, res, next) => {
    if (error instanceof ErrorApi) {
        res.status(error.estado).json({ error: error.message });
        return;
    }
    if (error.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'El cuerpo de la solicitud no es un JSON válido.' });
        return;
    }
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PUERTO, () => {
    console.log('BiblioTech API escuchando en el puerto ' + PUERTO);
});
