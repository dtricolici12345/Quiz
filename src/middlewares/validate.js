// src/middlewares/validate.js
export const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!parsed.success) {
    const err = new Error('Validation failed');
    err.name = 'ZodError';
    err.errors = parsed.error.issues;
    return next(err);
  }

  // запишем нормализованные значения обратно
  if (parsed.data.body)   req.body   = parsed.data.body;
  if (parsed.data.params) req.params = parsed.data.params;
  if (parsed.data.query)  req.query  = parsed.data.query;

  return next();
};
