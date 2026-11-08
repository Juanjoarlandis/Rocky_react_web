/* El catálogo cuenta «diseños» en todas partes (portada, categoría, drops y el
   bloque bajo llave), y en singular cuando toca: nada de «1 productos». */
export function designCount(count) {
  return `${count} ${count === 1 ? 'diseño' : 'diseños'}`;
}
