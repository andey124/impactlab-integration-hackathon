import { app } from './app.ts'

const port = Number(process.env.PORT ?? 3001)
app.listen(port, '127.0.0.1', () => {
  console.log(`DocuAId backend listening on http://localhost:${port}`)
})
