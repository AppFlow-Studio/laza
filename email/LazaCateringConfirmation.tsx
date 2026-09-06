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
import { CateringFormType } from '@/components/OrderForm';

interface LazaCateringConfirmationProps {
    cateringData: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        address: string;
        notes?: string;
        eventDate?: string;
        eventType?: string;
        guestCount?: number;
    };
}
const url = 'https://lazadessert.cafe'

export const LazaCateringConfirmation = ({ cateringData }: { cateringData: CateringFormType }) => {
    return (
        <Html>
            <Head />
            <Preview>Catering Inquiry Confirmation - {cateringData.phone}</Preview>
            <Body style={main} className='w-full max-w-[800px]'>

                {/* Header Section */}
                <Section style={headerSection}>
                    <Img
                        src={`${url}/lazabluelogo.png`}
                        width="130"
                        height="auto"
                        alt="Laza Dessert Cafe"
                        style={logo}
                        className='rounded-full'
                    />
                    <Heading style={headerTitle}>
                        Catering Inquiry Received! 🎉
                    </Heading>
                    <Text style={headerSubtitle}>
                        Thank you for choosing Laza for your special event
                    </Text>
                </Section>

                {/* Main Content */}
                <Section style={contentSection}>
                    {/* Thank You Message */}
                    <Section style={thankYouSection}>
                        <Heading style={sectionTitle}>
                            Thank you, {cateringData.firstName}! 👋
                        </Heading>
                        <Text style={bodyText}>
                            We've received your catering inquiry and are excited to help make your event truly special!
                        </Text>
                        <Text style={bodyText}>
                            Our catering team will review your request and get back to you within 24 hours with a personalized quote and menu suggestions.
                        </Text>
                    </Section>

                    {/* Inquiry Details */}
                    <Section style={inquirySection}>
                        <Heading style={inquiryTitle}>📋 Inquiry Details</Heading>
                        <Row style={detailRow}>
                            {/* <Column style={detailColumn}>
                                <Section style={detailItemBox}>
                                    <Text style={detailLabel}>Inquiry Number:</Text>
                                    <Text style={detailValue}>{cateringData.phone}</Text>
                                </Section>
                            </Column> */}
                            <Column style={detailColumn}>
                                <Section style={detailItemBox}>
                                    <Text style={detailLabel}>Inquiry Date:</Text>
                                    <Text style={detailValue}>{new Date().toLocaleDateString()}</Text>
                                </Section>
                            </Column>
                        </Row>

                        {cateringData.eventDate && (
                            <Row style={detailRow}>
                                <Column style={detailColumn}>
                                    <Section style={detailItemBox}>
                                        <Text style={detailLabel}>Event Date:</Text>
                                        <Text style={detailValue}>{cateringData.eventDate}</Text>
                                    </Section>
                                </Column>
                                <Column style={detailColumn}>
                                    <Section style={detailItemBox}>
                                        <Text style={detailLabel}>Event Type:</Text>
                                        <Text style={detailValue}>{cateringData.eventType || 'Not specified'}</Text>
                                    </Section>
                                </Column>
                            </Row>
                        )}

                        {cateringData.guestCount && (
                            <Row style={detailRow}>
                                <Column style={detailColumn}>
                                    <Section style={detailItemBox}>
                                        <Text style={detailLabel}>Expected Guests:</Text>
                                        <Text style={detailValue}>{cateringData.guestCount} people</Text>
                                    </Section>
                                </Column>
                            </Row>
                        )}
                    </Section>

                    {/* Contact Information */}
                    <Section style={contactSection}>
                        <Heading style={sectionTitle}>Contact Information</Heading>
                        <Row style={contactRow}>
                            <Column style={contactColumn}>
                                <Text style={fieldLabel}>First Name</Text>
                                <Section style={fieldBox}>
                                    <Text style={fieldValue}>{cateringData.firstName}</Text>
                                </Section>
                            </Column>
                            <Column style={contactColumn}>
                                <Text style={fieldLabel}>Last Name</Text>
                                <Section style={fieldBox}>
                                    <Text style={fieldValue}>{cateringData.lastName}</Text>
                                </Section>
                            </Column>
                        </Row>

                        <Row style={contactRow}>
                            <Column style={contactColumn}>
                                <Text style={fieldLabel}>Phone</Text>
                                <Section style={fieldBox}>
                                    <Text style={fieldValue}>{cateringData.phone}</Text>
                                </Section>
                            </Column>
                            <Column style={contactColumn}>
                                <Text style={fieldLabel}>Email</Text>
                                <Section style={fieldBox}>
                                    <Text style={fieldValue}>{cateringData.email}</Text>
                                </Section>
                            </Column>
                        </Row>

                        <Row style={contactRow}>
                            <Column style={contactColumn}>
                                <Text style={fieldLabel}>Address</Text>
                                <Section style={fieldBox}>
                                    <Text style={fieldValue}>{cateringData.address}</Text>
                                </Section>
                            </Column>
                        </Row>

                        {cateringData.notes && (
                            <Row style={contactRow}>
                                <Column style={contactColumn}>
                                    <Text style={fieldLabel}>Special Requirements</Text>
                                    <Section style={fieldBox}>
                                        <Text style={fieldValue}>{cateringData.notes}</Text>
                                    </Section>
                                </Column>
                            </Row>
                        )}
                    </Section>

                    {/* What's Next */}
                    <Section style={nextSection}>
                        <Heading style={sectionTitle}>What Happens Next?</Heading>
                        <Row style={stepRow}>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>1</Text>
                                    <Heading style={stepTitle}>Review Your Request</Heading>
                                    <Text style={stepDescription}>
                                        Our catering team will carefully review your requirements
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>2</Text>
                                    <Heading style={stepTitle}>Custom Quote</Heading>
                                    <Text style={stepDescription}>
                                        We'll prepare a personalized quote and menu suggestions
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>3</Text>
                                    <Heading style={stepTitle}>Contact You</Heading>
                                    <Text style={stepDescription}>
                                        We'll reach out within 24 hours to discuss your event
                                    </Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section>

                    {/* Catering Highlights */}
                    {/* <Section style={highlightsSection}>
                        <Heading style={sectionTitle}>Why Choose Laza Catering?</Heading>
                        <Row style={highlightRow}>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox}>
                                    <Img
                                        src={`${url}/desserts/kunafa.jpg`}
                                        width="80"
                                        height="80"
                                        alt="Fresh Made"
                                        style={highlightImage}
                                        className='object-cover'
                                    />
                                    <Heading style={highlightTitle}>Fresh Made Daily</Heading>
                                    <Text style={highlightDescription}>All desserts made fresh</Text>
                                </Section>
                            </Column>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox} className=' w-full'>
                                    <Img
                                        src={`${url}/desserts/crepe.jpg`}
                                        width="80"
                                        height="80"
                                        alt="Customizable"
                                        style={highlightImage}
                                        className='object-cover'
                                    />
                                    <Heading style={highlightTitle}>Customizable Menus</Heading>
                                    <Text style={highlightDescription}>Tailored to your event</Text>
                                </Section>
                            </Column>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox}>
                                    <Img
                                        src={`${url}/drinks/ferroshake.jpg`}
                                        width="80"
                                        height="80"
                                        alt="Professional"
                                        style={highlightImage}
                                        className='object-cover'
                                    />
                                    <Heading style={highlightTitle}>Professional Service</Heading>
                                    <Text style={highlightDescription}>From setup to cleanup</Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section> */}

                    {/* Contact Information */}
                    <Section style={contactInfoSection}>
                        <Heading style={contactInfoTitle}>📞 Need to Reach Us?</Heading>
                        <Text style={contactInfoText}>
                            If you have any urgent questions, feel free to contact us directly:
                        </Text>
                        <Text style={contactInfoDetails}>
                            📧 support@lazadessert.cafe | 📱 (347) 560-6080
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerTitle}>
                            Thank you for choosing Laza for your special event! 🎉
                        </Text>
                        <Text style={footerText}>
                            We look forward to making your event truly memorable with our delicious desserts.
                        </Text>
                        <Row style={socialRow} className='grid grid-cols-2 gap-4'>
                            <Link href="https://www.instagram.com/lazacafe/?hl=en">
                                <Img
                                    src={`${url}/insta.png`}
                                    width="40"
                                    height="40"
                                    alt="Instagram"
                                    style={socialIcon}
                                />
                            </Link>
                            <Link href="https://www.tiktok.com/@lazacafe">
                                <Img
                                    src={`${url}/tiktok.png`}
                                    width="40"
                                    height="40"
                                    alt="TikTok"
                                    style={socialIcon}
                                />
                            </Link>
                        </Row>
                        {/* <Section style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <Row style={socialRow}>
                                <Column style={socialColumn}>
                                    <Link href="https://www.instagram.com/lazacafe/?hl=en">
                                        <Img
                                            src="https://lazadessert.cafe/insta.png"
                                            width="40"
                                            height="40"
                                            alt="Instagram"
                                            style={socialIcon}
                                        />
                                    </Link>
                                </Column>
                                <Column style={socialColumn}>
                                    <Link href="https://tiktok.com/@lazacafe">
                                        <Img
                                            src="https://lazadessert.cafe/tiktok.png"
                                            width="40"
                                            height="40"
                                            alt="TikTok"
                                            style={socialIcon}
                                        />
                                    </Link>
                                </Column>
                            </Row>
                        </Section> */}
                        <Text style={footerSignature}>
                            Laza Dessert Cafe - Making every event sweeter! 🌟
                        </Text>
                    </Section>
                </Section>

            </Body>
        </Html>
    );
};


