import React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
    Row,
    Column,
    Button,
} from '@react-email/components';
import { DailySummaryData } from '@/lib/utils/emailDataBuilders';

const url = 'https://lazadessert.cafe';

interface DailyLocationSummaryProps {
    summaryData: DailySummaryData;
}

export default function DailyLocationSummary({ summaryData }: DailyLocationSummaryProps) {
    const locationText = summaryData.locationName
        ? ` - ${summaryData.locationName}`
        : '';

    return (
        <Html>
            <Head />
            <Preview>
                Daily Inventory Summary{locationText} - {new Date(summaryData.date).toLocaleDateString()}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        <Img
                            src={`${url}/lazabluelogo.png`}
                            width="130"
                            height="auto"
                            alt="Laza Dessert Cafe"
                            style={logo}
                        />
                        <Heading style={headerTitle}>
                            📊 Daily Inventory Summary
                        </Heading>
                        <Text style={headerSubtitle}>
                            {summaryData.organizationName}{locationText}
                            <br />
                            {new Date(summaryData.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </Section>

                    {/* Content */}
                    <Section style={contentSection}>
                        {/* Executive Summary */}
                        {summaryData.summary.inventoryValue !== undefined && (
                            <Section style={summaryBox}>
                                <Heading style={sectionTitle}>Executive Summary</Heading>
                                <Row>
                                    <Column style={metricColumn}>
                                        <Text style={metricValue}>
                                            ${summaryData.summary.inventoryValue?.toLocaleString() || '0'}
                                        </Text>
                                        <Text style={metricLabel}>Total Inventory Value</Text>
                                    </Column>
                                    <Column style={metricColumn}>
                                        <Text style={metricValue}>
                                            {summaryData.summary.updatedItems?.length || 0}
                                        </Text>
                                        <Text style={metricLabel}>Items Updated Today</Text>
                                    </Column>
                                </Row>
                                {summaryData.summary.lowStockItems && summaryData.summary.lowStockItems.length > 0 && (
                                    <Row>
                                        <Column style={metricColumn}>
                                            <Text style={metricValue}>
                                                {summaryData.summary.lowStockItems.length}
                                            </Text>
                                            <Text style={metricLabel}>Low Stock Items</Text>
                                        </Column>
                                    </Row>
                                )}
                            </Section>
                        )}

                        {/* Updated Items */}
                        {summaryData.summary.updatedItems && summaryData.summary.updatedItems.length > 0 && (
                            <Section style={section}>
                                <Heading style={sectionTitle}>📝 Items Updated Today</Heading>
                                {summaryData.summary.updatedItems.slice(0, 10).map((item, index) => (
                                    <Section key={index} style={itemRow}>
                                        <Row>
                                            <Column style={itemColumn}>
                                                <Text style={itemName}>{item.itemName}</Text>
                                                <Text style={itemDetails}>
                                                    {item.previousQuantity} → {item.newQuantity} {item.change > 0 ? '+' : ''}{item.change}
                                                </Text>
                                            </Column>
                                            <Column style={itemColumn}>
                                                <Text style={itemTime}>
                                                    {new Date(item.updatedAt).toLocaleTimeString()}
                                                </Text>
                                            </Column>
                                        </Row>
                                    </Section>
                                ))}
                                {summaryData.summary.updatedItems.length > 10 && (
                                    <Text style={moreItemsText}>
                                        ...and {summaryData.summary.updatedItems.length - 10} more items
                                    </Text>
                                )}
                            </Section>
                        )}

                        {/* Low Stock Items */}
                        {summaryData.summary.lowStockItems && summaryData.summary.lowStockItems.length > 0 && (
                            <Section style={section}>
                                <Heading style={sectionTitle}>⚠️ Low Stock Items</Heading>
                                {summaryData.summary.lowStockItems.slice(0, 5).map((item, index) => {
                                    const urgencyInfo = {
                                        low: { emoji: '⚠️', color: '#f59e0b' },
                                        critical: { emoji: '🔴', color: '#ef4444' },
                                        out_of_stock: { emoji: '🚨', color: '#dc2626' },
                                    }[item.urgencyLevel];

                                    return (
                                        <Section key={index} style={lowStockItem}>
                                            <Text style={lowStockItemName}>
                                                {urgencyInfo.emoji} {item.itemName}
                                            </Text>
                                            <Text style={lowStockItemDetails}>
                                                {item.currentQuantity} / {item.threshold} (below minimum quantity)
                                            </Text>
                                        </Section>
                                    );
                                })}
                                {summaryData.summary.lowStockItems.length > 5 && (
                                    <Text style={moreItemsText}>
                                        ...and {summaryData.summary.lowStockItems.length - 5} more low stock items
                                    </Text>
                                )}
                            </Section>
                        )}

                        {/* Comparison Metrics */}
                        {summaryData.summary.comparisonMetrics && (
                            <Section style={section}>
                                <Heading style={sectionTitle}>📈 Comparison Metrics</Heading>
                                <Row>
                                    <Column style={comparisonColumn}>
                                        <Text style={comparisonLabel}>Today vs Yesterday</Text>
                                        <Text style={comparisonValue}>
                                            {summaryData.summary.comparisonMetrics.todayVsYesterday.inventoryValueChange > 0 ? '+' : ''}
                                            ${summaryData.summary.comparisonMetrics.todayVsYesterday.inventoryValueChange.toLocaleString()}
                                        </Text>
                                        <Text style={comparisonSubtext}>
                                            Inventory Value Change
                                        </Text>
                                    </Column>
                                    <Column style={comparisonColumn}>
                                        <Text style={comparisonLabel}>Week over Week</Text>
                                        <Text style={comparisonValue}>
                                            {summaryData.summary.comparisonMetrics.weekOverWeek.inventoryValueChange > 0 ? '+' : ''}
                                            ${summaryData.summary.comparisonMetrics.weekOverWeek.inventoryValueChange.toLocaleString()}
                                        </Text>
                                        <Text style={comparisonSubtext}>
                                            Inventory Value Change
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>
                        )}

                        {/* ── Warehouse Section (super admin only) ── */}
                        {summaryData.warehouseSummary && (
                            <Section style={warehouseSection}>
                                {/* Section header */}
                                <Section style={warehouseHeader}>
                                    <Heading style={warehouseTitle}>
                                        🏭 Warehouse Summary
                                    </Heading>
                                    <Text style={warehouseSubtitle}>
                                        Central warehouse activity for{' '}
                                        {new Date(summaryData.date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                </Section>

                                {/* Key metrics row */}
                                <Row style={{ marginBottom: '20px' }}>
                                    <Column style={warehouseMetricColumn}>
                                        <Text style={warehouseMetricValue}>
                                            {summaryData.warehouseSummary.ticketsFulfilledToday}
                                        </Text>
                                        <Text style={warehouseMetricLabel}>
                                            Orders Fulfilled
                                        </Text>
                                    </Column>
                                    <Column style={warehouseMetricColumn}>
                                        <Text style={warehouseMetricValue}>
                                            {summaryData.warehouseSummary.itemsDispatchedToday.length}
                                        </Text>
                                        <Text style={warehouseMetricLabel}>
                                            Item Types Dispatched
                                        </Text>
                                    </Column>
                                    <Column style={warehouseMetricColumn}>
                                        <Text style={warehouseMetricValue}>
                                            {summaryData.warehouseSummary.itemsDispatchedToday.reduce(
                                                (sum, i) => sum + i.totalBoxes, 0,
                                            )}
                                        </Text>
                                        <Text style={warehouseMetricLabel}>
                                            Total Boxes Sent
                                        </Text>
                                    </Column>
                                </Row>

                                {/* Stock health bar */}
                                <Section style={stockHealthBox}>
                                    <Text style={stockHealthTitle}>📦 Warehouse Stock Health</Text>
                                    <Row>
                                        <Column style={{ width: '60%' }}>
                                            <Text style={stockHealthPercent}>
                                                {summaryData.warehouseSummary.stockHealth.healthPercent}%
                                            </Text>
                                            <Text style={stockHealthLabel}>items at healthy levels</Text>
                                        </Column>
                                        <Column style={{ width: '40%', textAlign: 'right' as const }}>
                                            {summaryData.warehouseSummary.stockHealth.lowStockCount > 0 && (
                                                <Text style={stockHealthWarning}>
                                                    ⚠️ {summaryData.warehouseSummary.stockHealth.lowStockCount} low stock
                                                </Text>
                                            )}
                                            {summaryData.warehouseSummary.stockHealth.criticalCount > 0 && (
                                                <Text style={stockHealthCritical}>
                                                    🔴 {summaryData.warehouseSummary.stockHealth.criticalCount} critical
                                                </Text>
                                            )}
                                            {summaryData.warehouseSummary.stockHealth.lowStockCount === 0 &&
                                             summaryData.warehouseSummary.stockHealth.criticalCount === 0 && (
                                                <Text style={stockHealthGood}>✅ All good</Text>
                                            )}
                                        </Column>
                                    </Row>
                                </Section>

                                {/* Items dispatched today */}
                                {summaryData.warehouseSummary.itemsDispatchedToday.length > 0 && (
                                    <Section style={{ marginTop: '16px' }}>
                                        <Text style={dispatchedTitle}>📤 Items Dispatched Today</Text>
                                        {summaryData.warehouseSummary.itemsDispatchedToday.slice(0, 8).map((item, index) => (
                                            <Section key={index} style={dispatchedRow}>
                                                <Row>
                                                    <Column style={{ width: '65%' }}>
                                                        <Text style={dispatchedItemName}>{item.itemName}</Text>
                                                    </Column>
                                                    <Column style={{ width: '35%', textAlign: 'right' as const }}>
                                                        <Text style={dispatchedItemQty}>
                                                            {item.totalBoxes} box{item.totalBoxes !== 1 ? 'es' : ''}
                                                        </Text>
                                                    </Column>
                                                </Row>
                                            </Section>
                                        ))}
                                        {summaryData.warehouseSummary.itemsDispatchedToday.length > 8 && (
                                            <Text style={moreItemsText}>
                                                ...and {summaryData.warehouseSummary.itemsDispatchedToday.length - 8} more items dispatched
                                            </Text>
                                        )}
                                    </Section>
                                )}
                            </Section>
                        )}

                        {/* Action Button */}
                        <Section style={actionSection}>
                            <Button
                                href={`${url}/admin/inventory${summaryData.locationId ? `?location=${summaryData.locationId}` : ''}`}
                                style={primaryButton}
                            >
                                View Full Dashboard
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This summary was automatically generated for {summaryData.organizationName}.
                        </Text>
                        <Text style={footerSignature}>
                            Laza Dessert Cafe - Inventory Management
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f5f7fa',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
    margin: '0 auto',
    padding: '20px',
};

const container = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '600px',
    padding: '0',
};

const headerSection = {
    backgroundColor: '#1e40af',
    borderRadius: '8px 8px 0 0',
    padding: '30px 20px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto 20px',
    display: 'block',
};

const headerTitle = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 10px',
    textAlign: 'center' as const,
};

const headerSubtitle = {
    color: '#e0e7ff',
    fontSize: '16px',
    margin: '0',
    textAlign: 'center' as const,
    lineHeight: '1.6',
};

const contentSection = {
    padding: '30px 20px',
};

const summaryBox = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    border: '1px solid #e5e7eb',
};

const section = {
    marginBottom: '30px',
};

const sectionTitle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 15px',
};

const metricColumn = {
    textAlign: 'center' as const,
    padding: '10px',
};

const metricValue = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: '0 0 5px',
};

const metricLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const itemRow = {
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
};

const itemColumn = {
    verticalAlign: 'top' as const,
};

const itemName = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 5px',
};

const itemDetails = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
};

const itemTime = {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0',
    textAlign: 'right' as const,
};

const moreItemsText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '10px 0 0',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
};

const lowStockItem = {
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    border: '1px solid #fbbf24',
};

const lowStockItemName = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 5px',
};

const lowStockItemDetails = {
    fontSize: '14px',
    color: '#92400e',
    margin: '0',
};

const comparisonColumn = {
    textAlign: 'center' as const,
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    margin: '0 5px',
};

const comparisonLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const comparisonValue = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: '0 0 5px',
};

const comparisonSubtext = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
};

const actionSection = {
    margin: '30px 0',
    textAlign: 'center' as const,
};

const primaryButton = {
    backgroundColor: '#1e40af',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
};

const footerSection = {
    padding: '20px',
    textAlign: 'center' as const,
    borderTop: '1px solid #e5e7eb',
};

const footerText = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 10px',
};

const footerSignature = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
};

// ── Warehouse section styles ──────────────────────────────────────────────────

const warehouseSection = {
    marginBottom: '30px',
    border: '1px solid #d1fae5',
    borderRadius: '8px',
    overflow: 'hidden' as const,
};

