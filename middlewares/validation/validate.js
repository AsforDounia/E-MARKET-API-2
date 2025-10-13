const validate = (schema) => async (req, res, next) => {
  try {
    // Validate the request body against the schema
    await schema.validate(req.body, { abortEarly: false });
    next();
  } catch (err) {
    // Format validation errors
    const errors = {};
    
    if (err.inner) {
      err.inner.forEach((error) => {
        errors[error.path] = error.message;
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }
};

export { validate }