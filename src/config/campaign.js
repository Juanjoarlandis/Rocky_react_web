// El drop en curso vive en shared/ (lo lee también el servidor); aquí sólo
// se reexporta para no tocar a quien ya lo importa.
export { CURRENT_DROP } from '../../shared/campaign.mjs';
