// Fixture de testing: el segmento "/delete" en la URL debería disparar
// url_has_destructive_semantics y bloquear el POST antes de llegar acá.
export async function POST() {
  return Response.json({ deleted: false, note: 'reached server — should have been blocked client-side' })
}
