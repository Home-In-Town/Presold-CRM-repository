export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    const errors = err.errors?.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
};
