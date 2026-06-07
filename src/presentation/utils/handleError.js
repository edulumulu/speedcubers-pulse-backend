export function handleError(err, res) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  return res.status(500).json({ error: 'Internal server error' });
}
