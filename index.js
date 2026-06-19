const express = require('express')
const cors    = require('cors')

const app = express()
app.use(express.json())
app.use(cors())

const PLISIO_KEY = process.env.PLISIO_KEY
const SERVER_URL = process.env.SERVER_URL

// ── Создать инвойс ──────────────────────────────────────────
app.post('/api/payment/create', async (req, res) => {
  const { amount, planName, orderId, userId } = req.body
  if (!amount || !planName || !orderId || !userId)
    return res.status(400).json({ error: 'missing fields' })

  const params = new URLSearchParams({
    api_key:         PLISIO_KEY,
    order_name:      planName,
    order_number:    orderId,
    order_total_usd: String(amount),
    currency:        'USDTTRC20',
    success_url:     'opcai://payment-success',
    fail_url:        'opcai://payment-fail',
    callback_url:    SERVER_URL + '/api/payment/webhook'
  })

  try {
    const r    = await fetch('https://plisio.net/api/v1/invoices/new?' + params)
    const data = await r.json()

    if (data.status !== 'success')
      return res.status(400).json({ error: data.message || 'Plisio error' })

    console.log('Invoice created:', data.data.txn_id, 'for user:', userId)
    return res.json({
      invoice_url: data.data.invoice_url,
      txn_id:      data.data.txn_id
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

// ── Webhook от Plisio ───────────────────────────────────────
app.post('/api/payment/webhook', async (req, res) => {
  const { status, order_number } = req.body
  console.log('Webhook received:', status, order_number)
  // Здесь можно добавить запись в Firebase если нужно
  return res.json({ ok: true })
})

// Health check
app.get('/', (req, res) => res.send('OPC Backend OK'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('Server running on port', PORT))
