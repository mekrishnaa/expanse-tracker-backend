import webpush from 'web-push'
import { env } from '../config/env'
import { logger } from './logger'

if (env.pushEnabled) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string,
  )
  logger.info('Web Push configured')
} else {
  logger.warn('Web Push disabled: VAPID keys not set')
}

export interface PushTarget {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

/**
 * Sends a push message. Returns false when the subscription is gone (410/404)
 * so the caller can prune it.
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: target.keys,
      },
      JSON.stringify(payload),
    )
    return true
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) return false
    logger.error({ err }, 'Push send failed')
    return true
  }
}

export { webpush }
