
const logger = (req, res, next) => {
  const method = req.method;
  const url = req.url;
  const date = new Date().toISOString();
  
  console.log(`[${date}] ${method} ${url}`);

  next();
};

export default logger;