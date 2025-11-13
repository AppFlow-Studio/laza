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
} from '@react-email/components';

interface WaitlistData {
    name: string;
    email: string;
    submittedAt: Date;
}

export default function LazaFranchiseWaitlistNotification({ waitlistData }: { waitlistData: WaitlistData }) {
    return (
        <Html>
            <Head />
            <Preview>New Franchise Waitlist Signup - {waitlistData.name}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Img
                            src="https://lazadessert.cafe/lazabluelogo.png"
                            width="60"
                            height="60"
                            alt="Laza Cafe Logo"
                            style={logo}
                        />
                        <Heading style={title}>New Franchise Waitlist Signup</Heading>
                        <Text style={subtitle}>Someone is interested in franchising with Laza</Text>
                    </Section>

                    {/* Contact Information */}
                    <Section style={infoSection}>
                        <Row style={infoRow}>
                            <Column style={infoColumn}>
                                <Text style={infoLabel}>Name:</Text>
                            </Column>
                            <Column style={infoColumn}>
                                <Text style={infoValue}>{waitlistData.name}</Text>
                            </Column>
                        </Row>
                        <Row style={infoRow}>
                            <Column style={infoColumn}>
                                <Text style={infoLabel}>Email:</Text>
                            </Column>
                            <Column style={infoColumn}>
                                <Text style={infoValue}>{waitlistData.email}</Text>
                            </Column>
                        </Row>
                        <Row style={infoRow}>
                            <Column style={infoColumn}>
                                <Text style={infoLabel}>Submitted:</Text>
                            </Column>
                            <Column style={infoColumn}>
                                <Text style={infoValue}>
                                    {waitlistData.submittedAt.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </Column>
                        </Row>
                    </Section>

                    {/* Next Steps */}
                    {/* <Section style={nextStepsSection}>
                        <Heading style={nextStepsTitle}>📋 Next Steps</Heading>
                        <Text style={nextStepsText}>
                            Here's what you should do with this new franchise prospect:
                        </Text>

                        <Section style={stepItem}>
                            <Text style={stepNumber}>1</Text>
                            <Text style={stepText}>Add this contact to your franchise prospect database</Text>
                        </Section>

                        <Section style={stepItem}>
                            <Text style={stepNumber}>2</Text>
                            <Text style={stepText}>Consider sending a personalized welcome email</Text>
                        </Section>

                        <Section style={stepItem}>
                            <Text style={stepNumber}>3</Text>
                            <Text style={stepText}>Track their interest level for future outreach</Text>
                        </Section>

                        <Section style={stepItem}>
                            <Text style={stepNumber}>4</Text>
                            <Text style={stepText}>Include them in franchise announcement communications</Text>
                        </Section>
                    </Section> */}

                    {/* Quick Actions */}
                    <Section style={actionsSection}>
                        <Heading style={actionsTitle}>Quick Actions</Heading>
                        <Row style={actionsRow}>
                            <Column style={actionColumn}>
                                <Link href={`mailto:${waitlistData.email}`} style={actionButton}>
                                    Reply to {waitlistData.name}
                                </Link>
                            </Column>
                            <Column style={actionColumn}>
                                <Link href="https://lazadessert.cafe/join-us" style={secondaryButton}>
                                    View Waitlist Page
                                </Link>
                            </Column>
                        </Row>
                    </Section>

                    {/* Additional Info */}
                    <Section style={additionalInfoSection}>
                        <Heading style={additionalInfoTitle}>📊 Franchise Program Status</Heading>
                        <Text style={additionalInfoText}>
                            This person has shown interest in franchising with Laza. They've been added to
                            the waitlist and will receive a confirmation email. Consider reaching out to
                            high-priority prospects personally to build relationships before the official
                            franchise program launches.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            This notification was sent from the Laza Dessert Cafe franchise waitlist system.
                        </Text>
                        <Text style={footerText}>
                            Visit{' '}
                            <Link href="https://lazadessert.cafe/join-us" style={footerLink}>
                                lazadessert.cafe/join-us
                            </Link>{' '}
                            to view the waitlist page.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
};

const header = {
    padding: '32px 24px 0',
    textAlign: 'center' as const,
    borderBottom: '2px solid #2C4B7E',
    paddingBottom: '24px',
    marginBottom: '32px',
};

const logo = {
    margin: '0 auto 16px',
    display: 'block',
};

const title = {
    color: '#2C4B7E',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0',
};

const subtitle = {
    color: '#666666',
    fontSize: '16px',
    lineHeight: '1.4',
    margin: '8px 0 0 0',
};

const infoSection = {
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #2C4B7E',
    padding: '24px',
    borderRadius: '0 8px 8px 0',
};

const infoRow = {
    margin: '0 0 12px 0',
};

const infoColumn = {
    width: '50%',
    verticalAlign: 'top' as const,
};

const infoLabel = {
    color: '#2C4B7E',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.4',
    margin: '0',
};

const infoValue = {
    color: '#333333',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: '0',
};

const nextStepsSection = {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    padding: '24px',
    borderRadius: '8px',
};

const nextStepsTitle = {
    color: '#856404',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
};

const nextStepsText = {
    color: '#856404',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
};

const stepItem = {
    display: 'flex',
    alignItems: 'flex-start',
    margin: '0 0 12px 0',
};

const stepNumber = {
    backgroundColor: '#856404',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 12px 0 0',
    flexShrink: 0,
};

const stepText = {
    color: '#856404',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
    flex: 1,
};

const actionsSection = {
    padding: '0 24px 32px',
    textAlign: 'center' as const,
};

const actionsTitle = {
    color: '#2C4B7E',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 20px 0',
};

const actionsRow = {
    margin: '0',
};

const actionColumn = {
    width: '50%',
    padding: '0 8px',
};

const actionButton = {
    backgroundColor: '#2C4B7E',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-block',
    width: '100%',
    textAlign: 'center' as const,
};

const secondaryButton = {
    backgroundColor: '#6c757d',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-block',
    width: '100%',
    textAlign: 'center' as const,
};

const additionalInfoSection = {
    backgroundColor: '#e3f2fd',
    padding: '20px',
    borderRadius: '8px',
};

const additionalInfoTitle = {
    color: '#1976d2',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 12px 0',
};

const additionalInfoText = {
    color: '#1976d2',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0',
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '32px 24px',
};

const footer = {
    padding: '0 24px',
    textAlign: 'center' as const,
};

const footerText = {
    color: '#666666',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 8px 0',
};

const footerLink = {
    color: '#2C4B7E',
    textDecoration: 'none',
};
