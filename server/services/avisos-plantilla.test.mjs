import { describe, expect, it } from 'vitest';
import { escapeHtml, renderAvisoDrop } from './avisos-plantilla.mjs';

describe('renderAvisoDrop', () => {
  it('monta asunto, texto y HTML con el producto y el enlace', () => {
    const correo = renderAvisoDrop({
      titulo: '35 RED',
      url: 'https://rocky035.com/product/35-red',
      contacto: 'hola@rocky035.com',
    });
    expect(correo.subject).toBe('Ha caído: 35 RED ya está en ROCKY 035');
    expect(correo.text).toContain('35 RED acaba de caer');
    expect(correo.text).toContain('https://rocky035.com/product/35-red');
    expect(correo.text).toContain('hola@rocky035.com');
    expect(correo.html).toContain('href="https://rocky035.com/product/35-red"');
    expect(correo.html).toContain('35 RED ya está en la tienda');
  });

  it('escapa el HTML del título y del contacto', () => {
    const correo = renderAvisoDrop({
      titulo: '<b>Tee</b> & co',
      url: 'https://rocky035.com/product/tee',
    });
    expect(correo.html).not.toContain('<b>Tee</b>');
    expect(correo.html).toContain('&lt;b&gt;Tee&lt;/b&gt; &amp; co');
    expect(correo.text).toContain('Si no fuiste tú quien se apuntó, ignora este correo.');
  });

  it('rechaza títulos vacíos y enlaces que no sean HTTP(S)', () => {
    expect(() => renderAvisoDrop({ titulo: ' ', url: 'https://rocky035.com' })).toThrow(/nombre/);
    expect(() => renderAvisoDrop({ titulo: 'Tee', url: 'javascript:alert(1)' })).toThrow(/HTTP/);
    expect(() => renderAvisoDrop({ titulo: 'Tee', url: 'no-es-url' })).toThrow(/válida/);
  });

  it('escapeHtml cubre los cinco caracteres', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
    );
  });
});
