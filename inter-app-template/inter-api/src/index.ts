import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

// Routes
import authRoutes from './routes/auth.js'
import interventionsRoutes from './routes/interventions.js'
import clientsRoutes from './routes/clients.js'
import devisRoutes from './routes/devis.js'
import facturesRoutes from './routes/factures.js'
import tenantsRoutes from './routes/tenants.js'

// Middleware
import { authMiddleware } from './middleware/auth.js'
import { rateLimiter } from './middleware/rate-limit.js'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  credentials: true,
}))

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'inter-api',
    version: '1.0.0'
  })
})

// Public routes (no auth)
app.route('/api/auth', authRoutes)

// Protected routes (auth required)
app.use('/api/*', authMiddleware)
app.use('/api/*', rateLimiter())

app.route('/api/interventions', interventionsRoutes)
app.route('/api/clients', clientsRoutes)
app.route('/api/devis', devisRoutes)
app.route('/api/factures', facturesRoutes)
app.route('/api/tenants', tenantsRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }, 500)
})

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Inter-API starting on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
