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

  // Build URLs with item and location context
  const baseUrl = 'https://lazadessert.cafe'
  const viewItemUrl = `${baseUrl}/admin`
  // const updateInventoryUrl = `${viewItemUrl}&action=update`
  const notificationSettingsUrl = `${baseUrl}/admin/settings/notifications`

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <link rel="preload" as="image" href="https://lazadessert.cafe/lazabluelogo.png"/>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/>
  <meta name="x-apple-disable-message-reformatting"/>
</head>
<body style="background-color:#f5f7fa">
  <!-- Preview Text -->
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
    ${urgencyLabel}: ${itemName} at ${locationName}${storageName ? ` (${storageName})` : ''} - Current: ${current_quantity}, Threshold: ${min_quantity}
  </div>
  
  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tbody>
      <tr>
        <td style="background-color:#f5f7fa;font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;margin:0 auto;padding:20px">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:8px;margin:0 auto;padding:0">
            <tbody>
              <tr style="width:100%">
                <td>
                  <!-- Header -->
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1e40af;border-radius:8px 8px 0 0;padding:30px 20px;text-align:center">
                    <tbody>
                      <tr>
                        <td>
                          <img alt="Laza Dessert Cafe" height="auto" src="https://lazadessert.cafe/lazabluelogo.png" style="display:block;outline:none;border:none;text-decoration:none;margin:0 auto 20px" width="130"/>
                          <h1 style="color:#ffffff;font-size:24px;font-weight:bold;margin:0 0 10px;text-align:center">${urgencyEmoji} ${urgencyLabel}</h1>
                          <p style="font-size:16px;line-height:24px;color:#e0e7ff;margin:0;text-align:center">Action required for ${itemName}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <!-- Content -->
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:30px 20px">
                    <tbody>
                      <tr>
                        <td>
                          <!-- Item Details Card -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:2px solid ${urgencyColor};border-radius:8px;padding:20px;margin-bottom:20px">
                            <tbody>
                              <tr>
                                <td>
                                  <h1 style="font-size:20px;font-weight:bold;margin:0 0 15px;color:#1f2937">${itemName}</h1>
                                  <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 15px">
                                    <strong>Location:</strong> ${locationName}<br/>
                                    ${storageName ? `<strong>Storage:</strong> ${storageName}` : ''}
                                  </p>
                                  
                                  <hr style="width:100%;border:none;border-top:1px solid #e5e7eb;margin:15px 0"/>
                                  
                                  <!-- Quantity Stats -->
                                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                    <tbody style="width:100%">
                                      <tr style="width:100%">
                                        <td style="padding:10px;text-align:center">
                                          <p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 5px;text-transform:uppercase;letter-spacing:0.5px">Current Qty</p>
                                          <p style="font-size:24px;line-height:28px;font-weight:bold;color:${current_quantity <= 0 ? '#dc2626' : current_quantity <= min_quantity ? '#d97706' : '#16a34a'};margin:0">${current_quantity}</p>
                                        </td>
                                        <td style="padding:10px;text-align:center">
                                          <p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 5px;text-transform:uppercase;letter-spacing:0.5px">Threshold</p>
                                          <p style="font-size:24px;line-height:28px;font-weight:bold;color:#1f2937;margin:0">${min_quantity}</p>
                                        </td>
                                        <td style="padding:10px;text-align:center">
                                          <p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 5px;text-transform:uppercase;letter-spacing:0.5px">Change</p>
                                          <p style="font-size:24px;line-height:28px;font-weight:bold;color:${quantityChange > 0 ? '#dc2626' : quantityChange < 0 ? '#16a34a' : '#6b7280'};margin:0">${changeText}</p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <!-- Action Buttons -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:30px 0;text-align:center">
                            <tbody>
                              <tr>
                                <td>
                                  <a href="${viewItemUrl}" style="line-height:100%;text-decoration:none;display:inline-block;background-color:#1e40af;border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;text-align:center;padding:12px 24px;margin:0 10px 10px 0" target="_blank">
                                    View Item in App
                                  </a>
                                
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <!-- Alert Details Footer -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:6px;padding:15px;margin-top:20px">
                            <tbody>
                              <tr>
                                <td>
                                  <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0">
                                    ${alert.items?.sku ? `<strong>SKU:</strong> ${alert.items.sku}<br/>` : ''}
                                    <strong>Previous Qty:</strong> ${previous_quantity ?? 'N/A'}<br/>
                                    <strong>Alert Triggered:</strong> ${triggeredDate}<br/>
                                    <strong>Alert ID:</strong> <span style="font-size:12px;color:#9ca3af">${alert_id}</span>
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <!-- Footer -->
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:20px;text-align:center;border-top:1px solid #e5e7eb">
                    <tbody>
                      <tr>
                        <td>
                          <p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 10px">This is an automated alert from your Laza inventory management system.</p>
                          <p style="font-size:12px;line-height:24px;color:#9ca3af;margin:0">
                            <a href="${notificationSettingsUrl}" style="color:#3b82f6;text-decoration:underline">Manage notification preferences</a>
                          </p>
                          <p style="font-size:12px;line-height:24px;color:#9ca3af;margin:10px 0 0">Laza Dessert Cafe - Inventory Management</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
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


