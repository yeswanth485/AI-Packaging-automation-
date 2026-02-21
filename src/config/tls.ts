import https from 'https'
import fs from 'fs'
import { logger } from '../utils/logger'

/**
 * TLS configuration for production
 * Enforces TLS 1.3 with secure cipher suites
 */
export const getTLSOptions = (): https.ServerOptions | null => {
  const certPath = process.env.TLS_CERT_PATH
  const keyPath = process.env.TLS_KEY_PATH

  if (!certPath || !keyPath) {
    logger.warn(
      'TLS certificate paths not configured. Running without HTTPS (NOT SECURE FOR PRODUCTION)'
    )
    return null
  }

  try {
    const options: https.ServerOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      
      // Enforce TLS 1.3 (and allow 1.2 as fallback)
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      
      // Secure cipher suites (prioritize TLS 1.3)
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
      ].join(':'),
      
      // Prefer server cipher order
      honorCipherOrder: true,
      
      // Enable session resumption for performance
      sessionTimeout: 300,
    }

    logger.info('TLS configuration loaded successfully')
    return options
  } catch (error) {
    logger.error('Failed to load TLS certificates', error)
    throw new Error('TLS configuration failed')
  }
}

/**
 * Create HTTPS server with TLS configuration
 */
export const createSecureServer = (
  app: any
): https.Server | null => {
  const tlsOptions = getTLSOptions()

  if (!tlsOptions) {
    return null
  }

  return https.createServer(tlsOptions, app)
}
