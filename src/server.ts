import { createApp } from './app'
import { env } from './config/env'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`)
})

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`)
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Closed connections, exiting')
    process.exit(0)
  })
  // Force exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
