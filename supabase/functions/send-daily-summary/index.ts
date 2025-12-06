// Send Daily Summary Edge Function
// Sends comprehensive daily inventory summary email

import { createClient } from 'npm:@supabase/supabase-js'

type Payload = {
  organization_id: string
  date?: string // Optional: date to summarize (defaults to today)
  location_id?: string // Optional: filter to specific location
}

type UpdatedItem = {
  item_id: string
  item_name: string
  previous_quantity: number
  new_quantity: number
  change: number
  updated_by: string
  updated_at: string
}

type LowStockItem = {
  item_id: string
  item_name: string
  current_quantity: number
  threshold: number
  urgency_level: 'low' | 'critical' | 'out_of_stock'
  location_name: string
  location_id: string
  storage_space_name: string | null
  storage_space_id: string | null
}

type EmployeeActivity = {
  user_id: string
  user_name: string
  update_count: number
  items_updated: number
  action_types: string[]
}

type StorageSpaceMatrix = {
  storage_space_id: string
  storage_space_name: string
  temperature_type: string
  quantity: number
  is_stored: boolean
}

type InventoryMatrixItem = {
  item_id: string
  item_name: string
  sku: string | null
  min_quantity: number
  unit_of_measure: string
  location_id: string
  location_name: string
  storage_spaces: StorageSpaceMatrix[]
  total_quantity: number
}

type ComparisonMetrics = {
  todayVsYesterday: {
    inventoryValueChange: number
    itemsUpdatedChange: number
  }
  weekOverWeek: {
    inventoryValueChange: number
    itemsUpdatedChange: number
  }
}

type TrendingItem = {
  item_id: string
  item_name: string
  change: number
  direction: 'up' | 'down' | 'neutral'
  update_frequency: number
  total_change: number
}


type SummaryData = {
  organization_id: string
  organization_name: string
  date: string
  date_range: {
    start: string
    end: string
  }
  summary: {
    updated_items: UpdatedItem[]
    low_stock_items: LowStockItem[]
    employee_activity: EmployeeActivity[]
    storage_utilization: InventoryMatrixItem[]
    comparison_metrics: ComparisonMetrics
    trending_items: TrendingItem[]
    low_stock_count: number
    updated_items_count: number
  }
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

  const { organization_id, date, location_id } = payload || {}

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

  if (!prefs.notifications_enabled || !prefs.daily_summary_enabled) {
    return new Response('Daily summary disabled', { status: 200 })
  }

  // Build recipients
  const recipients = [
    prefs.primary_email,
    ...(Array.isArray(prefs.secondary_emails) ? prefs.secondary_emails : []),
  ].filter(Boolean) as string[]

  if (recipients.length === 0) {
    return new Response('No recipients configured', { status: 200 })
  }

  // Fetch daily summary preferences
  const { data: summaryPrefs } = await supabase
    .from('daily_summary_preferences')
    .select('*')
    .eq('organization_id', organization_id)
    .single()

  // Default preferences if not set
  const includeUpdatedItems = summaryPrefs?.include_updated_items ?? true
  const includeStorageUtilization = summaryPrefs?.include_storage_utilization ?? true
  const includeLowStockItems = summaryPrefs?.include_low_stock_items ?? true
  const includeEmployeeActivity = summaryPrefs?.include_employee_activity ?? true
  const includeComparisonMetrics = summaryPrefs?.include_comparison_metrics ?? true
  const includeTrendingItems = summaryPrefs?.include_trending_items ?? false
  const summaryFormat = summaryPrefs?.summary_format ?? 'detailed'
  const groupByLocation = summaryPrefs?.group_by_location ?? false
  const locationsToInclude = summaryPrefs?.locations_to_include || []
  const showMatrixOnlyWithStock = summaryPrefs?.show_matrix_only_with_stock ?? false

  // Determine date to use
  const summaryDate = date || new Date().toISOString().split('T')[0]

  // Get locations to process
  let locationsToProcess: string[] = []
  if (location_id) {
    locationsToProcess = [location_id]
  } else if (groupByLocation) {
    // Get all locations for organization
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('is_active', true)

    if (locationsToInclude.length > 0) {
      locationsToProcess = locations?.filter(loc => locationsToInclude.includes(loc.id)).map(l => l.id) || []
    } else {
      locationsToProcess = locations?.map(l => l.id) || []
    }
  } else {
    // Single summary for all locations
    locationsToProcess = []
  }

  // If group by location, send separate emails
  if (groupByLocation && locationsToProcess.length > 0) {
    const results = []
    for (const locId of locationsToProcess) {
      const result = await sendSummaryForLocation(
        supabase,
        organization_id,
        locId,
        summaryDate,
        summaryPrefs,
        recipients,
        prefs
      )
      results.push(result)
    }
    return new Response(JSON.stringify({ status: 'sent', locations: results }), { status: 200 })
  }

  // Single summary email
  return await sendSummaryForLocation(
    supabase,
    organization_id,
    location_id || null,
    summaryDate,
    summaryPrefs,
    recipients,
    prefs
  )
})

