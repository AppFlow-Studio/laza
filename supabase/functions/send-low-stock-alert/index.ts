// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from 'npm:@supabase/supabase-js'

type Payload = {
  alert_id: string
  organization_id: string
  item_id: string
  location_id: string
  storage_space_id: string | null
  urgency_level: 'low' | 'critical' | 'out_of_stock'
  current_quantity: number
  previous_quantity: number
  min_quantity: number
}

const RESEND_API_URL = 'https://api.resend.com/emails'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch (_err) {
    return new Response('Invalid JSON', { status: 400 })
  }

  const {
    alert_id,
    organization_id,
    item_id,
    location_id,
    storage_space_id,
    urgency_level,
    current_quantity,
    previous_quantity,
    min_quantity,
  } = payload || {}

  if (!alert_id || !organization_id || !item_id || !location_id || !urgency_level) {
    return new Response('Missing required fields', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch notification preferences
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', organization_id)
    .single()

  if (prefsError || !prefs) {
    console.error('Notification prefs error', prefsError)
    return new Response('Notification preferences not found', { status: 404 })
  }

  if (!prefs.notifications_enabled || !prefs.low_stock_alerts_enabled) {
    return new Response('Notifications disabled', { status: 200 })
  }

  // Build recipients
  const recipients = [
    prefs.primary_email,
    ...(Array.isArray(prefs.secondary_emails) ? prefs.secondary_emails : []),
  ].filter(Boolean) as string[]

  if (recipients.length === 0) {
    return new Response('No recipients configured', { status: 200 })
  }

  // Fetch alert context
  const { data: alert, error: alertError } = await supabase
    .from('alerts')
    .select(
      `
        id,
        triggered_at,
        item_id,
        location_id,
        storage_space_id,
        items (name, sku),
        locations (name),
        storage_spaces (name)
      `
    )
    .eq('id', alert_id)
    .single()

  if (alertError || !alert) {
    console.error('Alert fetch error', alertError)
    return new Response('Alert not found', { status: 404 })
  }

  const itemName = alert.items?.name ?? 'Item'
  const locationName = alert.locations?.name ?? 'Location'
  const storageName = alert.storage_spaces?.name ?? ''

  const urgencyLabel =
    urgency_level === 'critical'
      ? 'Critical Stock'
      : urgency_level === 'out_of_stock'
        ? 'Out of Stock'
        : 'Low Stock'

  const urgencyEmoji =
    urgency_level === 'critical'
      ? '🔴'
      : urgency_level === 'out_of_stock'
        ? '🚨'
        : '⚠️'

  const urgencyColor =
    urgency_level === 'critical'
      ? '#dc2626'
      : urgency_level === 'out_of_stock'
        ? '#7f1d1d'
        : '#f59e0b'

  const urgencyBgColor =
    urgency_level === 'critical'
      ? '#fef2f2'
      : urgency_level === 'out_of_stock'
        ? '#fef2f2'
        : '#fffbeb'

  // Calculate quantity change
  const quantityChange = (previous_quantity ?? current_quantity) - current_quantity
  const changeText = quantityChange > 0 ? `-${quantityChange}` : quantityChange < 0 ? `+${Math.abs(quantityChange)}` : '0'

  const subject = `${urgencyEmoji} ${urgencyLabel}: ${itemName} at ${locationName}`

  const triggeredDate = new Date(alert.triggered_at).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 40px; text-align: center;">
              <img src="https://lazadessert.cafe/lazabluelogo.png" alt="Laza" style="height: 50px; margin-bottom: 16px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Inventory Alert</h1>
            </td>
          </tr>
          
          <!-- Urgency Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: ${urgencyBgColor}; border-left: 4px solid ${urgencyColor}; padding: 16px 20px; border-radius: 8px;">
                    <span style="font-size: 28px; vertical-align: middle;">${urgencyEmoji}</span>
                    <span style="color: ${urgencyColor}; font-size: 18px; font-weight: 700; margin-left: 12px; vertical-align: middle;">${urgencyLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Item Details Card -->
          <tr>
            <td style="padding: 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 4px 0; color: #0f172a; font-size: 20px; font-weight: 600;">${itemName}</h2>
                    ${alert.items?.sku ? `<p style="margin: 0; color: #64748b; font-size: 14px;">SKU: ${alert.items.sku}</p>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 20px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 14px;">📍 Location</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 500;">${locationName}</span>
                        </td>
                      </tr>
                      ${storageName ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 14px;">🗄️ Storage Space</span><br>
                          <span style="color: #0f172a; font-size: 16px; font-weight: 500;">${storageName}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Quantity Stats -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Current Quantity -->
                  <td width="33%" style="text-align: center; padding: 16px; background-color: ${current_quantity <= 0 ? '#fef2f2' : current_quantity <= min_quantity ? '#fffbeb' : '#f0fdf4'}; border-radius: 12px;">
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Current</p>
                    <p style="margin: 0; color: ${current_quantity <= 0 ? '#dc2626' : current_quantity <= min_quantity ? '#d97706' : '#16a34a'}; font-size: 28px; font-weight: 700;">${current_quantity}</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Min Threshold -->
                  <td width="33%" style="text-align: center; padding: 16px; background-color: #f1f5f9; border-radius: 12px;">
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Threshold</p>
                    <p style="margin: 0; color: #475569; font-size: 28px; font-weight: 700;">${min_quantity}</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Change -->
                  <td width="33%" style="text-align: center; padding: 16px; background-color: #f1f5f9; border-radius: 12px;">
                    <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Change</p>
                    <p style="margin: 0; color: ${quantityChange > 0 ? '#dc2626' : '#16a34a'}; font-size: 28px; font-weight: 700;">${changeText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Action Button -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <a href="https://laza.app/admin/inventory" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                View Inventory →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0 0 4px 0;">Alert triggered: ${triggeredDate}</p>
                    <p style="margin: 0;">Alert ID: ${alert_id}</p>
                  </td>
                  <td style="text-align: right;">
                    <img src="https://lazadessert.cafe/lazabluelogo.png" alt="Laza" style="height: 24px; opacity: 0.5;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Unsubscribe Link -->
        <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
          You're receiving this because you have low stock alerts enabled.<br>
          <a href="https://laza.app/admin/settings/notifications" style="color: #3b82f6; text-decoration: underline;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = 'support@lazadessert.cafe'

  let sendStatus: 'sent' | 'failed' | 'pending' = 'pending'
  let errorMessage: string | null = null

  if (resendKey) {
    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject,
          html,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Resend send error', text)
        sendStatus = 'failed'
        errorMessage = text
      } else {
        sendStatus = 'sent'
      }
    } catch (err) {
      console.error('Resend exception', err)
      sendStatus = 'failed'
      errorMessage = err instanceof Error ? err.message : 'Unknown error'
    }
  } else {
    // If no Resend key, skip sending but do not fail the trigger
    sendStatus = 'pending'
    errorMessage = 'RESEND_API_KEY not configured'
  }

  // Log delivery status (one log per call; if multiple recipients, we log first)
  const firstRecipient = recipients[0]
  await supabase.from('email_delivery_logs').insert({
    organization_id,
    email_type: 'low_stock_alert',
    recipient_email: firstRecipient,
    subject,
    status: sendStatus,
    error_message: errorMessage,
    sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    metadata: {
      alert_id,
      item_id,
      location_id,
      storage_space_id,
      urgency_level,
      current_quantity,
      previous_quantity,
      min_quantity,
      quantity_change: quantityChange,
      recipients,
    },
  })

  return new Response(JSON.stringify({ status: sendStatus }), { status: 200 })
})


