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

export default function LazaFranchiseWaitlistConfirmation({ waitlistData }: { waitlistData: WaitlistData }) {
    return (
        <Html>
            <Head />
            <Preview>Welcome to the Laza Franchise Waitlist! 🎉</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Img
                            src="https://lazadessert.cafe/lazabluelogo.png"
                            width="80"
                            height="80"
                            alt="Laza Cafe Logo"
                            style={logo}
                        />
                        <Heading style={title}>Welcome to the Family!</Heading>
                        <Text style={subtitle}>You're now on our franchise waitlist</Text>
                    </Section>

                    {/* Welcome Message */}
                    <Section style={welcomeSection}>
                        <Heading style={welcomeTitle}>Thank you, {waitlistData.name}! 🎉</Heading>
                        <Text style={welcomeText}>
                            We're excited that you're interested in joining the Laza Dessert Cafe family.
                            You're now officially on our franchise waitlist, and we'll be in touch as soon
                            as we're ready to expand.
                        </Text>
                    </Section>

                    {/* What Happens Next */}
                    <Section style={section}>
                        <Heading style={sectionTitle}>What Happens Next?</Heading>
                        <Text style={sectionText}>
                            We're currently preparing our franchise program and will reach out to waitlist
                            members when opportunities become available. In the meantime, we encourage you to:
                        </Text>

                        <Row style={benefitsRow}>
                            <Column style={benefitColumn}>
                                <Section style={benefitItem}>
                                    <Text style={benefitIcon}>🏪</Text>
                                    <Heading style={benefitTitle}>Visit Our Locations</Heading>
                                    <Text style={benefitText}>
                                        Experience the Laza atmosphere firsthand at our Brooklyn or Astoria locations
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={benefitColumn}>
                                <Section style={benefitItem}>
                                    <Text style={benefitIcon}>📱</Text>
                                    <Heading style={benefitTitle}>Follow Our Journey</Heading>
                                    <Text style={benefitText}>
                                        Stay updated on our growth and menu innovations on social media
                                    </Text>
                                </Section>
                            </Column>
                        </Row>

                        <Row style={benefitsRow}>
                            <Column style={benefitColumn}>
                                <Section style={benefitItem}>
                                    <Text style={benefitIcon}>🍰</Text>
                                    <Heading style={benefitTitle}>Try Our Menu</Heading>
                                    <Text style={benefitText}>
                                        Sample our signature kunafa, crepes, and specialty drinks
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={benefitColumn}>
                                <Section style={benefitItem}>
                                    <Text style={benefitIcon}>💬</Text>
                                    <Heading style={benefitTitle}>Share Your Vision</Heading>
                                    <Text style={benefitText}>
                                        Think about how you'd bring Laza to your community
                                    </Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section>

                    {/* Current Locations */}
                    <Section style={locationsSection}>
                        <Heading style={sectionTitle}>📍 Visit Our Current Locations</Heading>

                        <Row style={locationRow}>
                            <Column style={locationColumn}>
                                <Section style={locationItem}>
                                    <Heading style={locationName}>Brooklyn Location</Heading>
                                    <Text style={locationAddress}>6740 5th Ave, Brooklyn, NY 11220</Text>
                                    <Text style={locationHours}>Open 2:00 PM - 2:00 AM, 7 days a week</Text>
                                </Section>
                            </Column>
                            <Column style={locationColumn}>
                                <Section style={locationItem}>
                                    <Heading style={locationName}>Astoria Location</Heading>
                                    <Text style={locationAddress}>25-33 Steinway St, Astoria, NY 11220</Text>
                                    <Text style={locationHours}>Open 2:00 PM - 2:00 AM, 7 days a week</Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section>

                    {/* Social Links */}
                    <Section style={socialSection}>
                        <Heading style={sectionTitle}>Stay Connected</Heading>
                        <Text style={socialText}>
                            Follow us for updates, new menu items, and behind-the-scenes content:
                        </Text>

                        <Row style={socialRow}>
                            <Column style={socialColumn}>
                                <Link href="https://www.instagram.com/lazacafe/?hl=en" style={socialButton}>
                                    📷 Instagram
                                </Link>
                            </Column>
                            <Column style={socialColumn}>
                                <Link href="https://www.tiktok.com/@lazacafe" style={socialButton}>
                                    🎵 TikTok
                                </Link>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            <strong>Questions?</strong> Feel free to reach out to us at{' '}
                            <Link href="mailto:support@lazadessert.cafe" style={footerLink}>
                                support@lazadessert.cafe
                            </Link>
                        </Text>
                        <Text style={footerText}>
                            We appreciate your interest in becoming part of the Laza family!
                        </Text>
                        <Text style={unsubscribeText}>
                            You're receiving this email because you joined our franchise waitlist at{' '}
                            <Link href="https://lazadessert.cafe/join-us" style={footerLink}>
                                lazadessert.cafe/join-us
                            </Link>
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
    maxWidth: '800px',
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
    fontSize: '28px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0',
};

const subtitle = {
    color: '#666666',
    fontSize: '18px',
    lineHeight: '1.4',
    margin: '10px 0 0 0',
};

const welcomeSection = {
    background: 'linear-gradient(135deg, #2C4B7E 0%, #1B3A6B 100%)',
    color: '#ffffff',
    padding: '32px 24px',
    borderRadius: '12px',
    textAlign: 'center' as const,
};

const welcomeTitle = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
};

const welcomeText = {
    color: '#ffffff',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0',
    opacity: '0.95',
};

const section = {
    padding: '0 24px 32px',
};

const sectionTitle = {
    color: '#2C4B7E',
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
};

const sectionText = {
    color: '#333333',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
};

const benefitsRow = {
    margin: '0 0 16px 0',
};

const benefitColumn = {
    width: '50%',
    padding: '0 8px',
};

const benefitItem = {
    backgroundColor: '#f8f9fa',
    padding: '20px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #2C4B7E',
    textAlign: 'center' as const,
};

const benefitIcon = {
    fontSize: '24px',
    margin: '0 0 12px 0',
    display: 'block',
};

const benefitTitle = {
    color: '#2C4B7E',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 8px 0',
};

const benefitText = {
    color: '#666666',
    fontSize: '13px',
    lineHeight: '1.4',
    margin: '0',
};

const locationsSection = {
    backgroundColor: '#e8f5e8',
    padding: '24px',
    borderRadius: '8px',
};

const locationRow = {
    margin: '0',
};

const locationColumn = {
    width: '50%',
    padding: '0 8px',
};

const locationItem = {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '6px',
    textAlign: 'center' as const,
};

const locationName = {
    color: '#2d5a2d',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 8px 0',
};

const locationAddress = {
    color: '#666666',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: '0 0 4px 0',
};

const locationHours = {
    color: '#888888',
    fontSize: '13px',
    lineHeight: '1.4',
    margin: '0',
};

const socialSection = {
    padding: '0 24px 32px',
    textAlign: 'center' as const,
};

const socialText = {
    color: '#333333',
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
};

const socialRow = {
    margin: '0',
};

const socialColumn = {
    width: '50%',
    padding: '0 8px',
};

const socialButton = {
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
    margin: '0 0 12px 0',
};

const footerLink = {
    color: '#2C4B7E',
    textDecoration: 'none',
};

const unsubscribeText = {
    color: '#999999',
    fontSize: '12px',
    lineHeight: '1.4',
    margin: '16px 0 0 0',
};
