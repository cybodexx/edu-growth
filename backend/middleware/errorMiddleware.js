const errorMiddleware = (err, req, res, next) => {
  console.error("❌ API ERROR:");
  console.error(err.stack || err);

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : Number.isInteger(res.statusCode) &&
          res.statusCode >= 400 &&
          res.statusCode <= 599
        ? res.statusCode
        : 500;

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorMiddleware;