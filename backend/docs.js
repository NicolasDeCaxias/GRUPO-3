const ENDPOINTS = [
    { grupo: 'General', items: [
        ['GET', '/api/salud', 'público', 'Comprueba que el servidor está activo.'],
        ['GET', '/api/config', 'público', 'Días de préstamo, máximo de préstamos, fecha de hoy y fecha límite estimada.'],
        ['GET', '/api/demo-usuarios', 'público', 'Usuarios de demostración para la pantalla de login (vacío si MODO_DEMO=false).'],
        ['POST', '/api/demo/reiniciar', 'autenticado', 'Restablece los datos de demostración.']
    ] },
    { grupo: 'Sesión', items: [
        ['POST', '/api/login', 'público', 'Inicia sesión con "usuario" y "clave"; devuelve "token" y datos del usuario.'],
        ['POST', '/api/logout', 'autenticado', 'Cierra la sesión.'],
        ['GET', '/api/sesion', 'autenticado', 'Devuelve el usuario de la sesión actual.']
    ] },
    { grupo: 'Usuarios', items: [
        ['GET', '/api/usuarios?rol=', 'director', 'Lista los usuarios (sin contraseñas); "rol" filtra por socio, bibliotecario o director.'],
        ['POST', '/api/usuarios', 'director, bibliotecario', 'Registra un usuario ("usuario", "clave", "nombre", "apellido", "rol", "esMenor"). El bibliotecario solo registra socios.'],
        ['PATCH', '/api/usuarios/:id/estado', 'director, bibliotecario', 'Da de baja o reactiva un usuario con { "activo": true | false }. El bibliotecario solo puede hacerlo con socios.'],
        ['GET', '/api/socios', 'bibliotecario', 'Lista de socios con usuario, estado y préstamos vigentes y vencidos.']
    ] },
    { grupo: 'Catálogo e inventario', items: [
        ['GET', '/api/libros?q=', 'autenticado', 'Lista libros con disponibilidad; "q" filtra por título, autor, género o código.'],
        ['GET', '/api/stock/resumen', 'autenticado', 'Totales del inventario.'],
        ['GET', '/api/ejemplares?estado=', 'bibliotecario', 'Lista ejemplares, opcionalmente por estado.'],
        ['PATCH', '/api/ejemplares/:id/estado', 'bibliotecario', 'Da de baja un ejemplar disponible (estado: "baja").']
    ] },
    { grupo: 'Préstamos', items: [
        ['POST', '/api/prestamos', 'socio, bibliotecario', 'Crea una solicitud de préstamo ("libroId", "ejemplarId" y "socioId" si la registra el bibliotecario).'],
        ['GET', '/api/prestamos/mios', 'socio', 'Préstamos del socio con estado, vencimiento y atraso.'],
        ['GET', '/api/prestamos/resumen', 'socio', 'Cupo usado, vencidos y avisos sin leer.'],
        ['GET', '/api/prestamos?estado=', 'bibliotecario', 'Lista préstamos por estado: pendiente, activo, vencido o vence-hoy.'],
        ['GET', '/api/prestamos/:id', 'socio (propio), bibliotecario', 'Comprobante de un préstamo.'],
        ['PATCH', '/api/prestamos/:id/estado', 'bibliotecario', 'Cambia el estado: "activo" (aprobar), "rechazado" o "devuelto".'],
        ['POST', '/api/prestamos/:id/notificaciones', 'bibliotecario', 'Envía un aviso al socio por un préstamo vencido.']
    ] },
    { grupo: 'Avisos y tablero', items: [
        ['POST', '/api/notificaciones', 'bibliotecario', 'Envía un aviso con mensaje propio a un socio ("socioId", "mensaje" de 3 a 300 caracteres).'],
        ['GET', '/api/notificaciones/mias', 'socio', 'Avisos de la biblioteca del socio, con quién los envió. El sistema los consulta cada pocos segundos para mostrarlos en vivo.'],
        ['PATCH', '/api/notificaciones/mias/leidas', 'socio', 'Marca los avisos como leídos.'],
        ['GET', '/api/tablero', 'director', 'Indicadores, categorías más leídas, libros sin stock y actividad de socios.']
    ] }
];

const CODIGOS = [
    ['200', 'OK'], ['201', 'Creado'], ['400', 'Datos inválidos'], ['401', 'Sin sesión'],
    ['403', 'Rol sin permiso'], ['404', 'No existe'], ['409', 'Conflicto de estado o usuario repetido'],
    ['422', 'Regla de negocio incumplida']
];