// Styles
const main = {
    backgroundColor: '#f5f7fa',
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif',
    margin: '0 auto',
    padding: '20px',
    width: '100%',
    maxWidth: '680px',
    lineHeight: '1.6',
};

const container = {
    margin: '0 auto',
    padding: '20px',
    width: '100%',
    maxWidth: '680px',
};

const headerSection = {
    background: 'linear-gradient(135deg, #1B3A6B 0%, #2C4B7E 100%)',
    borderRadius: '24px 24px 0 0',
    padding: '50px 30px',
    textAlign: 'center' as const,
    boxShadow: '0 8px 32px rgba(44, 75, 126, 0.3)',
};

const logo = {
    margin: '0 auto 25px',
    display: 'block',
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
};

const headerTitle = {
    color: '#ffffff',
    fontSize: '34px',
    fontWeight: '700',
    margin: '0 0 15px',
    textAlign: 'center' as const,
    letterSpacing: '-0.8px',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
};

const headerSubtitle = {
    color: 'rgba(255,255,255,0.95)',
    fontSize: '18px',
    margin: '0',
    textAlign: 'center' as const,
    fontWeight: '400',
    letterSpacing: '0.2px',
};

const contentSection = {
    backgroundColor: '#ffffff',
    padding: '45px 35px',
    borderRadius: '0 0 24px 24px',
    boxShadow: '0 8px 32px rgba(44, 75, 126, 0.15)',
};

