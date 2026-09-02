import { describe, expect, it, vi } from 'vitest';
import { ValidationError, parse, rules, validateBody, validateQuery } from './validate.mjs';

describe('validation rules', () => {
  it('normalizes strings, integers and booleans and drops unknown fields', () => {
    const schema = {
      name: rules.string({ max: 10 }),
      quantity: rules.integer({ min: 1, max: 20 }),
      consent: rules.boolean(),
      cursor: rules.optional(rules.string({ max: 5 })),
    };

    expect(
      parse(schema, { name: '  Rocky ', quantity: '3', consent: true, price: '0.01', cursor: '' })
    ).toEqual({ name: 'Rocky', quantity: 3, consent: true });
  });

  it('rejects the wrong shape with the message and code of the field', () => {
    const schema = {
      operationId: rules.string({
        min: 8,
        pattern: /^[A-Za-z0-9_-]{8,100}$/,
        message: 'operationId no válido.',
        code: 'INVALID_OPERATION_ID',
      }),
    };

    let caught;
    try {
      parse(schema, { operationId: 'x' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ValidationError);
    expect(caught).toMatchObject({
      status: 400,
      code: 'INVALID_OPERATION_ID',
      message: 'operationId no válido.',
      field: 'operationId',
    });
  });

  it('treats non-object input as empty and requires present fields', () => {
    expect(() => parse({ message: rules.string() }, null)).toThrow(ValidationError);
    expect(() => parse({ message: rules.string() }, ['message'])).toThrow(ValidationError);
    expect(() => parse({ quantity: rules.integer() }, { quantity: '1.5' })).toThrow(
      ValidationError
    );
    expect(() => parse({ consent: rules.boolean() }, { consent: 'true' })).toThrow(ValidationError);
    expect(parse({ quantity: rules.optional(rules.integer()) }, {})).toEqual({});
  });
});

describe('validation middleware', () => {
  it('replaces the body and the query with their normalized versions', () => {
    const body = validateBody({ message: rules.string({ max: 5 }) });
    const query = validateQuery({ first: rules.optional(rules.integer({ min: 1, max: 50 })) });
    const req = { body: { message: ' hola ', extra: 1 }, query: { first: '10', after: 'x' } };
    const next = vi.fn();

    body(req, {}, next);
    query(req, {}, next);

    expect(req.body).toEqual({ message: 'hola' });
    expect(req.query).toEqual({ first: 10 });
    expect(next).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a ValidationError to the error middleware', () => {
    const next = vi.fn();

    validateBody({ message: rules.string() })({ body: {} }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});
