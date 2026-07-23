import type { Express } from 'express'

/** Binds the app to an ephemeral port so tests never collide with a running dev server. */
export async function serve(app: Express) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address() as { port: number }
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve(null))),
  }
}
