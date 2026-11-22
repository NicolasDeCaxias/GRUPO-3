const ZONA = 'America/Argentina/Buenos_Aires';

function hoyISO() {
    return new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
}

function sumarDias(iso, dias) {
    const fecha = new Date(iso + 'T12:00:00Z');
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return fecha.toISOString().slice(0, 10);
}

function diasEntre(desde, hasta) {
    return Math.round((new Date(hasta + 'T12:00:00Z') - new Date(desde + 'T12:00:00Z')) / 86400000);
}

module.exports = { hoyISO, sumarDias, diasEntre };
