// Fixture de testing: DELETE cae fuera de {GET,HEAD,OPTIONS,POST}, por lo
// que un bloqueo client-side correcto nunca debería dejar que este request
// llegue hasta acá. Si el middleware lo loguea, el bloqueo falló.
export function DELETE() {
  return Response.json({ deleted: false, note: 'reached server — should have been blocked client-side' })
}
