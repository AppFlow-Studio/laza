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
import { JoinUsForm } from '@/app/(home)/join-us/page';

interface FranchiseInquiryData {
    // Contact & Basics
    fullName: string;
    email: string;
    phone: string;
    cityState: string;
    // Motivation & Alignment
    whyDessertCafe: string;
    brandValue: string;
    menuFamiliarity: string;
    // Experience & Skill Set
    foodServiceExp: string;
    foodServiceExpDesc?: string;
    frontOfHouse: string;
    foodCert: string;
    // Financial Readiness
    liquidCapital: string;
    netWorth: string;
    fundingSource: string;
    preQualified: string;
    // Timeframe & Commitment
    timeline: string;
    fullTime: string;
    locationsHoped: string;
    relocate: string;
    // Due-Diligence Indicators
    fddReviewed: string;
    questions: string;
    howHeard: string;
    // Final Check
    commitment: string;
    anythingElse?: string;
    // Generated fields
}

export const LazaFranchiseInquiry: React.FC<{ inquiryData: JoinUsForm }> = ({ inquiryData }) => {
    return (
        <Html>
            <Head />
            <Preview>Franchise Inquiry Received - {inquiryData.phone}</Preview>
            <Body style={main}>
                {/* Header Section */}
                <Section style={headerSection}>
                    <Img
                        src="https://lazadessert.cafe/lazabluelogo.png"
                        width="150"
                        height="auto"
                        alt="Laza Dessert Cafe"
                        style={logo}
                    />
                    <Heading style={headerTitle}>
                        Franchise Inquiry Received!
                    </Heading>
                    <Text style={headerSubtitle}>
                        Thank you for your interest in joining the Laza family
                    </Text>
                </Section>

                {/* Main Content */}
                <Section style={contentSection}>
                    {/* Thank You Message */}
                    <Section style={thankYouSection}>
                        <Heading style={sectionTitle}>
                            Welcome to the Laza Family, {inquiryData.fullName}! 👋
                        </Heading>
                        <Text style={bodyText}>
                            We're excited to receive your franchise inquiry and look forward to exploring this opportunity with you!
                        </Text>
                        <Text style={bodyText}>
                            Our franchise development team will carefully review your information and reach out within 48 hours to discuss next steps.
                        </Text>
                    </Section>

                    {/* Inquiry Details */}
                    <Section style={inquirySection}>
                        <Heading style={inquiryTitle}>📋 Inquiry Details</Heading>
                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Inquiry Date:</Text>
                            <Text style={detailValue}>{new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</Text>
                        </Section>
                    </Section>

                    {/* Contact Information */}
                    <Section style={contactSection}>
                        <Heading style={sectionTitle}>Contact Information</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Full Name</Text>
                            <Text style={fieldAnswer}>{inquiryData.fullName}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Email</Text>
                            <Text style={fieldAnswer}>{inquiryData.email}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Phone</Text>
                            <Text style={fieldAnswer}>{inquiryData.phone}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>City & State</Text>
                            <Text style={fieldAnswer}>{inquiryData.cityState}</Text>
                        </Section>
                    </Section>

                    {/* Motivation & Alignment */}
                    <Section style={motivationSection}>
                        <Heading style={sectionTitle}>Motivation & Brand Alignment</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Why Laza Dessert Cafe?</Text>
                            <Text style={fieldAnswer}>{inquiryData.whyDessertCafe}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Brand Values Important to You</Text>
                            <Text style={fieldAnswer}>{inquiryData.brandValue}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Menu Familiarity</Text>
                            <Text style={fieldAnswer}>{inquiryData.menuFamiliarity}</Text>
                        </Section>
                    </Section>

                    {/* Experience & Skills */}
                    <Section style={experienceSection}>
                        <Heading style={sectionTitle}>Experience & Skill Set</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Food Service Experience</Text>
                            <Text style={fieldAnswer}>{inquiryData.foodServiceExp}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Food Safety Certification</Text>
                            <Text style={fieldAnswer}>{inquiryData.foodCert}</Text>
                        </Section>

                        {inquiryData.foodServiceExpDesc && (
                            <Section style={fieldContainer}>
                                <Text style={fieldLabel}>Experience Description</Text>
                                <Text style={fieldAnswer}>{inquiryData.foodServiceExpDesc}</Text>
                            </Section>
                        )}

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Front of House Experience</Text>
                            <Text style={fieldAnswer}>{inquiryData.frontOfHouse}</Text>
                        </Section>
                    </Section>

                    {/* Financial Readiness */}
                    <Section style={financialSection}>
                        <Heading style={sectionTitle}>Financial Readiness</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Liquid Capital</Text>
                            <Text style={fieldAnswer}>{inquiryData.liquidCapital}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Net Worth</Text>
                            <Text style={fieldAnswer}>{inquiryData.netWorth}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Funding Source</Text>
                            <Text style={fieldAnswer}>{inquiryData.fundingSource}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Pre-Qualified for Financing</Text>
                            <Text style={fieldAnswer}>{inquiryData.preQualified}</Text>
                        </Section>
                    </Section>

                    {/* Timeframe & Commitment */}
                    <Section style={timeframeSection}>
                        <Heading style={sectionTitle}>Timeframe & Commitment</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Timeline to Open</Text>
                            <Text style={fieldAnswer}>{inquiryData.timeline}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Full-Time Commitment</Text>
                            <Text style={fieldAnswer}>{inquiryData.fullTime}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Desired Locations</Text>
                            <Text style={fieldAnswer}>{inquiryData.locationsHoped}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Willing to Relocate</Text>
                            <Text style={fieldAnswer}>{inquiryData.relocate}</Text>
                        </Section>
                    </Section>

                    {/* Due Diligence */}
                    <Section style={diligenceSection}>
                        <Heading style={sectionTitle}>Due Diligence & Research</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>FDD Review Status</Text>
                            <Text style={fieldAnswer}>{inquiryData.fddReviewed}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>How You Heard About Us</Text>
                            <Text style={fieldAnswer}>{inquiryData.howHeard}</Text>
                        </Section>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Questions for Us</Text>
                            <Text style={fieldAnswer}>{inquiryData.questions}</Text>
                        </Section>
                    </Section>

                    {/* Commitment */}
                    <Section style={commitmentSection}>
                        <Heading style={sectionTitle}>Commitment & Additional Information</Heading>

                        <Section style={fieldContainer}>
                            <Text style={fieldLabel}>Commitment Level</Text>
                            <Text style={fieldAnswer}>{inquiryData.commitment}</Text>
                        </Section>

                        {inquiryData.anythingElse && (
                            <Section style={fieldContainer}>
                                <Text style={fieldLabel}>Additional Information</Text>
                                <Text style={fieldAnswer}>{inquiryData.anythingElse}</Text>
                            </Section>
                        )}
                    </Section>

                    {/* Next Steps */}
                    <Section style={nextStepsSection}>
                        <Heading style={sectionTitle}>What Happens Next?</Heading>
                        <Row style={stepRow}>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>1</Text>
                                    <Heading style={stepTitle}>Review Your Profile</Heading>
                                    <Text style={stepDescription}>
                                        Our franchise team will carefully review your qualifications and experience
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>2</Text>
                                    <Heading style={stepTitle}>Initial Consultation</Heading>
                                    <Text style={stepDescription}>
                                        We'll schedule a call to discuss your goals and answer your questions
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={stepColumn}>
                                <Section style={stepBox}>
                                    <Text style={stepNumber}>3</Text>
                                    <Heading style={stepTitle}>Franchise Disclosure</Heading>
                                    <Text style={stepDescription}>
                                        If qualified, we'll provide detailed franchise information and next steps
                                    </Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section>

                    {/* Why Choose Laza */}
                    {/* <Section style={highlightsSection}>
                        <Heading style={sectionTitle}>Why Choose Laza Franchising?</Heading>
                        <Row style={highlightRow}>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox}>
                                    <Img
                                        src="https://lazadessert.cafe/desserts/kunafa.jpg"
                                        width="60"
                                        height="60"
                                        alt="Proven Concept"
                                        style={highlightImage}
                                    />
                                    <Heading style={highlightTitle}>Proven Concept</Heading>
                                    <Text style={highlightDescription}>Established brand with loyal customer base</Text>
                                </Section>
                            </Column>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox}>
                                    <Img
                                        src="https://lazadessert.cafe/desserts/crepe.jpg"
                                        width="60"
                                        height="60"
                                        alt="Comprehensive Support"
                                        style={highlightImage}
                                    />
                                    <Heading style={highlightTitle}>Comprehensive Support</Heading>
                                    <Text style={highlightDescription}>Training, marketing, and operational guidance</Text>
                                </Section>
                            </Column>
                            <Column style={highlightColumn}>
                                <Section style={highlightBox}>
                                    <Img
                                        src="https://lazadessert.cafe/drinks/ferroshake.jpg"
                                        width="60"
                                        height="60"
                                        alt="Growing Market"
                                        style={highlightImage}
                                    />
                                    <Heading style={highlightTitle}>Growing Market</Heading>
                                    <Text style={highlightDescription}>Expanding dessert and cafe industry</Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section> */}

                    {/* Contact Information */}
                    <Section style={contactInfoSection}>
                        <Heading style={contactInfoTitle}>📞 Ready to Take the Next Step?</Heading>
                        <Text style={contactInfoText}>
                            If you have any urgent questions, feel free to contact our franchise team directly:
                        </Text>
                        <Text style={contactInfoDetails}>
                            📧 support@lazadessert.cafe | 📱 (555) 123-4567
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footerSection}>
                        <Text style={footerTitle}>
                            Welcome to the Laza Family! 🚀
                        </Text>
                        <Text style={footerText}>
                            We look forward to helping you bring the sweet taste of Laza to your community.
                        </Text>
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
                                    <Link href="https://www.tiktok.com/@lazacafe">
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
                            Laza Dessert Cafe - Building Sweet Success Together! 🌟
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
    maxWidth: '720px',
    lineHeight: '1.6',
};

const container = {
    margin: '0 auto',
    padding: '20px',
    width: '100%',
    maxWidth: '720px',
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
    fontSize: '36px',
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
    padding: '50px 40px',
    borderRadius: '0 0 24px 24px',
    boxShadow: '0 8px 32px rgba(44, 75, 126, 0.15)',
    lineHeight: '1.6',
};

const thankYouSection = {
    backgroundColor: '#f8fafe',
    padding: '40px 35px',
    borderRadius: '20px',
    marginBottom: '45px',
    textAlign: 'center' as const,
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
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
    padding: '20px',
    borderRadius: '20px',
    border: '2px solid #2C4B7E',
    marginBottom: '45px',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.12)',
};

