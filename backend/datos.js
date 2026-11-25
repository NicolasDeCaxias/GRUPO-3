const { hoyISO, sumarDias } = require('./fechas');

function crearDatos() {
    const hoy = hoyISO();
    const d = (n) => sumarDias(hoy, n);

    const usuarios = [
        { id: 'U01', usuario: 'lucia', dni: '40123456', clave: 'Lucia#Libro26', nombre: 'Lucía', apellido: 'Fernández', rol: 'socio', esMenor: false },
        { id: 'U02', usuario: 'carlos', dni: '38234567', clave: 'Carlos#Mapa26', nombre: 'Carlos', apellido: 'Benítez', rol: 'socio', esMenor: false },
        { id: 'U03', usuario: 'tomas', dni: '50345678', clave: 'Tomas#Luna26', nombre: 'Tomás', apellido: 'Ruiz', rol: 'socio', esMenor: true },
        { id: 'U04', usuario: 'sofia', dni: '42456789', clave: 'Sofia#Rio26', nombre: 'Sofía', apellido: 'Alonso', rol: 'socio', esMenor: false },
        { id: 'U05', usuario: 'julia', dni: '28567890', clave: 'Julia#Tinta26', nombre: 'Julia', apellido: 'Martínez', rol: 'bibliotecario', esMenor: false },
        { id: 'U06', usuario: 'roberto', dni: '25678901', clave: 'Roberto#Lupa26', nombre: 'Roberto', apellido: 'Paz', rol: 'bibliotecario', esMenor: false },
        { id: 'U07', usuario: 'alicia', dni: '22789012', clave: 'Alicia#Faro26', nombre: 'Alicia', apellido: 'Romero', rol: 'director', esMenor: false },
        { id: 'U08', usuario: 'hector', dni: '20890123', clave: 'Hector#Cima26', nombre: 'Héctor', apellido: 'Vega', rol: 'director', esMenor: false }
    ];

    const libros = [
        { id: 'L001', codigo: '001', titulo: 'Don Quijote de la Mancha', autor: 'Miguel de Cervantes', genero: 'Novela', restringido: false },
        { id: 'L002', codigo: '002', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', genero: 'Realismo mágico', restringido: false },
        { id: 'L003', codigo: '003', titulo: 'El Principito', autor: 'Antoine de Saint-Exupéry', genero: 'Literatura infantil', restringido: false },
        { id: 'L004', codigo: '004', titulo: '1984', autor: 'George Orwell', genero: 'Ciencia ficción / Distopía', restringido: false },
        { id: 'L005', codigo: '005', titulo: 'Historia de la Biblioteca Nacional', autor: 'Biblioteca Nacional', genero: 'Historia', restringido: true }
    ];

    const estadosEjemplares = {
        L001: ['disponible', 'disponible', 'disponible', 'prestado', 'prestado'],
        L002: ['disponible', 'disponible', 'prestado', 'reservado'],
        L003: ['disponible', 'disponible', 'disponible', 'reservado', 'prestado', 'prestado'],
        L004: ['prestado', 'prestado', 'prestado'],
        L005: ['disponible']
    };

    const ejemplares = [];
    libros.forEach((libro) => {
        estadosEjemplares[libro.id].forEach((estado, i) => {
            ejemplares.push({
                id: libro.codigo + '-' + String(i + 1).padStart(2, '0'),
                libroId: libro.id,
                estado
            });
        });
    });

    const activo = (id, usuarioId, libroId, ejemplarId, desde) => ({
        id, usuarioId, libroId, ejemplarId,
        fechaSolicitud: d(desde),
        fechaPrestamo: d(desde),
        fechaLimite: d(desde + 14),
        fechaDevolucion: null,
        estado: 'activo'
    });

    const pendiente = (id, usuarioId, libroId, ejemplarId, desde) => ({
        id, usuarioId, libroId, ejemplarId,
        fechaSolicitud: d(desde),
        fechaPrestamo: null,
        fechaLimite: d(desde + 14),
        fechaDevolucion: null,
        estado: 'pendiente'
    });

    const devuelto = (id, usuarioId, libroId, ejemplarId, prestamo, limite, devolucion) => ({
        id, usuarioId, libroId, ejemplarId,
        fechaSolicitud: prestamo,
        fechaPrestamo: prestamo,
        fechaLimite: limite,
        fechaDevolucion: devolucion,
        estado: 'devuelto'
    });

    const prestamos = [
        activo('P001', 'U01', 'L001', '001-04', -5),
        activo('P002', 'U01', 'L003', '003-05', -3),
        activo('P003', 'U02', 'L002', '002-03', -25),
        activo('P004', 'U02', 'L004', '004-01', -30),
        activo('P005', 'U02', 'L001', '001-05', -4),
        activo('P006', 'U03', 'L003', '003-06', -2),
        activo('P007', 'U03', 'L004', '004-03', -3),
        activo('P008', 'U04', 'L004', '004-02', -14),
        pendiente('P009', 'U03', 'L002', '002-04', -1),
        pendiente('P010', 'U04', 'L003', '003-04', -1),
        devuelto('P011', 'U01', 'L002', '002-01', '2026-07-15', '2026-07-29', '2026-07-28'),
        devuelto('P012', 'U01', 'L004', '004-01', '2026-07-01', '2026-07-15', '2026-07-14'),
        devuelto('P013', 'U01', 'L003', '003-01', '2026-08-10', '2026-08-24', '2026-08-22'),
        devuelto('P014', 'U02', 'L001', '001-02', '2026-08-03', '2026-08-17', '2026-08-16'),
        devuelto('P015', 'U02', 'L003', '003-02', '2026-09-02', '2026-09-16', '2026-09-15'),
        devuelto('P016', 'U03', 'L003', '003-03', '2026-09-05', '2026-09-19', '2026-09-18'),
        devuelto('P017', 'U04', 'L002', '002-02', '2026-09-10', '2026-09-24', '2026-09-23'),
        devuelto('P018', 'U04', 'L001', '001-03', '2026-08-20', '2026-09-03', '2026-09-01')
    ];

    const notificaciones = [
        {
            id: 'N001',
            usuarioId: 'U02',
            prestamoId: 'P004',
            mensaje: 'Tenés un préstamo vencido de "1984". Por favor acercate a la biblioteca a devolverlo.',
            fecha: d(-5),
            leida: false
        }
    ];

    return {
        config: { diasPrestamo: 14, maxPrestamos: 3 },
        usuarios,
        libros,
        ejemplares,
        prestamos,
        notificaciones
    };
}

module.exports = { crearDatos };
