import { HttpError } from '../errors.mjs';

// Validación de entrada sin librerías: un esquema es un objeto campo → regla,
// y una regla es una función (valor, campo) que devuelve el valor normalizado
// o lanza ValidationError (400). Lo que no está en el esquema se descarta.

export class ValidationError extends HttpError {
  constructor(message, { code = 'VALIDATION_ERROR', field = null } = {}) {
    super(message, { status: 400, code });
    this.field = field;
  }
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function reject(field, { message, code }) {
  return new ValidationError(message || `El campo «${field}» no es válido.`, {
    code: code || 'VALIDATION_ERROR',
    field,
  });
}

export const rules = {
  string({ min = 1, max = 500, pattern = null, trim = true, message, code } = {}) {
    return (value, field) => {
      if (typeof value !== 'string') throw reject(field, { message, code });
      const text = trim ? value.trim() : value;
      if (text.length < min || text.length > max) throw reject(field, { message, code });
      if (pattern && !pattern.test(text)) throw reject(field, { message, code });
      return text;
    };
  },

  integer({ min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, message, code } = {}) {
    return (value, field) => {
      const parsed =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && /^-?\d+$/.test(value.trim())
            ? Number.parseInt(value, 10)
            : Number.NaN;
      if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw reject(field, { message, code });
      }
      return parsed;
    };
  },

  boolean({ message, code } = {}) {
    return (value, field) => {
      if (typeof value !== 'boolean') throw reject(field, { message, code });
      return value;
    };
  },

  // Campo opcional: ausente, nulo o vacío se convierte en undefined y no se
  // valida; presente, pasa por la regla interior.
  optional(rule) {
    return (value, field) => (isMissing(value) ? undefined : rule(value, field));
  },
};

export function parse(schema, input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const output = {};
  for (const [field, rule] of Object.entries(schema)) {
    const value = rule(source[field], field);
    if (value !== undefined) output[field] = value;
  }
  return output;
}

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = parse(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = parse(schema, req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}
