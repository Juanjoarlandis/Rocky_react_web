# Tarea

Acotar el catálogo Shopify visible.

# Objetivo

Mostrar ocho productos Shopify como máximo y excluir conceptos editoriales del
modo Shopify, sin cambiar el modo demo.

# Decisiones previas

- Límite aprobado: ocho productos.
- Shopify mantiene la autoridad y el orden de selección.
- No se realizarán escrituras Admin.

# Archivos previstos

- `src/shopify/api.js`
- `src/shopify/useStorefront.js`
- `src/shopify/useStorefront.test.jsx`
- Pruebas cercanas que codifiquen el comportamiento anterior.

# Cambios

1. Añadir una constante legible para el límite y solicitar `first=8`.
2. Usar solamente productos normalizados de Shopify cuando ese modo esté activo.
3. Actualizar las expectativas que exigían superponer previews.
4. Mantener el parámetro local únicamente donde siga teniendo un consumidor real.

# Comandos

```bash
npm run test:run -- src/shopify/useStorefront.test.jsx src/App.storefront.test.jsx
git diff --check
```

# Criterios de aceptación

- La petición de catálogo usa ocho como límite.
- Ningún producto `isPreview` aparece por mezcla local en modo Shopify.
- El modo demo conserva su catálogo.
- No se añaden dependencias.

# Riesgos

- Eliminar parámetros demasiado pronto podría afectar al chat o al modo demo;
  revisar todos los consumidores antes de simplificar.

# Evidencia

Diff acotado y pruebas dirigidas aprobadas.
