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
import { LowStockAlertData } from '@/lib/utils/emailDataBuilders';

const url = 'https://lazadessert.cafe';

interface LowStockAlertProps {
    alertData: LowStockAlertData;
}

export default function LowStockAlert({ alertData }: LowStockAlertProps) {
    const urgencyInfo = {
        low: { emoji: '⚠️', label: 'Low Stock', color: '#f59e0b' },
        critical: { emoji: '🔴', label: 'Critical Stock', color: '#ef4444' },
        out_of_stock: { emoji: '🚨', label: 'Out of Stock', color: '#dc2626' },
    }[alertData.urgencyLevel];

    return (
        <Html>
            <Head />
            <Preview>
                {urgencyInfo.label}: {alertData.item.name} at {alertData.location.name}
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
                            {urgencyInfo.emoji} {urgencyInfo.label} Alert
                        </Heading>
                        <Text style={headerSubtitle}>
                            Action required for {alertData.item.name}
                        </Text>
                    </Section>

                    {/* Alert Details */}
                    <Section style={contentSection}>
                        <Section style={{ ...alertBox, borderColor: urgencyInfo.color }}>
                            <Heading style={itemName}>{alertData.item.name}</Heading>
                            <Text style={itemDetails}>
                                <strong>Location:</strong> {alertData.location.name}
                                {alertData.storageSpace && (
                                    <>
                                        <br />
                                        <strong>Storage:</strong> {alertData.storageSpace.name} ({alertData.storageSpace.temperature_type})
                                    </>
                                )}
                            </Text>
                            <Hr style={divider} />
                            <Row>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Current Quantity</Text>
                                    <Text style={metricValue}>{alertData.currentQuantity} {alertData.item.unit_of_measure}</Text>
                                </Column>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Low Threshold</Text>
                                    <Text style={metricValue}>{alertData.lowThreshold} {alertData.item.unit_of_measure}</Text>
                                </Column>
                            </Row>
                            {alertData.criticalThreshold && (
                                <Row>
                                    <Column style={metricColumn}>
                                        <Text style={metricLabel}>Critical Threshold</Text>
                                        <Text style={metricValue}>{alertData.criticalThreshold} {alertData.item.unit_of_measure}</Text>
                                    </Column>
                                    <Column style={metricColumn}>
                                        <Text style={metricLabel}>Suggested Reorder</Text>
                                        <Text style={metricValue}>{alertData.suggestedReorderQuantity} {alertData.item.unit_of_measure}</Text>
                                    </Column>
                                </Row>
                            )}
                        </Section>

                        {/* Action Buttons */}
                        <Section style={actionSection}>
                            <Button
                                href={`${url}/admin/inventory?item=${alertData.item.id}&location=${alertData.location.id}`}
                                style={primaryButton}
                            >
                                View Item in App
                            </Button>
                            <Button
                                href={`${url}/admin/inventory?item=${alertData.item.id}&location=${alertData.location.id}&action=update`}
                                style={secondaryButton}
                            >
                                Update Inventory
                            </Button>
                        </Section>

                        {/* Additional Info */}
                        <Section style={infoSection}>
                            <Text style={infoText}>
                                <strong>SKU:</strong> {alertData.item.sku || 'N/A'}
                                <br />
                                <strong>Category:</strong> {alertData.item.category}
                                <br />
                                <strong>Alert Triggered:</strong> {new Date(alertData.triggeredAt).toLocaleString()}
                            </Text>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This is an automated alert from your Laza inventory management system.
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
};

const contentSection = {
    padding: '30px 20px',
};

const alertBox = {
    border: '2px solid',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
};

const itemName = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 15px',
    color: '#1f2937',
};

const itemDetails = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 15px',
    lineHeight: '1.6',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '15px 0',
};

const metricColumn = {
    padding: '10px',
};

const metricLabel = {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 5px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
};

const metricValue = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
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
    margin: '0 10px 10px 0',
};

const secondaryButton = {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    margin: '0 10px 10px 0',
};

const infoSection = {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '15px',
    marginTop: '20px',
};

const infoText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0',
    lineHeight: '1.6',
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

