const express = require('express')
const cors    = require('cors')
const app     = express()
app.use(express.json())
app.use(cors())

const PLISIO_KEY = process.env.PLISIO_KEY
const SERVER_URL = process.env.SERVER_URL

app.post('/api/payment/create', async (req, res) => {
  const { amount, planName, orderId, userId, currency } = req.body
  if (!amount || !planName || !orderId || !userId)
    return res.status(400).json({ error: 'missing fields' })

  const cryptoCurrency = currency || 'USDTTRC20'

  const params = new URLSearchParams({
    api_key:         PLISIO_KEY,
    order_name:      planName,
    order_number:    orderId,
    amount:          String(amount),
    currency:        'USD',
    source_currency: cryptoCurrency,
    success_url:     'opcai://payment-success',
    fail_url:        'opcai://payment-fail',
    callback_url:    (SERVER_URL || '') + '/api/payment/webhook'
  })

  try {
    const r    = await fetch('https://plisio.net/api/v1/invoices/new?' + params)
    const data = await r.json()
    console.log('Plisio response:', JSON.stringify(data))

    if (data.status !== 'success')
      return res.status(400).json({ error: data.message || 'Plisio error' })

    return res.json({
      invoice_url: data.data.invoice_url,
      txn_id:      data.data.txn_id
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
})

app.post('/api/payment/webhook', async (req, res) => {
  const { status, order_number } = req.body
  console.log('Webhook:', status, order_number)
  return res.json({ ok: true })
})

app.get('/', (req, res) => res.send('OPC Backend OK'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('Server on port', PORT))
