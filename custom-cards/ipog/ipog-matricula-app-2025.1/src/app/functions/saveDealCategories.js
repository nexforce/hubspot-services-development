// Kept as a compatibility component for older card bundles. Category selection
// is now sourced from categorias_aprovadas and is not persisted by this function.
exports.main = async () => ({
  status: "SUCCESS",
  response: { changed: false, deprecated: true },
});
