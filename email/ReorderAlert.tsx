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

const url = 'https://lazadessert.cafe';

export interface ReorderAlertItem {
    itemId: number;
    itemName: string;
    itemSku: string | null;
    currentStock: number;
    weeklyBurnRate: number;
    weeksRemaining: number | null;
    urgency: 'critical' | 'warning' | 'watch';
}

interface ReorderAlertProps {
    items: ReorderAlertItem[];
    organizationName?: string;
    generatedAt?: string;
}

export default function ReorderAlert({
    items,
    organizationName = 'Your Organization',
    generatedAt,
}: ReorderAlertProps) {
    const criticalItems = items.filter((i) => i.urgency === 'critical');
    const warningItems = items.filter((i) => i.urgency === 'warning');
    const watchItems = items.filter((i) => i.urgency === 'watch');

    const urgencyStyles = {
        critical: { emoji: '🚨', label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
        warning:  { emoji: '⚠️', label: 'Warning',  color: '#f59e0b', bg: '#fffbeb' },
        watch:    { emoji: '👁', label: 'Watch',    color: '#3b82f6', bg: '#eff6ff' },
    };

    const dateStr = generatedAt
        ? new Date(generatedAt).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })
        : new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          });

    return (
        <Html>
            <Head />
            <Preview>
                Reorder Alert: {items.length} item{items.length !== 1 ? 's' : ''} may need overseas orders placed soon
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
                            📦 Predictive Reorder Alert
                        </Heading>
                        <Text style={headerSubtitle}>
                            {items.length} item{items.length !== 1 ? 's' : ''} may need replenishment soon
                        </Text>
                    </Section>

                    {/* Content */}
                    <Section style={contentSection}>
                        {/* Summary Stats */}
                        <Section style={summarySection}>
                            <Row>
                                <Column style={statColumn}>
                                    <Text style={statValue}>{criticalItems.length}</Text>
                                    <Text style={{ ...statLabel, color: '#dc2626' }}>Critical</Text>
                                </Column>
                                <Column style={statColumn}>
                                    <Text style={statValue}>{warningItems.length}</Text>
                                    <Text style={{ ...statLabel, color: '#f59e0b' }}>Warning</Text>
                                </Column>
                                <Column style={statColumn}>
                                    <Text style={statValue}>{watchItems.length}</Text>
                                    <Text style={{ ...statLabel, color: '#3b82f6' }}>Watch</Text>
                                </Column>
                            </Row>
                        </Section>

                        <Hr style={divider} />

                        <Text style={sectionTitle}>Items Requiring Action</Text>

                        {/* Item rows */}
                        {items.map((item) => {
                            const style = urgencyStyles[item.urgency];
                            const weeksText = item.weeksRemaining !== null
                                ? `${item.weeksRemaining.toFixed(1)} weeks`
                                : 'Unknown';
                            const actionText = item.urgency === 'critical'
                                ? 'Place order immediately'
                                : item.urgency === 'warning'
                                ? 'Consider placing an overseas order'
                                : 'Monitor closely';

                            return (
                                <Section
                                    key={item.itemId}
                                    style={{
                                        ...itemCard,
                                        borderLeftColor: style.color,
                                        backgroundColor: style.bg,
                                    }}
                                >
                                    <Row>
                                        <Column style={{ width: '60%' }}>
                                            <Text style={itemName}>
                                                {style.emoji} {item.itemName}
                                            </Text>
                                            {item.itemSku && (
                                                <Text style={itemSku}>SKU: {item.itemSku}</Text>
                                            )}
                                        </Column>
                                        <Column style={{ width: '40%', textAlign: 'right' as const }}>
                                            <Text style={{ ...urgencyBadge, backgroundColor: style.color }}>
                                                {style.label}
                                            </Text>
                                        </Column>
                                    </Row>
                                    <Hr style={{ ...divider, margin: '10px 0' }} />
                                    <Row>
                                        <Column style={metricCol}>
                                            <Text style={metricLabel}>Current Stock</Text>
                                            <Text style={metricValue}>{item.currentStock}</Text>
                                        </Column>
                                        <Column style={metricCol}>
                                            <Text style={metricLabel}>Weekly Burn</Text>
                                            <Text style={metricValue}>{item.weeklyBurnRate.toFixed(1)}/wk</Text>
                                        </Column>
                                        <Column style={metricCol}>
                                            <Text style={metricLabel}>Weeks Left</Text>
                                            <Text style={{
                                                ...metricValue,
                                                color: item.urgency === 'critical' ? '#dc2626' : '#1f2937',
                                            }}>
                                                {weeksText}
                                            </Text>
                                        </Column>
                                    </Row>
                                    <Text style={actionRecommendation}>
                                        → {actionText}
                                    </Text>
                                </Section>
                            );
                        })}

                        {/* Action Button */}
                        <Section style={actionSection}>
                            <Button
                                href={`${url}/super-admin/analytics`}
                                style={primaryButton}
                            >
                                View Analytics Dashboard
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This predictive alert was generated on {dateStr} for {organizationName}.
                            Predictions are based on the last 90 days of order data.
                        </Text>
                        <Text style={footerLink}>
                            <Link href={`${url}/super-admin/settings/notifications`} style={{ color: '#3b82f6' }}>
                                Manage notification preferences
                            </Link>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
};

const contentSection = {
    padding: '30px 20px',
};

const summarySection = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb',
};

const statColumn = {
    textAlign: 'center' as const,
    padding: '5px',
};

const statValue = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 4px',
};

const statLabel = {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '20px 0',
};

const sectionTitle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 15px',
};

const itemCard = {
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '12px',
};

const itemName = {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
};

const itemSku = {
    fontSize: '11px',
    color: '#6b7280',
    margin: '2px 0 0',
    fontFamily: 'monospace',
};

const urgencyBadge = {
    display: 'inline-block',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '3px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const metricCol = {
    padding: '5px 8px',
};

const metricLabel = {
    fontSize: '10px',
    color: '#6b7280',
    margin: '0 0 3px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const metricValue = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
};

const actionRecommendation = {
    fontSize: '12px',
    color: '#4b5563',
    margin: '10px 0 0',
    fontStyle: 'italic' as const,
};

const actionSection = {
    margin: '25px 0',
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
    lineHeight: '1.6',
};

const footerLink = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0 0 10px',
};

const footerSignature = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
};
