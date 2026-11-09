import net from 'node:net';

// La clave con la que se cuentan los intentos de un cliente. Una IPv4 es ella
// misma; una IPv6 se agrupa por su /64, porque a un cliente le suelen dar el
// /64 entero y podría estrenar dirección en cada intento.

function expandIpv6(ip) {
  const [head, tail] = ip.includes('::') ? ip.split('::') : [ip, null];
  const groups = (part) =>
    part ? part.split(':').flatMap((group) => (group.includes('.') ? ['0', '0'] : [group])) : [];
  const left = groups(head);
  if (tail === null) return left;
  const right = groups(tail);
  return [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
}

export function clientKey(ip) {
  if (typeof ip !== 'string' || !ip) return 'unknown';
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!net.isIPv6(ip)) return ip;
  const prefix = expandIpv6(ip)
    .slice(0, 4)
    .map((group) => group.toLowerCase().padStart(4, '0'))
    .join(':');
  return `${prefix}::/64`;
}
