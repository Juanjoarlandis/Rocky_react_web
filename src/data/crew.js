// LA CREW — el álbum de cromos de la casa.
// Cada cromo: nombre de guerra, oficio, stats (0-5, medidos en dianas),
// y el expediente del reverso con la página donde vive cada uno.

import { INSTAGRAM_URL } from '../config/links';
import tumbado from '../images/optimized/shell/tumbado-800.webp';
import fundadores from '../images/optimized/shell/sentado-860.webp';
import grafitero from '../images/optimized/characters/grafitero-spray-600.webp';
import vigia from '../images/optimized/characters/sentado-borde-blanco-600.webp';
import portero from '../images/optimized/characters/sentado-borde-rojo-600.webp';
import curioso from '../images/optimized/characters/asomado-borde-600.webp';
import productor from '../images/optimized/characters/auriculares-sentado-600.webp';
import freeze from '../images/optimized/characters/breakdance-freeze-600.webp';
import colgao from '../images/optimized/characters/colgado-borde-600.webp';
import paparazzi from '../images/optimized/characters/fotografo-agachado-600.webp';
import dormilon from '../images/optimized/characters/dormido-esperando-600.webp';
import recadero from '../images/optimized/characters/corriendo-bolsa-600.webp';
import ollie from '../images/optimized/characters/skater-ollie-600.webp';
import turista from '../images/optimized/characters/perdido-mapa-600.webp';
import paquetes from '../images/optimized/characters/abrazando-paquete-600.webp';
import rocky from '../images/optimized/characters/perro-rocky-600.webp';
import estrella from '../images/optimized/characters/estrella-apoyado-600.webp';
import dado from '../images/optimized/characters/dado-sentado-600.webp';
import nube from '../images/optimized/characters/nube-paseando-600.webp';
import tele from '../images/optimized/characters/tele-sentado-borde-600.webp';
import lata from '../images/optimized/characters/lata-spray-600.webp';
import luna from '../images/optimized/characters/luna-movil-600.webp';
import diana from '../images/optimized/characters/diana-jefe-600.webp';
import bombilla from '../images/optimized/characters/bombilla-eureka-600.webp';
import cruiser from '../images/optimized/characters/cruiser-patinando-600.webp';

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
    {
        id: 'estrella',
        numero: '16',
        nombre: 'El Estrella',
        rol: 'Portero de la pared',
        img: estrella,
        stats: [
            { label: 'Calma', valor: 5 },
            { label: 'Prisa', valor: 1 },
            { label: 'Hipnosis', valor: 4 },
        ],
        frase: 'Tú tranqui, que yo más.',
        vistoEn: { label: 'El chat, de guardia', to: '/rockyIA' },
    },
    {
        id: 'dado',
        numero: '17',
        nombre: 'El Dado',
        rol: 'La suerte del drop',
        img: dado,
        stats: [
            { label: 'Suerte', valor: 5 },
            { label: 'Cálculo', valor: 1 },
            { label: 'Farol', valor: 4 },
        ],
        frase: 'Va a caer el seis, lo huelo.',
        vistoEn: { label: 'Los Drops', to: '/menudrop' },
    },
    {
        id: 'nube',
        numero: '18',
        nombre: 'El Nube',
        rol: 'Clima propio',
        img: nube,
        stats: [
            { label: 'Paz', valor: 5 },
            { label: 'Prisa', valor: 1 },
            { label: 'Lluvia personal', valor: 3 },
        ],
        frase: 'Yo traigo mi propio clima.',
        vistoEn: { label: 'Las fichas de producto', to: '/product/15' },
    },
    {
        id: 'tele',
        numero: '19',
        nombre: 'El Tele',
        rol: 'Antena de La Colmena',
        img: tele,
        stats: [
            { label: 'Sintonía', valor: 5 },
            { label: 'Zapping', valor: 4 },
            { label: 'Descanso de pantalla', valor: 1 },
        ],
        frase: 'Lo vi antes de que saliera.',
        vistoEn: { label: 'La Colmena', to: '/estudio' },
    },
    {
        id: 'lata',
        numero: '20',
        nombre: 'El Lata',
        rol: 'Pintor de la marquesina',
        img: lata,
        stats: [
            { label: 'Presión', valor: 5 },
            { label: 'Boquilla fina', valor: 4 },
            { label: 'Paciencia', valor: 1 },
        ],
        frase: 'La marquesina la pinté yo.',
        vistoEn: { label: 'La marquesina de abajo', to: '/' },
    },
    {
        id: 'luna',
        numero: '21',
        nombre: 'El Luna',
        rol: 'Turno de noche',
        img: luna,
        stats: [
            { label: 'Trasnoche', valor: 5 },
            { label: 'Batería', valor: 1 },
            { label: 'Scroll', valor: 5 },
        ],
        frase: 'El drop cae de madrugada, fijo.',
        vistoEn: { label: 'La Colmena', to: '/estudio' },
    },
    {
        id: 'diana',
        numero: '22',
        nombre: 'El Diana',
        rol: 'La marca en persona',
        img: diana,
        rareza: 'LA MARCA',
        stats: [
            { label: 'Puntería', valor: 5 },
            { label: 'Presencia', valor: 5 },
            { label: 'Palabras', valor: 1 },
        ],
        frase: 'Se apunta y se acierta.',
        vistoEn: { label: 'La Banda, presentando', to: '/' },
    },
    {
        id: 'bombilla',
        numero: '23',
        nombre: 'El Bombilla',
        rol: 'Departamento de ideas',
        img: bombilla,
        stats: [
            { label: 'Ideas', valor: 5 },
            { label: 'Cable a tierra', valor: 2 },
            { label: 'Voltaje', valor: 4 },
        ],
        frase: '¡Ya sé cuál cae ahora!',
        vistoEn: { label: 'El carrito vacío', to: '/cart' },
    },
    {
        id: 'cruiser',
        numero: '24',
        nombre: 'La Cruiser',
        rol: 'Rueda la ciudad',
        img: cruiser,
        rareza: 'ORIGINAL',
        stats: [
            { label: 'Rodar', valor: 5 },
            { label: 'Prisas', valor: 1 },
            { label: 'Estilo', valor: 5 },
        ],
        frase: 'Sin prisa, que la calle es mía.',
        vistoEn: { label: 'La Tienda, sobre la línea', to: '/' },
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
        enlace: INSTAGRAM_URL,
    },
];