const inquiryTitle = {
    color: '#1B3A6B',
    fontSize: '22px',
    textAlign: 'center' as const,
    fontWeight: '700',
    margin: '0 0 25px 0',
    letterSpacing: '-0.3px',
};

const detailRow = {
    marginBottom: '20px',
    display: 'flex',
    width: '100%',
};

const detailColumn = {
    padding: '0 10px',
    textAlign: 'center' as const,
};

const detailColumnCentered = {
    width: '100%',
    textAlign: 'center' as const,
    display: 'flex',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
};

const detailItemBox = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '25px',
    borderRadius: '16px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    textAlign: 'center' as const,
    margin: '0 auto',
    boxShadow: '0 4px 16px rgba(44, 75, 126, 0.15)',
    maxWidth: '300px',
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
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const contactRow = {
    marginBottom: '30px',
    display: 'flex',
    width: '100%',
    gap: '20px',
};

const contactRowCentered = {
    marginBottom: '30px',
    display: 'flex',
    width: '100%',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
};

const contactColumn = {
    flex: '1',
    padding: '0 15px',
    textAlign: 'center' as const,
};

const contactColumnFull = {
    width: '100%',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '0 20px',
};

const fieldLabel = {
    color: '#666666',
    fontWeight: '600',
    fontSize: '13px',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    textAlign: 'center' as const,
};

