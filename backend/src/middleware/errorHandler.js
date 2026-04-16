const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Enregistrement dupliqué' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Ressource introuvable' });
  }
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Erreur serveur interne',
  });
};

module.exports = { errorHandler };
