import React from 'react';
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Row,
    Column,
    Section,
    Text,
} from '@react-email/components';

const appUrl = 'https://lazadessert.cafe';

export interface InventoryAdjustmentRequestProps {
    employeeName: string;
    itemName: string;
    itemUnit: string;
    locationName: string;
    storageSpaceName: string | null;
    actionType: 'count' | 'adjustment' | 'used';
    previousQuantity: number;
    newQuantity: number;
    notes: string | null;
    approvalUrl: string;
}

const actionTypeLabel: Record<InventoryAdjustmentRequestProps['actionType'], string> = {
    count:      'Count',
    adjustment: 'Adjustment',
    used:       'Used',
};

export default function InventoryAdjustmentRequest({
    employeeName,
    itemName,
    itemUnit,
    locationName,
    storageSpaceName,
    actionType,
    previousQuantity,
    newQuantity,
    notes,
    approvalUrl,
}: InventoryAdjustmentRequestProps) {
    const quantityChange = newQuantity - previousQuantity;
    const changeLabel = quantityChange > 0 ? `+${quantityChange}` : String(quantityChange);
    const changeColor = quantityChange >= 0 ? '#16a34a' : '#dc2626';

    return (
        <Html>
            <Head />
            <Preview>
                {employeeName} requested an inventory adjustment — {itemName}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        <Img
                            src={`${appUrl}/lazabluelogo.png`}
                            width="130"
                            height="auto"
                            alt="Laza Dessert Cafe"
                            style={logo}
                        />
                        <Heading style={headerTitle}>Inventory Adjustment Request</Heading>
                        <Text style={headerSubtitle}>Review and approve or reject below</Text>
                    </Section>

                    {/* Content */}
                    <Section style={contentSection}>
                        <Section style={detailCard}>
                            <Heading style={itemNameStyle}>{itemName}</Heading>

                            <Text style={detailText}>
                                <strong>Requested by:</strong> {employeeName}
                                <br />
                                <strong>Location:</strong> {locationName}
                                {storageSpaceName && (
                                    <>
                                        <br />
                                        <strong>Storage space:</strong> {storageSpaceName}
                                    </>
                                )}
                                <br />
                                <strong>Action type:</strong> {actionTypeLabel[actionType]}
                            </Text>

                            <Hr style={divider} />

                            <Row>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Previous</Text>
                                    <Text style={metricValue}>
                                        {previousQuantity} {itemUnit}
                                    </Text>
                                </Column>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>New</Text>
                                    <Text style={metricValue}>
                                        {newQuantity} {itemUnit}
                                    </Text>
                                </Column>
                                <Column style={metricColumn}>
                                    <Text style={metricLabel}>Change</Text>
                                    <Text style={{ ...metricValue, color: changeColor }}>
                                        {changeLabel} {itemUnit}
                                    </Text>
                                </Column>
                            </Row>

                            {notes && (
                                <>
                                    <Hr style={divider} />
                                    <Text style={notesText}>
                                        <strong>Notes:</strong> {notes}
                                    </Text>
                                </>
                            )}
                        </Section>

                        {/* CTA */}
                        <Section style={actionSection}>
                            <Button href={approvalUrl} style={primaryButton}>
                                Review in Dashboard
                            </Button>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerText}>
                            This is an automated alert from your Laza inventory management system.
                        </Text>
                        <Text style={footerSignature}>Laza Dessert Cafe — Inventory Management</Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const detailCard = {
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
};

const itemNameStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 15px',
    color: '#1f2937',
};

const detailText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 15px',
    lineHeight: '1.7',
};

const divider = {
    borderColor: '#e5e7eb',
    margin: '15px 0',
};

const metricColumn = {
    padding: '10px',
    textAlign: 'center' as const,
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

const notesText = {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0',
    lineHeight: '1.6',
};

const actionSection = {
    margin: '20px 0',
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
    padding: '12px 28px',
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
