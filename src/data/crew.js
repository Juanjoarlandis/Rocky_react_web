// LA CREW — el álbum de cromos de la casa.
// Cada cromo: nombre de guerra, oficio, stats (0-5, medidos en dianas),
// y el expediente del reverso con la página donde vive cada uno.

import tumbado from '../images/tumbado.png';
import fundadores from '../images/Sentado.png';
import grafitero from '../images/characters/grafitero-spray.png';
import vigia from '../images/characters/sentado-borde-blanco.png';
import portero from '../images/characters/sentado-borde-rojo.png';
import curioso from '../images/characters/asomado-borde.png';
import productor from '../images/characters/auriculares-sentado.png';
import freeze from '../images/characters/breakdance-freeze.png';
import colgao from '../images/characters/colgado-borde.png';
import paparazzi from '../images/characters/fotografo-agachado.png';
import dormilon from '../images/characters/dormido-esperando.png';
import recadero from '../images/characters/corriendo-bolsa.png';
import ollie from '../images/characters/skater-ollie.png';
import turista from '../images/characters/perdido-mapa.png';
import paquetes from '../images/characters/abrazando-paquete.png';
import rocky from '../images/characters/perro-rocky.png';

export const CREW = [
    {
        id: 'tumbao',
        numero: '01',
        nombre: 'El Tumbao',
        rol: 'Fundador horizontal',
        img: tumbado,
        rareza: 'ORIGINAL',
        stats: [
            { label: 'Siesta', valor: 5 },
            { label: 'Prisa', valor: 1 },
            { label: 'Estilo', valor: 4 },
        ],
        frase: 'Ahora subo, tranqui.',
        vistoEn: { label: 'Los Drops', to: '/menudrop' },
    },
    {
        id: 'fundadores',
        numero: '00',
        nombre: 'Los Fundadores',
        rol: 'El banco que lo vio todo',
        img: fundadores,
        especial: true,
        rareza: 'FUNDADORES',
        stats: [],
        frase: 'Desde el banco lo vimos todo.',
        vistoEn: { label: 'El footer, siempre', to: '/' },
    },
    {
        id: 'spray',
        numero: '02',
        nombre: 'El Spray',
        rol: 'Firma oficial de la casa',
        img: grafitero,
        stats: [
            { label: 'Pulso', valor: 5 },
            { label: 'Sigilo', valor: 3 },
            { label: 'Tinta', valor: 5 },
        ],
        frase: 'La línea roja la pinté yo.',
        vistoEn: { label: 'La Tienda', to: '/' },
    },
    {
        id: 'vigia',
        numero: '03',
        nombre: 'El Vigía',
        rol: 'Seguridad del género',
        img: vigia,
        stats: [
            { label: 'Paciencia', valor: 5 },
            { label: 'Vista', valor: 4 },
            { label: 'Charla', valor: 2 },
        ],
        frase: 'De este marco no pasa nadie.',
        vistoEn: { label: 'Las fichas de producto', to: '/product/15' },
    },
    {
        id: 'portero',
        numero: '04',
        nombre: 'El Portero',
        rol: 'Recepción de Rocky IA',
        img: portero,
        stats: [
            { label: 'Flow', valor: 4 },
            { label: 'Amabilidad', valor: 4 },
            { label: 'Descanso', valor: 5 },
        ],
        frase: 'Pregunta, que el bot no muerde.',
        vistoEn: { label: 'El chat', to: '/rockyIA' },
    },
    {
        id: 'curioso',
        numero: '05',
        nombre: 'El Curioso',
        rol: 'Auditor de carritos',
        img: curioso,
        stats: [
            { label: 'Cotilleo', valor: 5 },
            { label: 'Discreción', valor: 1 },
            { label: 'Agarre', valor: 4 },
        ],
        frase: '¿Qué llevas ahí?',
        vistoEn: { label: 'El carrito', to: '/cart' },
    },
    {
        id: 'productor',
        numero: '06',
        nombre: 'El Productor',
        rol: 'Beats de La Colmena',
        img: productor,
        stats: [
            { label: 'Oído', valor: 5 },
            { label: 'BPM', valor: 4 },
            { label: 'Cabezón', valor: 5 },
        ],
        frase: 'Sube el bombo, baja el drama.',
        vistoEn: { label: 'La Colmena', to: '/estudio' },
    },
    {
        id: 'freeze',
        numero: '07',
        nombre: 'El Freeze',
        rol: 'Baile parado en el tiempo',
        img: freeze,
        stats: [
            { label: 'Equilibrio', valor: 5 },
            { label: 'Vértigo', valor: 1 },
            { label: 'Swagger', valor: 5 },
        ],
        frase: 'El suelo y yo tenemos un trato.',
        vistoEn: { label: 'La Colmena', to: '/estudio' },
    },
    {
        id: 'colgao',
        numero: '08',
        nombre: 'El Colgao',
        rol: 'Optimista profesional',
        img: colgao,
        stats: [
            { label: 'Agarre', valor: 5 },
            { label: 'Sensatez', valor: 1 },
            { label: 'Alegría', valor: 5 },
        ],
        frase: 'Colgado sí, pero del beat.',
        vistoEn: { label: 'La Colmena', to: '/estudio' },
    },
    {
        id: 'paparazzi',
        numero: '09',
        nombre: 'El Paparazzi',
        rol: 'Documentalista del barrio',
        img: paparazzi,
        stats: [
            { label: 'Enfoque', valor: 5 },
            { label: 'Flash', valor: 3 },
            { label: 'Rodillas', valor: 2 },
        ],
        frase: 'Di patata… o no digas nada.',
        vistoEn: { label: 'El muro de La Banda', to: '/' },
    },
    {
        id: 'dormilon',
        numero: '10',
        nombre: 'El Dormilón',
        rol: 'Guardia del ticket',
        img: dormilon,
        stats: [
            { label: 'Sueño', valor: 5 },
            { label: 'Puntualidad', valor: 1 },
            { label: 'Fe', valor: 5 },
        ],
        frase: 'Despiértame cuando abra el pago.',
        vistoEn: { label: 'El carrito', to: '/cart' },
    },
    {
        id: 'recadero',
        numero: '11',
        nombre: 'El Recadero',
        rol: 'Última unidad en fuga',
        img: recadero,
        stats: [
            { label: 'Velocidad', valor: 5 },
            { label: 'Frenos', valor: 1 },
            { label: 'Cardio', valor: 5 },
        ],
        frase: 'Si me ves, ya es tarde.',
        vistoEn: { label: 'Las categorías vacías', to: '/products/agotado' },
    },
    {
        id: 'ollie',
        numero: '12',
        nombre: 'El Ollie',
        rol: 'Aéreos y porrazos',
        img: ollie,
        stats: [
            { label: 'Aire', valor: 5 },
            { label: 'Rodilleras', valor: 2 },
            { label: 'Valor', valor: 5 },
        ],
        frase: 'Aterrizar es de cobardes.',
        vistoEn: { label: 'Los Drops', to: '/menudrop' },
    },
    {
        id: 'turista',
        numero: '13',
        nombre: 'El Turista',
        rol: 'Orientación dudosa',
        img: turista,
        stats: [
            { label: 'Orientación', valor: 1 },
            { label: 'Optimismo', valor: 5 },
            { label: 'Doblar mapas', valor: 2 },
        ],
        frase: 'El mapa está bien, el mundo no.',
        vistoEn: { label: 'El 404', to: '/te-has-perdido' },
    },
    {
        id: 'paquetes',
        numero: '14',
        nombre: 'El Paquetes',
        rol: 'Logística con cariño',
        img: paquetes,
        rareza: 'NUEVO FICHAJE',
        stats: [
            { label: 'Fuerza', valor: 4 },
            { label: 'Sudor', valor: 5 },
            { label: 'Cuidado', valor: 5 },
        ],
        frase: 'Llega. Siempre llega.',
        vistoEn: { label: 'Próximamente, en tu portal', to: '/cart' },
    },
    {
        id: 'rocky',
        numero: '15',
        nombre: 'Rocky',
        rol: 'El jefe',
        img: rocky,
        rareza: 'LEGENDARIA',
        stats: [
            { label: 'Lealtad', valor: 5 },
            { label: 'Olfato pa drops', valor: 5 },
            { label: 'Mordisco', valor: 1 },
        ],
        frase: 'Guau.',
        vistoEn: { label: 'El 404, guiando a gente', to: '/te-has-perdido' },
    },
];

// Cromos que faltan por conseguir
export const POR_FICHAR = [
    {
        id: 'rapero',
        nombre: 'El Rapero',
        nota: 'Grabando en La Colmena. Cromo al caer.',
    },
    {
        id: 'abeja',
        nombre: 'La Abeja',
        nota: 'Polinizando el estudio. Se la espera.',
    },
    {
        id: 'tu',
        nombre: '¿Tú?',
        nota: 'La crew siempre ficha. Escríbenos al insta.',
        enlace: 'https://www.instagram.com/rocky035/',
    },
];