function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paginaHtml() {
    const total = ENDPOINTS.reduce((n, g) => n + g.items.length, 0);
    const grupos = ENDPOINTS.map((g) => `
    <section>
      <h2>${esc(g.grupo)}</h2>
      <div class="tabla"><table>
        <thead><tr><th>Método</th><th>Ruta</th><th>Rol</th><th>Descripción</th></tr></thead>
        <tbody>${g.items.map(([m, r, rol, d]) => `
          <tr><td><span class="m ${m}">${m}</span></td><td><code>${esc(r)}</code></td><td>${esc(rol)}</td><td>${esc(d)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </section>`).join('');
    const codigos = CODIGOS.map(([c, t]) => `<li><strong>${c}</strong> ${esc(t)}</li>`).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BiblioTech API</title>
<style>
  :root { --azul:#173b57; --oscuro:#102a43; --oro:#c9a227; --fondo:#f4efe6; --texto:#2c241b; --papel:#fffdf8; --borde:#d8cdbb; }
  @media (prefers-color-scheme: dark) { :root { --fondo:#14181d; --texto:#ece6da; --papel:#1c222a; --borde:#3a4452; } }
  body { margin:0; font-family: Georgia, "Times New Roman", serif; background:var(--fondo); color:var(--texto); }
  header { background:var(--azul); border-bottom:5px solid var(--oro); text-align:center; padding:28px 16px; }
  header h1 { margin:0; color:#f4d06f; font-size:34px; }
  header p { margin:6px 0 0; color:#f4efe6; }
  main { max-width:1000px; margin:auto; padding:20px 16px 50px; }
  h2 { border-bottom:2px solid var(--oro); padding-bottom:6px; color:var(--azul); }
  @media (prefers-color-scheme: dark) { h2 { color:#f4d06f; } }
  .tabla { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; background:var(--papel); border:1px solid var(--borde); }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--borde); vertical-align:top; }
  th { background:var(--oscuro); color:#f4efe6; }
  code { font-family: Consolas, monospace; font-size:14px; word-break:break-all; }
  .m { display:inline-block; min-width:56px; text-align:center; padding:2px 8px; border-radius:4px; color:#fff; font-weight:bold; font-size:13px; }
  .GET { background:#2e7d32; } .POST { background:#173b57; } .PATCH { background:#a15c00; }
  .caja { background:var(--papel); border:1px solid var(--borde); border-radius:8px; padding:16px 20px; }
  .codigos { columns:2; padding-left:18px; }
  button { background:var(--azul); color:#fff; border:0; border-radius:5px; padding:10px 16px; font:bold 15px Georgia, serif; cursor:pointer; margin-right:8px; }
  button:hover { background:var(--oro); color:var(--oscuro); }
  pre { background:var(--oscuro); color:#e8e1d5; padding:14px; border-radius:6px; overflow-x:auto; min-height:20px; }
  footer { text-align:center; padding:18px; background:var(--oscuro); color:#e8e1d5; border-top:4px solid var(--oro); }
</style>
</head>
<body>
<header>
  <h1>BiblioTech API</h1>
  <p>Biblioteca Provincial "Manuel Belgrano" · API REST (Node.js + Express) · ${total} endpoints</p>
</header>
<main>
  <section>
    <h2>Cómo se usa</h2>
    <div class="caja">
      <p>Todos los intercambios son JSON. Se obtiene un <code>token</code> con <code>POST /api/login</code> y se envía en cada pedido protegido con la cabecera <code>Authorization: Bearer &lt;token&gt;</code>. Los errores responden <code>{ "error": "mensaje" }</code>.</p>
      <p>Los datos viven en memoria: se reinician cuando el servidor se reinicia.</p>
    </div>
  </section>
  <section>
    <h2>Probar en vivo</h2>
    <div class="caja">
      <p>Pedidos públicos contra este mismo servidor:</p>
      <button id="b-salud">GET /api/salud</button>
      <button id="b-config">GET /api/config</button>
      <pre id="salida">Presioná un botón para ver la respuesta.</pre>
    </div>
  </section>
  ${grupos}
  <section>
    <h2>Códigos de estado</h2>
    <div class="caja"><ul class="codigos">${codigos}</ul></div>
  </section>
  <section>
    <h2>Versión JSON</h2>
    <p>Esta documentación también está disponible como datos en <a href="/api/docs"><code>GET /api/docs</code></a>.</p>
  </section>
</main>
<footer>&copy; 2026 BiblioTech · Grupo 3</footer>
<script>
  const salida = document.getElementById('salida');
  async function probar(ruta) {
    salida.textContent = 'Consultando ' + ruta + ' …';
    try {
      const r = await fetch(ruta);
      salida.textContent = 'HTTP ' + r.status + '\\n' + JSON.stringify(await r.json(), null, 2);
    } catch (e) { salida.textContent = 'No se pudo conectar: ' + e.message; }
  }
  document.getElementById('b-salud').addEventListener('click', () => probar('/api/salud'));
  document.getElementById('b-config').addEventListener('click', () => probar('/api/config'));
</script>
</body>
</html>`;
}

module.exports = { ENDPOINTS, CODIGOS, paginaHtml };
