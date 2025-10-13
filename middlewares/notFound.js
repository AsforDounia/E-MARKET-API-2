
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée : ${req.method} ${req.originalUrl}`,
    error: 'Not Found'
  });
};

export default notFound;