const fieldBox = {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '14px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    boxShadow: '0 4px 12px rgba(44, 75, 126, 0.1)',
    textAlign: 'center' as const,
    margin: '0 auto',
    maxWidth: '650px',
    width: '100%',
    minHeight: '24px',
};

const fieldValue = {
    color: '#2C4B7E',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    textAlign: 'center' as const,
};

const fieldContainer = {
    marginBottom: '25px',
    textAlign: 'center' as const,
};

const fieldAnswer = {
    color: '#2C4B7E',
    fontSize: '18px',
    fontWeight: '600',
    margin: '8px 0 0 0',
    textAlign: 'center' as const,
    padding: '10px 10px',
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    borderRadius: '12px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 2px 8px rgba(44, 75, 126, 0.08)',
};

const motivationSection = {
    backgroundColor: '#f8fafe',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const experienceSection = {
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.12)',
};

const financialSection = {
    backgroundColor: '#f8fafe',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const timeframeSection = {
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.12)',
};

const diligenceSection = {
    backgroundColor: '#f8fafe',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const commitmentSection = {
    backgroundColor: 'rgba(44, 75, 126, 0.05)',
    padding: '20px',
    borderRadius: '20px',
    marginBottom: '45px',
    border: '2px solid rgba(44, 75, 126, 0.15)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.12)',
};

const nextStepsSection = {
    backgroundColor: '#ffffff',
    padding: '40px 35px',
    marginBottom: '45px',
    borderRadius: '20px',
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const stepRow = {
    marginTop: '25px',
    display: 'flex',
    width: '100%',
};

const stepColumn = {
    width: '33.33%',
    padding: '0 12px',
};

const stepBox = {
    backgroundColor: '#f8fafe',
    borderRadius: '16px',
    padding: '25px 20px',
    textAlign: 'center' as const,
    border: '2px solid rgba(44, 75, 126, 0.1)',
    height: '100%',
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
    color: '#2C4B7E',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 12px 0',
    letterSpacing: '-0.2px',
};

const stepDescription = {
    color: '#666666',
    fontSize: '14px',
    margin: '0',
    lineHeight: '1.6',
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
};

const highlightDescription = {
    color: '#2C4B7E',
    fontSize: '14px',
    margin: '0',
};

const contactInfoSection = {
    backgroundColor: '#f8fafe',
    borderRadius: '20px',
    padding: '40px 35px',
    marginBottom: '45px',
    textAlign: 'center' as const,
    border: '2px solid rgba(44, 75, 126, 0.1)',
    boxShadow: '0 6px 20px rgba(44, 75, 126, 0.08)',
};

const contactInfoTitle = {
    color: '#2C4B7E',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 18px 0',
    letterSpacing: '-0.3px',
};

const contactInfoText = {
    color: '#444444',
    fontSize: '16px',
    margin: '0 0 12px 0',
    lineHeight: '1.6',
};

const contactInfoDetails = {
    color: '#2C4B7E',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
    letterSpacing: '0.2px',
};

const footerSection = {
    background: 'linear-gradient(135deg, #2C4B7E 0%, #1a3458 100%)',
    borderRadius: '16px 16px 0 0',
    padding: '40px 30px',
    textAlign: 'center' as const,
    marginTop: '30px',
};

const footerTitle = {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 18px 0',
    letterSpacing: '-0.3px',
};

const footerText = {
    color: '#ffffff',
    fontSize: '16px',
    margin: '0 0 30px 0',
    opacity: 0.95,
    lineHeight: '1.6',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
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
    border: '2px solid rgba(255, 255, 255, 0.2)',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    display: 'block',
    margin: '0 auto',
};

const footerSignature = {
    color: '#ffffff',
    fontSize: '14px',
    margin: '0',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    opacity: 0.9,
};

export default LazaFranchiseInquiry; 