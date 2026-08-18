// Target para browser_intercept_set_rule: responde JSON application/json
// con el valor "original" sin parchear. El log del middleware es la prueba
// de que el servidor siempre vio/emitió este valor, incluso si la página
// terminó mostrando un valor parchado por el interceptor del browser.
export function GET() {
  return Response.json({ verified: false, status: 'pending' })
}
