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
import { LowStockDigestData } from '@/lib/utils/emailDataBuilders';

const url = 'https://lazadessert.cafe';

interface LowStockDigestProps {
    digestData: LowStockDigestData;
}

export default function LowStockDigest({ digestData }: LowStockDigestProps) {
    // Group alerts by location or category
    const groupedAlerts = digestData.alerts.reduce((acc, alert) => {
        const key = digestData.groupedBy === 'location'
            ? alert.location.id
            : alert.item.category;
        if (!acc[key]) {
            acc[key] = {
                name: digestData.groupedBy === 'location'
                    ? alert.location.name
                    : alert.item.category,
                alerts: [],
            };
        }
        acc[key].alerts.push(alert);
        return acc;
    }, {} as Record<string, { name: string; alerts: typeof digestData.alerts }>);

    const criticalCount = digestData.alerts.filter(a => a.urgencyLevel === 'critical' || a.urgencyLevel === 'out_of_stock').length;
    const lowCount = digestData.alerts.filter(a => a.urgencyLevel === 'low').length;

    return (
        <Html>
            <Head />
            <Preview>
                Low Stock Digest: {digestData.alerts.length} items need attention
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
                            📦 Low Stock Digest
                        </Heading>
                        <Text style={headerSubtitle}>
                            {digestData.alerts.length} item{digestData.alerts.length !== 1 ? 's' : ''} need your attention
                        </Text>
                    </Section>

                    {/* Summary */}
                    <Section style={contentSection}>
                        <Section style={summaryBox}>
                            <Row>
                                <Column style={summaryColumn}>
                                    <Text style={summaryNumber}>{criticalCount}</Text>
                                    <Text style={summaryLabel}>Critical</Text>
                                </Column>
                                <Column style={summaryColumn}>
                                    <Text style={summaryNumber}>{lowCount}</Text>
                                    <Text style={summaryLabel}>Low Stock</Text>
                                </Column>
                                <Column style={summaryColumn}>
                                    <Text style={summaryNumber}>{digestData.alerts.length}</Text>
                                    <Text style={summaryLabel}>Total Items</Text>
                                </Column>
                            </Row>
                        </Section>

                        {/* Grouped Alerts */}
                        {Object.entries(groupedAlerts).map(([key, group]) => (
                            <Section key={key} style={groupSection}>
                                <Heading style={groupTitle}>
                                    {digestData.groupedBy === 'location' ? '📍' : '📁'} {group.name}
                                </Heading>
                                <Hr style={divider} />
                                {group.alerts.map((alert) => {
                                    const urgencyInfo = {
                                        low: { emoji: '⚠️', color: '#f59e0b' },
                                        critical: { emoji: '🔴', color: '#ef4444' },
                                        out_of_stock: { emoji: '🚨', color: '#dc2626' },
                                    }[alert.urgencyLevel];

                                    return (
                                        <Section key={alert.alertId} style={alertItem}>
                                            <Row>
                                                <Column style={alertItemColumn}>
                                                    <Text style={alertItemName}>
                                                        {urgencyInfo.emoji} {alert.item.name}
                                                    </Text>
                                                    <Text style={alertItemDetails}>
                                                        {alert.location.name}
                                                        {alert.storageSpace && ` • ${alert.storageSpace.name}`}
                                                    </Text>
                                                </Column>
                                                <Column style={alertItemColumn}>
                                                    <Text style={alertItemQuantity}>
                                                        {alert.currentQuantity} / {alert.lowThreshold} {alert.item.unit_of_measure}
                                                    </Text>
                                                    <Text style={alertItemAction}>
                                                        <Link
                                                            href={`${url}/admin/inventory?item=${alert.item.id}&location=${alert.location.id}`}
                                                            style={alertLink}
                                                        >
                                                            View →
                                                        </Link>
                                                    </Text>
                                                </Column>
                                            </Row>
                                        </Section>
                                    );
                                })}
                            </Section>
                        ))}

                        {/* Action Button */}
                        <Section style={actionSection}>
                            <Button
                                href={`${url}/admin/inventory?filter=low_stock`}
                                style={primaryButton}
                            >
                                View All Alerts in App
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This digest was generated on {new Date(digestData.digestDate).toLocaleDateString()}.
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

// Styles (reusing from LowStockAlert with additions)
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

const summaryBox = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    border: '1px solid #e5e7eb',
};

const summaryColumn = {
    textAlign: 'center' as const,
    padding: '10px',
};

const summaryNumber = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e40af',
    margin: '0 0 5px',
};

const summaryLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const groupSection = {
    marginBottom: '30px',
};

const groupTitle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 15px',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '15px 0',
};

const alertItem = {
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
};

const alertItemColumn = {
    verticalAlign: 'top' as const,
};

const alertItemName = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 5px',
};

const alertItemDetails = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
};

const alertItemQuantity = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 5px',
    textAlign: 'right' as const,
};

const alertItemAction = {
    fontSize: '14px',
    margin: '0',
    textAlign: 'right' as const,
};

const alertLink = {
    color: '#1e40af',
    textDecoration: 'none',
    fontWeight: 'bold',
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

