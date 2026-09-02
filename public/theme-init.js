// Se carga antes que React para aplicar el tema guardado sin un fogonazo de
// color. Es un archivo del mismo origen para cumplir la CSP de producción.
(function applyInitialTheme() {
  try {
    var theme = localStorage.getItem('rocky-theme');
    if (theme !== 'neon' && theme !== 'light') {
      theme =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'neon'
          : 'light';
    }
    if (theme === 'neon') {
      document.documentElement.dataset.theme = 'neon';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#0c0917');
    }
  } catch (error) {
    // Sin localStorage se conserva el modo día definido en el documento.
  }
})();
