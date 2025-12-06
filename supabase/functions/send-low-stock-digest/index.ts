// Send Low Stock Digest Edge Function
// Sends batched low stock alerts as a single digest email

import { createClient } from 'npm:@supabase/supabase-js'

type Payload = {
    organization_id: string
}

type DigestItem = {
    queue_id: string
    alert_id: string
    item_id: string
    item_name: string
    item_sku: string | null
    item_unit: string
    location_id: string
    location_name: string
    storage_space_id: string | null
    storage_space_name: string | null
    urgency_level: 'low' | 'critical' | 'out_of_stock'
    current_quantity: number
    previous_quantity: number | null
    min_quantity: number
    quantity_change: number
    queued_at: string
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

    const { organization_id } = payload || {}

    if (!organization_id) {
        return new Response('Missing organization_id', { status: 400 })
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

    // Fetch pending digest items using the helper function
    const { data: digestItems, error: digestError } = await supabase
        .rpc('get_pending_digest_items', { p_organization_id: organization_id })

    if (digestError) {
        console.error('Digest items fetch error', digestError)
        return new Response('Failed to fetch digest items', { status: 500 })
    }

    if (!digestItems || digestItems.length === 0) {
        return new Response('No pending items for digest', { status: 200 })
    }

    const items = digestItems as DigestItem[]

    // Get organization name
    const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organization_id)
        .single()

    const orgName = org?.name || 'Your Organization'

    // Group items by location
    const groupedByLocation = items.reduce((acc, item) => {
        const key = item.location_id
        if (!acc[key]) {
            acc[key] = {
                location_name: item.location_name,
                items: [],
            }
        }
        acc[key].items.push(item)
        return acc
    }, {} as Record<string, { location_name: string; items: DigestItem[] }>)

    // Count urgency levels
    const criticalCount = items.filter(
        (i) => i.urgency_level === 'critical' || i.urgency_level === 'out_of_stock'
    ).length
    const lowCount = items.filter((i) => i.urgency_level === 'low').length

    const digestDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    const baseUrl = 'https://lazadessert.cafe'
    const viewAllUrl = `${baseUrl}/admin/inventory?filter=low_stock`
    const notificationSettingsUrl = `${baseUrl}/admin/settings/notifications`

    // Build item rows HTML
    const buildItemRow = (item: DigestItem) => {
        const urgencyInfo = {
            low: { emoji: '⚠️', color: '#f59e0b', bgColor: '#fffbeb' },
            critical: { emoji: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
            out_of_stock: { emoji: '🚨', color: '#dc2626', bgColor: '#fef2f2' },
        }[item.urgency_level]

        const changeText =
            item.quantity_change > 0
                ? `-${item.quantity_change}`
                : item.quantity_change < 0
                    ? `+${Math.abs(item.quantity_change)}`
                    : '0'

        const changeColor =
            item.quantity_change > 0 ? '#dc2626' : item.quantity_change < 0 ? '#16a34a' : '#6b7280'

        return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${urgencyInfo.bgColor};border-radius:8px;padding:15px;margin-bottom:10px;border-left:4px solid ${urgencyInfo.color}">
        <tbody>
          <tr>
            <td style="vertical-align:top;width:60%">
              <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:0 0 5px">
                ${urgencyInfo.emoji} ${item.item_name}
              </p>
              <p style="font-size:13px;color:#6b7280;margin:0">
                ${item.storage_space_name ? `${item.storage_space_name}` : 'Main Storage'}
                ${item.item_sku ? ` • SKU: ${item.item_sku}` : ''}
              </p>
            </td>
            <td style="vertical-align:top;text-align:right;width:40%">
              <p style="font-size:14px;color:#1f2937;margin:0 0 3px">
                <strong>${item.current_quantity}</strong> / ${item.min_quantity} ${item.item_unit || ''}
              </p>
              <p style="font-size:13px;color:${changeColor};margin:0">
                Change: ${changeText}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    `
    }

    // Build location sections HTML
    const locationSectionsHtml = Object.entries(groupedByLocation)
        .map(
            ([_locationId, group]) => `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                📍 ${group.location_name}
              </h2>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 15px"/>
              ${group.items.map(buildItemRow).join('')}
            </td>
          </tr>
        </tbody>
      </table>
    `
        )
        .join('')

    const subject = `📦 Low Stock Digest: ${items.length} item${items.length !== 1 ? 's' : ''} need attention`

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
    Low Stock Digest: ${criticalCount} critical, ${lowCount} low stock items need attention at ${orgName}
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
                          <h1 style="color:#ffffff;font-size:24px;font-weight:bold;margin:0 0 10px;text-align:center">📦 Low Stock Digest</h1>
                          <p style="font-size:16px;line-height:24px;color:#e0e7ff;margin:0;text-align:center">
                            ${items.length} item${items.length !== 1 ? 's' : ''} need your attention
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
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:8px;padding:20px;margin-bottom:30px;border:1px solid #e5e7eb">
                            <tbody>
                              <tr>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:32px;font-weight:bold;color:#dc2626;margin:0 0 5px">${criticalCount}</p>
                                  <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px">Critical</p>
                                </td>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:32px;font-weight:bold;color:#f59e0b;margin:0 0 5px">${lowCount}</p>
                                  <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px">Low Stock</p>
                                </td>
                                <td style="text-align:center;padding:10px">
                                  <p style="font-size:32px;font-weight:bold;color:#1e40af;margin:0 0 5px">${items.length}</p>
                                  <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px">Total Items</p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <!-- Grouped Items by Location -->
                          ${locationSectionsHtml}
                          
                          <!-- Action Button -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:30px 0;text-align:center">
                            <tbody>
                              <tr>
                                <td>
                                  <a href="${viewAllUrl}" style="line-height:100%;text-decoration:none;display:inline-block;background-color:#1e40af;border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;text-align:center;padding:12px 24px" target="_blank">
                                    View All Alerts in App
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
                            This digest was generated on ${digestDate} for ${orgName}.
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

    // Mark items as processed if sent successfully
    if (sendStatus === 'sent') {
        const queueIds = items.map((i) => i.queue_id)
        await supabase.rpc('mark_digest_items_processed', {
            p_organization_id: organization_id,
            p_queue_ids: queueIds,
        })
    }

    // Log delivery status
    const firstRecipient = recipients[0]
    await supabase.from('email_delivery_logs').insert({
        organization_id,
        email_type: 'low_stock_digest',
        recipient_email: firstRecipient,
        subject,
        status: sendStatus,
        error_message: errorMessage,
        sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
        metadata: {
            items_count: items.length,
            critical_count: criticalCount,
            low_count: lowCount,
            locations: Object.keys(groupedByLocation).length,
            recipients,
            item_ids: items.map((i) => i.item_id),
        },
    })

    return new Response(JSON.stringify({ status: sendStatus, items_processed: items.length }), {
        status: 200,
    })
})