async function sendSummaryForLocation(
  supabase: any,
  organizationId: string,
  locationId: string | null,
  date: string,
  summaryPrefs: any,
  recipients: string[],
  prefs: any
): Promise<Response> {
  const includeUpdatedItems = summaryPrefs?.include_updated_items ?? true
  const includeStorageUtilization = summaryPrefs?.include_storage_utilization ?? true
  const includeLowStockItems = summaryPrefs?.include_low_stock_items ?? true
  const includeEmployeeActivity = summaryPrefs?.include_employee_activity ?? true
  const includeComparisonMetrics = summaryPrefs?.include_comparison_metrics ?? true
  const includeTrendingItems = summaryPrefs?.include_trending_items ?? false
  const summaryFormat = summaryPrefs?.summary_format ?? 'detailed'
  const locationsToInclude = summaryPrefs?.locations_to_include || []

  // Prepare locations filter
  let locationsFilter: string[] | null = null
  if (locationId) {
    locationsFilter = [locationId]
  } else if (locationsToInclude.length > 0) {
    locationsFilter = locationsToInclude
  }

  // Fetch summary data using the helper function
  const { data: summaryJson, error: summaryError } = await supabase.rpc('get_daily_summary_data', {
    p_organization_id: organizationId,
    p_date: date,
    p_locations_to_include: locationsFilter,
  })

  if (summaryError) {
    console.error('Summary data fetch error', summaryError)
    return new Response('Failed to fetch summary data', { status: 500 })
  }

  const summaryData = summaryJson as SummaryData

  // Get location name if filtering by location
  let locationName = ''
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('name')
      .eq('id', locationId)
      .single()
    locationName = loc?.name || ''
  }

  const orgName = summaryData.organization_name || 'Your Organization'
  const summaryDateFormatted = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const baseUrl = 'https://lazadessert.cafe'
  const dashboardUrl = `${baseUrl}/admin${locationId ? `?location=${locationId}` : ''}`
  const notificationSettingsUrl = `${baseUrl}/admin/settings/notifications`

  // Build updated items HTML
  const buildUpdatedItemsHtml = () => {
    const items = summaryData.summary.updated_items || []
    if (!includeUpdatedItems || items.length === 0) return ''

    const maxItems = summaryFormat === 'concise' ? 5 : 20
    const itemsToShow = items.slice(0, maxItems)
    const moreCount = items.length - itemsToShow.length

    const itemRows = itemsToShow
      .map(
        (item) => `
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:6px;padding:12px 15px;margin-bottom:8px;border:1px solid #e5e7eb">
          <tbody>
            <tr>
              <td style="vertical-align:top">
                <p style="font-size:15px;font-weight:600;color:#1f2937;margin:0 0 3px">${escapeHtml(item.item_name)}</p>
                <p style="font-size:13px;color:#6b7280;margin:0">
                  ${item.previous_quantity} → <strong>${item.new_quantity}</strong> 
                  <span style="color:${item.change >= 0 ? '#16a34a' : '#dc2626'}">
                    (${item.change >= 0 ? '+' : ''}${item.change})
                  </span>
                </p>
                ${summaryFormat === 'detailed' ? `<p style="font-size:12px;color:#9ca3af;margin:3px 0 0">Updated by: ${escapeHtml(item.updated_by)}</p>` : ''}
              </td>
              <td style="vertical-align:top;text-align:right">
                <p style="font-size:13px;color:#9ca3af;margin:0">
                  ${new Date(item.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      `
      )
      .join('')

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                📝 Items Updated (Last 24 Hours)
              </h2>
              ${itemRows}
              ${moreCount > 0 ? `<p style="font-size:13px;color:#6b7280;font-style:italic;text-align:center;margin:10px 0 0">...and ${moreCount} more items</p>` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build low stock items HTML
  const buildLowStockHtml = () => {
    const items = summaryData.summary.low_stock_items || []
    if (!includeLowStockItems || items.length === 0) return ''

    const maxItems = summaryFormat === 'concise' ? 3 : 10
    const itemsToShow = items.slice(0, maxItems)
    const moreCount = items.length - itemsToShow.length

    const itemRows = itemsToShow
      .map((item) => {
        const urgencyInfo = {
          low: { emoji: '⚠️', color: '#f59e0b', bgColor: '#fffbeb' },
          critical: { emoji: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
          out_of_stock: { emoji: '🚨', color: '#dc2626', bgColor: '#fef2f2' },
        }[item.urgency_level]

        return `
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${urgencyInfo.bgColor};border-radius:6px;padding:12px 15px;margin-bottom:8px;border:1px solid ${urgencyInfo.color}">
            <tbody>
              <tr>
                <td>
                  <p style="font-size:15px;font-weight:600;color:#1f2937;margin:0 0 3px">
                    ${urgencyInfo.emoji} ${escapeHtml(item.item_name)}
                  </p>
                  <p style="font-size:13px;color:#6b7280;margin:0">
                    ${item.current_quantity} / ${item.threshold} (below threshold)
                    ${item.location_name ? ` • ${escapeHtml(item.location_name)}` : ''}
                    ${item.storage_space_name ? ` • ${escapeHtml(item.storage_space_name)}` : ''}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        `
      })
      .join('')

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                ⚠️ Low Stock Items as of ${new Date(summaryData.date).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </h2>
              ${itemRows}
              ${moreCount > 0 ? `<p style="font-size:13px;color:#6b7280;font-style:italic;text-align:center;margin:10px 0 0">...and ${moreCount} more low stock items</p>` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build inventory matrix HTML (similar to InventoryMatrix component)
  const buildStorageUtilizationHtml = () => {
    const matrixData = summaryData.summary.storage_utilization || []
    if (!includeStorageUtilization || matrixData.length === 0) return ''

    // Group by location
    const byLocation: Record<string, InventoryMatrixItem[]> = {}
    for (const item of matrixData) {
      if (!byLocation[item.location_id]) {
        byLocation[item.location_id] = []
      }
      byLocation[item.location_id].push(item)
    }

    const maxItems = summaryFormat === 'concise' ? 10 : 50

    const locationSections = Object.entries(byLocation)
      .map(([locationId, items]) => {
        const locationName = items[0]?.location_name || 'Unknown'
        const locationItems = items.slice(0, maxItems)

        // Get all unique storage spaces for this location
        const allStorageSpaces: StorageSpaceMatrix[] = []
        const spaceMap = new Map<string, StorageSpaceMatrix>()

        for (const item of items) {
          for (const space of item.storage_spaces || []) {
            if (!spaceMap.has(space.storage_space_id)) {
              spaceMap.set(space.storage_space_id, space)
              allStorageSpaces.push(space)
            }
          }
        }

        if (allStorageSpaces.length === 0) return ''

        // Build table header
        const headerCells = allStorageSpaces
          .map((space) => {
            const tempIcon = {
              frozen: '❄️',
              refrigerated: '💧',
              dry: '📦',
            }[space.temperature_type] || '📦'

            return `
              <th style="border:1px solid #e5e7eb;padding:8px;text-align:center;font-size:12px;font-weight:600;color:#1f2937;background-color:#f9fafb;min-width:100px">
                ${tempIcon} ${escapeHtml(space.storage_space_name)}
              </th>
            `
          })
          .join('')

        // Build table rows
        const itemRows = locationItems
          .map((item) => {
            const cells = allStorageSpaces
              .map((space) => {
                const spaceData = item.storage_spaces?.find(s => s.storage_space_id === space.storage_space_id)
                const quantity = spaceData?.quantity || 0
                const isStored = spaceData?.is_stored || false
                const minQty = item.min_quantity || 0

                // Determine status color
                let bgColor = '#ffffff'
                let textColor = '#1f2937'
                let borderColor = '#e5e7eb'

                if (!isStored) {
                  bgColor = '#f9fafb'
                  textColor = '#d1d5db'
                } else if (quantity < minQty) {
                  bgColor = '#fee2e2'
                  textColor = '#991b1b'
                  borderColor = '#fca5a5'
                } else if (quantity < minQty * 1.2) {
                  bgColor = '#fef3c7'
                  textColor = '#92400e'
                  borderColor = '#fbbf24'
                } else {
                  bgColor = '#d1fae5'
                  textColor = '#065f46'
                  borderColor = '#34d399'
                }

                return `
                  <td style="border:1px solid ${borderColor};padding:8px;text-align:center;font-size:13px;background-color:${bgColor};color:${textColor};font-weight:${isStored ? '600' : '400'}">
                    ${isStored ? quantity.toFixed(2) : '—'}
                  </td>
                `
              })
              .join('')

            const total = item.total_quantity

            return `
              <tr>
                <td style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;font-weight:500;color:#1f2937;background-color:#ffffff">
                  <div style="font-weight:600">${escapeHtml(item.item_name)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:2px">
                    Min: ${item.min_quantity} ${item.unit_of_measure}
                  </div>
                </td>
                ${cells}
                <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;font-size:13px;font-weight:600;color:#1f2937;background-color:#f9fafb">
                  ${total.toFixed(2)}
                </td>
              </tr>
            `
          })
          .join('')

        return `
          <div style="margin-bottom:30px">
            <h3 style="font-size:16px;font-weight:600;color:#1f2937;margin:0 0 15px">📍 ${escapeHtml(locationName)}</h3>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;background-color:#ffffff;font-size:13px">
                <thead>
                  <tr>
                    <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:12px;font-weight:600;color:#1f2937;background-color:#f9fafb;position:sticky;left:0;z-index:10">
                      Item
                    </th>
                    ${headerCells}
                    <th style="border:1px solid #e5e7eb;padding:8px;text-align:center;font-size:12px;font-weight:600;color:#1f2937;background-color:#f9fafb">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </div>
          </div>
        `
      })
      .join('')

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 20px">
                📊 Inventory Matrix
              </h2>
              ${locationSections}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build employee activity HTML
  const buildEmployeeActivityHtml = () => {
    const activity = summaryData.summary.employee_activity || []
    if (!includeEmployeeActivity || activity.length === 0) return ''

    const maxItems = summaryFormat === 'concise' ? 3 : 10
    const itemsToShow = activity.slice(0, maxItems)

    const activityRows = itemsToShow
      .map((emp) => `
        <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:6px;padding:12px 15px;margin-bottom:8px;border:1px solid #e5e7eb">
          <tbody>
            <tr>
              <td>
                <p style="font-size:15px;font-weight:600;color:#1f2937;margin:0 0 3px">${escapeHtml(emp.user_name)}</p>
                <p style="font-size:13px;color:#6b7280;margin:0">
                  ${emp.update_count} updates • ${emp.items_updated} items
                  ${summaryFormat === 'detailed' && emp.action_types ? ` • Actions: ${emp.action_types.join(', ')}` : ''}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      `)
      .join('')

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                👥 Employee Activity
              </h2>
              ${activityRows}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build comparison metrics HTML
  const buildComparisonMetricsHtml = () => {
    const metrics = summaryData.summary.comparison_metrics
    if (!includeComparisonMetrics || !metrics) return ''

    const formatChange = (value: number) => {
      const sign = value >= 0 ? '+' : ''
      const color = value >= 0 ? '#16a34a' : '#dc2626'
      return `<span style="color:${color}">${sign}${value.toLocaleString()}</span>`
    }

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                📈 Comparison Metrics
              </h2>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:6px;padding:15px">
                <tr>
                  <td style="text-align:center;padding:10px;border-right:1px solid #e5e7eb">
                    <p style="font-size:12px;color:#6b7280;margin:0 0 5px;text-transform:uppercase">Today vs Yesterday</p>
                    <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:0">
                      ${formatChange(metrics.todayVsYesterday.inventoryValueChange)}
                    </p>
                    <p style="font-size:11px;color:#9ca3af;margin:3px 0 0">Inventory Value</p>
                    <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:5px 0 0">
                      ${formatChange(metrics.todayVsYesterday.itemsUpdatedChange)}
                    </p>
                    <p style="font-size:11px;color:#9ca3af;margin:3px 0 0">Items Updated</p>
                  </td>
                  <td style="text-align:center;padding:10px">
                    <p style="font-size:12px;color:#6b7280;margin:0 0 5px;text-transform:uppercase">Week over Week</p>
                    <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:0">
                      ${formatChange(metrics.weekOverWeek.inventoryValueChange)}
                    </p>
                    <p style="font-size:11px;color:#9ca3af;margin:3px 0 0">Inventory Value</p>
                    <p style="font-size:16px;font-weight:bold;color:#1f2937;margin:5px 0 0">
                      ${formatChange(metrics.weekOverWeek.itemsUpdatedChange)}
                    </p>
                    <p style="font-size:11px;color:#9ca3af;margin:3px 0 0">Items Updated</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build trending items HTML
  const buildTrendingItemsHtml = () => {
    const items = summaryData.summary.trending_items || []
    if (!includeTrendingItems || items.length === 0) return ''

    const maxItems = summaryFormat === 'concise' ? 5 : 15
    const itemsToShow = items.slice(0, maxItems)

    const itemRows = itemsToShow
      .map((item) => {
        const directionEmoji = item.direction === 'up' ? '📈' : item.direction === 'down' ? '📉' : '➡️'
        const directionColor = item.direction === 'up' ? '#16a34a' : item.direction === 'down' ? '#dc2626' : '#6b7280'

        return `
          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:6px;padding:12px 15px;margin-bottom:8px;border:1px solid #e5e7eb">
            <tbody>
              <tr>
                <td>
                  <p style="font-size:15px;font-weight:600;color:#1f2937;margin:0 0 3px">
                    ${directionEmoji} ${escapeHtml(item.item_name)}
                  </p>
                  <p style="font-size:13px;color:#6b7280;margin:0">
                    Change: <span style="color:${directionColor};font-weight:600">${item.change >= 0 ? '+' : ''}${item.change}</span>
                    ${summaryFormat === 'detailed' ? ` • Updated ${item.update_frequency} times` : ''}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        `
      })
      .join('')

    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:25px">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 15px">
                🔥 Trending Items
              </h2>
              ${itemRows}
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Build executive summary HTML
  const buildExecutiveSummaryHtml = () => {
    return `
      <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb;border-radius:8px;padding:20px;margin-bottom:30px;border:1px solid #e5e7eb">
        <tbody>
          <tr>
            <td>
              <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin:0 0 20px">Executive Summary</h2>
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding:10px">
                    <p style="font-size:24px;font-weight:bold;color:#1e40af;margin:0 0 5px">${summaryData.summary.updated_items_count || 0}</p>
                    <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px">Items Updated</p>
                  </td>
                  <td style="text-align:center;padding:10px">
                    <p style="font-size:24px;font-weight:bold;color:${(summaryData.summary.low_stock_count || 0) > 0 ? '#dc2626' : '#16a34a'};margin:0 0 5px">${summaryData.summary.low_stock_count || 0}</p>
                    <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px">Low Stock</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `
  }

  const locationText = locationName ? ` - ${locationName}` : ''
  const subject = `📊 Daily Inventory Summary${locationText} - ${new Date(summaryData.date).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`

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
    Daily Summary for ${orgName}: ${summaryData.summary.updated_items_count || 0} items updated, ${summaryData.summary.low_stock_count || 0} low stock alerts
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
                          <h1 style="color:#ffffff;font-size:24px;font-weight:bold;margin:0 0 10px;text-align:center">📊 Daily Inventory Summary</h1>
                          <p style="font-size:16px;line-height:24px;color:#e0e7ff;margin:0;text-align:center">
                            ${orgName}${locationText}<br/>
                            ${summaryDateFormatted}
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
                          <!-- Executive Summary -->
                          ${buildExecutiveSummaryHtml()}
                          
                          <!-- Updated Items -->
                          ${buildUpdatedItemsHtml()}
                          
                          <!-- Storage Utilization -->
                          ${buildStorageUtilizationHtml()}
                          
                          <!-- Low Stock Items -->
                          ${buildLowStockHtml()}
                          
                          <!-- Employee Activity -->
                          ${buildEmployeeActivityHtml()}
                          
                          <!-- Comparison Metrics -->
                          ${buildComparisonMetricsHtml()}
                          
                          <!-- Trending Items -->
                          ${buildTrendingItemsHtml()}
                          
                          <!-- Action Button -->
                          <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:30px 0;text-align:center">
                            <tbody>
                              <tr>
                                <td>
                                  <a href="${dashboardUrl}" style="line-height:100%;text-decoration:none;display:inline-block;background-color:#1e40af;border-radius:6px;color:#ffffff;font-size:16px;font-weight:bold;text-align:center;padding:12px 24px" target="_blank">
                                    View Full Dashboard
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
                            This summary was automatically generated for ${orgName}.
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
    organization_id: organizationId,
    email_type: 'daily_summary',
    recipient_email: firstRecipient,
    subject,
    status: sendStatus,
    error_message: errorMessage,
    sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    metadata: {
      location_id: locationId,
      updated_items_count: summaryData.summary.updated_items_count,
      low_stock_count: summaryData.summary.low_stock_count,
      recipients,
    },
  })

  return new Response(
    JSON.stringify({
      status: sendStatus,
      summary: {
        updated_items_count: summaryData.summary.updated_items_count,
        low_stock_count: summaryData.summary.low_stock_count,
      },
    }),
    { status: 200 }
  )
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
