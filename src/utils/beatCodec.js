// El códec vive en shared/ para que el servidor valide los beats del ranking
// con las mismas reglas que la mesa. Aquí sólo se reexporta.
export * from '../../shared/beat-codec.mjs';