const warehouseHeader = {
    backgroundColor: '#065f46',
    padding: '18px 20px 14px',
};

const warehouseTitle = {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: '#ffffff',
    margin: '0 0 6px',
};

const warehouseSubtitle = {
    fontSize: '13px',
    color: '#a7f3d0',
    margin: '0',
};

const warehouseMetricColumn = {
    textAlign: 'center' as const,
    padding: '14px 8px',
    backgroundColor: '#ecfdf5',
};

const warehouseMetricValue = {
    fontSize: '26px',
    fontWeight: 'bold' as const,
    color: '#065f46',
    margin: '0 0 4px',
};

const warehouseMetricLabel = {
    fontSize: '11px',
    color: '#6b7280',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
};

const stockHealthBox = {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '14px 16px',
    margin: '0 16px 4px',
};

const stockHealthTitle = {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#374151',
    margin: '0 0 8px',
};

const stockHealthPercent = {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: '#059669',
    margin: '0 0 2px',
};

const stockHealthLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
};

const stockHealthWarning = {
    fontSize: '12px',
    fontWeight: '600' as const,
    color: '#d97706',
    margin: '0 0 4px',
    textAlign: 'right' as const,
};

const stockHealthCritical = {
    fontSize: '12px',
    fontWeight: '600' as const,
    color: '#dc2626',
    margin: '0',
    textAlign: 'right' as const,
};

const stockHealthGood = {
    fontSize: '12px',
    fontWeight: '600' as const,
    color: '#059669',
    margin: '0',
    textAlign: 'right' as const,
};

const dispatchedTitle = {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    color: '#374151',
    margin: '0 0 8px',
    padding: '0 16px',
};

const dispatchedRow = {
    padding: '8px 16px',
    borderBottom: '1px solid #f3f4f6',
};

const dispatchedItemName = {
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#111827',
    margin: '0',
};

const dispatchedItemQty = {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#065f46',
    margin: '0',
    textAlign: 'right' as const,
};