const thankYouSection = {
    backgroundColor: '#f8fafe',
    padding: '35px 30px',
    borderRadius: '16px',
    marginBottom: '40px',
    textAlign: 'center' as const,
    border: '1px solid rgba(44, 75, 126, 0.1)',
};

const sectionTitle = {
    color: '#1B3A6B',
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 25px 0',
    textAlign: 'center' as const,
    letterSpacing: '-0.5px',
};

const bodyText = {
    color: '#444444',
    fontSize: '16px',
    lineHeight: '1.7',
    margin: '0 0 18px 0',
    textAlign: 'center' as const,
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto',
};

const inquirySection = {
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    padding: '25px',
    borderRadius: '15px',
    border: '2px solid #2C4B7E',
    marginBottom: '40px',
};

const inquiryTitle = {
    color: '#1B3A6B',
    fontSize: '22px',
    textAlign: 'center' as const,
    fontWeight: 'bold',
    margin: '0 0 25px 0',
    letterSpacing: '-0.3px',
};

const detailRow = {
    marginBottom: '20px',
};

const detailColumn = {
    padding: '0 10px',
    textAlign: 'center' as const,
};

const detailItemBox = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(44, 75, 126, 0.15)',
    textAlign: 'center' as const,
    margin: '0 auto',
    boxShadow: '0 2px 8px rgba(44, 75, 126, 0.1)',
};

