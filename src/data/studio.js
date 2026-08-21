// LA COLMENA — datos de la sección de música (el estudio de ASAKO KACO).
//
// Para añadir más temas al radiocasete: copia los audios a public/music/
// (mp3 o m4a) y añade su entrada en TRACKS.

export const ARTIST = {
    name: 'ASAKO KACO',
    studio: 'La Colmena',
    claim: 'El estudio de ASAKO KACO: maquetas, EPs y humo.',
    spotify: 'https://open.spotify.com/intl-es/artist/1c4phGYABjEHSMJxDRub0O',
    spotifyEmbed: 'https://open.spotify.com/embed/artist/1c4phGYABjEHSMJxDRub0O',
    youtube: 'https://www.youtube.com/watch?v=5QXdSQsddZ0&list=OLAK5uy_k0-52j6A-2lMWaciv6KM45zHJ1hFeAHWM',
};

export const TRACKS = [
    {
        title: 'BARRO',
        tag: 'ASAKO KACO · 2026',
        src: '/music/barro.m4a',
        duration: '1:53',
        // Pulso al que cabecean los muñecos mientras suena (golpes por minuto).
        // El tema corre a ~154 BPM medidos sobre el audio, pero en trap la
        // cabeza va a medio tiempo: se apunta el golpe de cabeza, no el tempo.
        bpm: 77,
    },
];

export const EPS = [
    {
        title: 'BARRO',
        year: '2026',
        initials: 'B',
        links: {
            spotify: ARTIST.spotify,
            youtube: ARTIST.youtube,
        },
    },
    {
        title: 'Maquetas de La Colmena',
        year: 'Próximamente',
        initials: 'LC',
        links: {},
    },
];
