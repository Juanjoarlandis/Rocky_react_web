// Convierte el precio del catálogo ("25", "25.99", "$25", "??") a número o null.
export function parsePrice(price) {
    if (typeof price === 'number') return price;
    if (typeof price !== 'string') return null;
    const match = price.replace(',', '.').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
}

export function formatPrice(price) {
    const money = price && typeof price === 'object'
        ? { value: Number(price.amount), currency: price.currencyCode }
        : { value: parsePrice(price), currency: 'EUR' };

    if (!Number.isFinite(money.value) || !/^[A-Z]{3}$/.test(money.currency || '')) {
        return null;
    }

    try {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: money.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(money.value);
    } catch {
        return null;
    }
}