const detailLabel = {
    color: '#666666',
    fontWeight: '600',
    fontSize: '12px',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    textAlign: 'center' as const,
};

const detailValue = {
    color: '#2C4B7E',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0',
    textAlign: 'center' as const,
};

const contactSection = {
    marginBottom: '40px',
};

const contactRow = {
    marginBottom: '20px',
};

const contactColumn = {
    padding: '0 10px',
    textAlign: 'center' as const,
};

const fieldLabel = {
    color: '#666666',
    fontWeight: '600',
    fontSize: '12px',
    margin: '0 0 10px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    textAlign: 'center' as const,
};

const fieldBox = {
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    boxShadow: '0 2px 8px rgba(44, 75, 126, 0.1)',
    textAlign: 'center' as const,
    margin: '0 auto',
};

const fieldValue = {
    color: '#2C4B7E',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    textAlign: 'center' as const,
};

const nextSection = {
    marginBottom: '40px',
};

const stepRow = {
    marginBottom: '20px',
};

const stepColumn = {
    padding: '0 10px',
};

const stepNumberBox = {
    width: '60px',
    height: '60px',
    backgroundColor: '#2C4B7E',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    textAlign: 'center' as const,
    margin: '0 auto 20px auto',
};

const stepBox = {
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    borderRadius: '15px',
    border: '1px solid rgba(44, 75, 126, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
};

const stepNumber = {
    width: '100%',
    height: '100%',
    textAlign: 'center' as const,
    color: '#2C4B7E',
    fontSize: '24px',
    fontWeight: '700',
};

const stepTitle = {
    color: '#1B3A6B',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    textAlign: 'center' as const,
};

const stepDescription = {
    color: '#2C4B7E',
    fontSize: '14px',
    margin: '0',
    textAlign: 'center' as const,
};

const highlightsSection = {
    marginBottom: '40px',
};

const highlightRow = {
    marginBottom: '20px',
};

const highlightColumn = {
    padding: '0 10px',
};

const highlightBox = {
    textAlign: 'center' as const,
    padding: '15px',
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    borderRadius: '15px',
    border: '1px solid rgba(44, 75, 126, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
};

const highlightImage = {
    borderRadius: '50%',
    marginBottom: '10px',
};

const highlightTitle = {
    color: '#1B3A6B',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    textAlign: 'center' as const,
};

const highlightDescription = {
    color: '#2C4B7E',
    fontSize: '14px',
    margin: '0',
    textAlign: 'center' as const,
};

const contactInfoSection = {
    backgroundColor: 'rgba(44, 75, 126, 0.1)',
    padding: '25px',
    borderRadius: '15px',
    border: '2px solid #2C4B7E',
    textAlign: 'center' as const,
    marginBottom: '30px',
};

const contactInfoTitle = {
    color: '#1B3A6B',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 15px 0',
};

const contactInfoText = {
    color: '#2C4B7E',
    fontSize: '16px',
    margin: '0 0 10px 0',
};

const contactInfoDetails = {
    color: '#1B3A6B',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0',
};

const footerSection = {
    textAlign: 'center' as const,
    padding: '20px',
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    borderRadius: '15px',
};

const footerTitle = {
    color: '#1B3A6B',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 15px 0',
};

const footerText = {
    color: '#2C4B7E',
    fontSize: '14px',
    margin: '0 0 15px 0',
};

const socialRow = {
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    textAlign: 'center' as const,
    width: '100%',
};

const socialColumn = {
    textAlign: 'center' as const,
    display: 'flex',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: '0 20px',
};

const socialIcon = {
    borderRadius: '12px',
    border: '2px solid rgba(44, 75, 126, 0.2)',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 8px rgba(44, 75, 126, 0.15)',
    display: 'block',
    margin: '0 auto',
};

const footerSignature = {
    color: '#888888',
    fontSize: '14px',
    margin: '0',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
};

export default LazaCateringConfirmation; 