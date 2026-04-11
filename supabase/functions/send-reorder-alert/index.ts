// Send Reorder Alert Edge Function
// Calls get_reorder_alerts() RPC and emails a predictive reorder summary
// to the super admin. Can be triggered daily via cron or manually.

import { createClient } from 'npm:@supabase/supabase-js'

type Payload = {
  organization_id: string
  lead_time_days?: number
  buffer_days?: number
}

type ReorderRow = {
  item_id: number
  item_name: string
  item_sku: string | null
  avg_weekly_units: number
  current_warehouse_stock: number
  weeks_remaining: number | null
  urgency: 'critical' | 'warning' | 'watch'
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
    organization_id,
    lead_time_days = 45,
    buffer_days = 14,
  } = payload || {}

  if (!organization_id) {
    return new Response('Missing organization_id', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch org-wide notification preferences (super admin email)
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', organization_id)
    .is('location_id', null)
    .maybeSingle()

  if (prefsError || !prefs) {
    console.error('Notification prefs error', prefsError)
    return new Response('Notification preferences not found', { status: 404 })
  }

  if (!prefs.notifications_enabled) {
    return new Response('Notifications disabled', { status: 200 })
  }

  const recipients = [
    prefs.primary_email,
    ...(Array.isArray(prefs.secondary_emails) ? prefs.secondary_emails : []),
  ].filter(Boolean) as string[]

  if (recipients.length === 0) {
    return new Response('No recipients configured', { status: 200 })
  }

  // Call the reorder alerts RPC
  const { data: alerts, error: alertsError } = await supabase.rpc(
    'get_reorder_alerts',
    {
      p_organization_id: organization_id,
      p_lead_time_days: lead_time_days,
      p_buffer_days: buffer_days,
    },
  )

  if (alertsError) {
    console.error('get_reorder_alerts error', alertsError)
    return new Response('Failed to fetch reorder alerts', { status: 500 })
  }

  const items = (alerts ?? []) as ReorderRow[]

  if (items.length === 0) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 })
  }

  // Get organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organization_id)
    .single()

  const orgName = org?.name || 'Your Organization'

  // Count by urgency
  const criticalCount = items.filter((i) => i.urgency === 'critical').length
  const warningCount = items.filter((i) => i.urgency === 'warning').length
  const watchCount = items.filter((i) => i.urgency === 'watch').length

  // Get timezone from preferences
  const timezone = prefs?.timezone || 'America/New_York'

  const formatInTimezone = (
    dateString: string,
    options: Intl.DateTimeFormatOptions = {},
  ) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...options,
    }).format(date)
  }

  const generatedDate = formatInTimezone(new Date().toISOString(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const baseUrl = 'https://lazadessert.cafe'
  const analyticsUrl = `${baseUrl}/super-admin/warehouse/analytics`
  const notificationSettingsUrl = `${baseUrl}/super-admin/settings/notifications`

  // Build urgency helpers
  const urgencyConfig = {
    critical: { emoji: '🚨', label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
    warning: { emoji: '⚠️', label: 'Warning', color: '#f59e0b', bg: '#fffbeb' },
    watch: { emoji: '👁', label: 'Watch', color: '#3b82f6', bg: '#eff6ff' },
  }

  // Build item rows HTML
  const buildItemRow = (item: ReorderRow) => {
    const cfg = urgencyConfig[item.urgency]
    const weeksText =
      item.weeks_remaining !== null
        ? `${item.weeks_remaining.toFixed(1)} weeks`
        : 'N/A'
    const actionText =
      item.urgency === 'critical'
        ? 'Place order immediately'
        : item.urgency === 'warning'
          ? 'Consider placing an overseas order'
          : 'Monitor closely'

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${cfg.bg};border-radius:8px;padding:15px;margin-bottom:12px;border-left:4px solid ${cfg.color}">
        <tbody>
          <tr>
            <td style="vertical-align:top;width:60%">
              <p style="font-size:15px;font-weight:bold;color:#1f2937;margin:0">
                ${cfg.emoji} ${item.item_name}
              </p>
              ${item.item_sku ? `<p style="font-size:11px;color:#6b7280;margin:2px 0 0;font-family:monospace">SKU: ${item.item_sku}</p>` : ''}
            </td>
            <td style="vertical-align:top;text-align:right;width:40%">
              <span style="display:inline-block;background-color:${cfg.color};color:#ffffff;font-size:10px;font-weight:bold;padding:3px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px">${cfg.label}</span>
            </td>
          </tr>
          <tr><td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0"/></td></tr>
          <tr>
            <td colspan="2">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tbody>
                  <tr>
                    <td style="padding:5px 8px;text-align:center">
                      <p style="font-size:10px;color:#6b7280;margin:0 0 3px;text-transform:uppercase;letter-spacing:0.5px">Current Stock</p>
                      <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:0">${item.current_warehouse_stock}</p>
                    </td>
                    <td style="padding:5px 8px;text-align:center">
                      <p style="font-size:10px;color:#6b7280;margin:0 0 3px;text-transform:uppercase;letter-spacing:0.5px">Weekly Burn</p>
                      <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:0">${item.avg_weekly_units.toFixed(1)}/wk</p>
                    </td>
                    <td style="padding:5px 8px;text-align:center">
                      <p style="font-size:10px;color:#6b7280;margin:0 0 3px;text-transform:uppercase;letter-spacing:0.5px">Weeks Left</p>
                      <p style="font-size:16px;font-weight:bold;color:${item.urgency === 'critical' ? '#dc2626' : '#1f2937'};margin:0">${weeksText}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              <p style="font-size:12px;color:#4b5563;margin:10px 0 0;font-style:italic">→ ${actionText}</p>
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  const itemRowsHtml = items.map(buildItemRow).join('')

  const subject = `📦 Reorder Alert: ${items.length} item${items.length !== 1 ? 's' : ''} need attention — ${generatedDate}`

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
    Reorder Alert: ${criticalCount} critical, ${warningCount} warning, ${watchCount} watch items need attention at ${orgName}
  </div>

  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tbody>
      <tr>
        <td style="background-color:#f5f7fa;font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;margin:0 auto;padding:20px">
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:100%;background-color:#ffffff;border-radius:8px;margin:0 auto;padding:0">
            <tbody>
              <tr style="width:100%">
                <td>
                  <!-- Header -->
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#1e40af;border-radius:8px 8px 0 0;padding:30px 20px;text-align:center">
                    <tbody>
                      <tr>
                        <td>
                          <img alt="Laza Dessert Cafe" height="auto" src="https://lazadessert.cafe/lazabluelogo.png" style="display:block;outline:none;border:none;text-decoration:none;margin:0 auto 20px" width="130"/>
                          <h1 style="color:#ffffff;font-size:24px;font-weight:bold;margin:0 0 10px;text-align:center">📦 Predictive Reorder Alert</h1>
                          <p style="font-size:16px;line-height:24px;color:#e0e7ff;margin:0;text-align:center">
                            ${items.length} item${items.length !== 1 ? 's' : ''} may need replenishment soon
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Content -->
                  <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding:30px 20px">
                    <tbody>
                      <tr>
                        <td>
                          <!-- Summary Stats -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e5e7eb">
                            <tbody>
                              <tr>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:28px;font-weight:bold;color:#dc2626;margin:0 0 5px">${criticalCount}</p>
                                  <p style="font-size:11px;color:#dc2626;margin:0;text-transform:uppercase;letter-spacing:0.5px">Critical</p>
                                </td>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:28px;font-weight:bold;color:#f59e0b;margin:0 0 5px">${warningCount}</p>
                                  <p style="font-size:11px;color:#f59e0b;margin:0;text-transform:uppercase;letter-spacing:0.5px">Warning</p>
                                </td>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:28px;font-weight:bold;color:#3b82f6;margin:0 0 5px">${watchCount}</p>
                                  <p style="font-size:11px;color:#3b82f6;margin:0;text-transform:uppercase;letter-spacing:0.5px">Watch</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <h2 style="font-size:16px;font-weight:bold;color:#1f2937;margin:0 0 15px">Items Requiring Action</h2>

                          ${itemRowsHtml}

                          <!-- Lead time context -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:6px;padding:15px;margin-top:20px">
                            <tbody>
                              <tr>
                                <td>
                                  <p style="font-size:12px;color:#4b5563;margin:0;line-height:1.6">
                                    <strong>How this is calculated:</strong> Burn rates are based on the last 90 days of confirmed order data.
                                    Alerts trigger when weeks remaining falls below the reorder threshold of
                                    <strong>${((lead_time_days + buffer_days) / 7).toFixed(1)} weeks</strong>
                                    (${lead_time_days}-day lead time + ${buffer_days}-day buffer).
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <!-- Action Button -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:30px 0;text-align:center">
                            <tbody>
                              <tr>
                                <td>
                                  <a href="${analyticsUrl}" style="line-height:100%;text-decoration:none;display:inline-block;background-color:#1e40af;border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;text-align:center;padding:12px 24px" target="_blank">
                                    View Analytics Dashboard
                                  </a>
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
                          <p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 10px">
                            This predictive alert was generated on ${generatedDate} for ${orgName}.<br/>
                            Predictions are based on the last 90 days of order data.
                          </p>
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
    sendStatus = 'pending'
    errorMessage = 'RESEND_API_KEY not configured'
  }

  // Log delivery status
  const firstRecipient = recipients[0]
  await supabase.from('email_delivery_logs').insert({
    organization_id,
    email_type: 'reorder_alert',
    recipient_email: firstRecipient,
    subject,
    status: sendStatus,
    error_message: errorMessage,
    sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    metadata: {
      items_count: items.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      watch_count: watchCount,
      lead_time_days,
      buffer_days,
      recipients,
      item_ids: items.map((i) => i.item_id),
    },
  })

  return new Response(
    JSON.stringify({ status: sendStatus, items_count: items.length }),
    { status: 200 },
  )
})
