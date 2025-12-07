'use server'

import { Resend } from 'resend';
import React from 'react';
import LazaCateringConfirmation from './LazaCateringConfirmation';
import { CateringFormType } from '@/components/OrderForm';
import { JoinUsForm } from '@/app/(home)/join-us/page';

const resend = new Resend(process.env.RESEND_KEY);
import LazaFranchiseInquiry from './LazaFranchiseInquiry';
import LazaFranchiseWaitlistConfirmation from './LazaFranchiseWaitlistConfirmation';
import LazaFranchiseWaitlistNotification from './LazaFranchiseWaitlistNotification';

export async function SendCateringConfirmationEmail(formData: CateringFormType) {
    try {
        // Generate inquiry number and date
        const inquiryNumber = `CATER-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const inquiryDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Prepare email data
        const emailData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            notes: formData.notes,
            eventDate: formData.eventDate,
            eventType: formData.eventType,
            guestCount: formData.guestCount,
            inquiryDate: inquiryDate,
            inquiryNumber: inquiryNumber,
        };

        // Send email to customer
        const { data, error } = await resend.emails.send({
            from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
            to: [formData.email, 'support@lazadessert.cafe'],
            subject: `Catering Inquiry Confirmation - Laza Dessert Cafe`,
            react: React.createElement(LazaCateringConfirmation, { cateringData: emailData }),
        });

        if (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }

        // Also send a copy to the business
        try {
            await resend.emails.send({
                from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
                to: ['catering@lazacafe.com'], // Replace with your actual catering email
                subject: `New Catering Inquiry - Laza Dessert Cafe`,
                react: React.createElement(LazaCateringConfirmation, { cateringData: emailData }),
            });
        } catch (businessEmailError) {
            console.error('Error sending business copy:', businessEmailError);
            // Don't fail the request if business email fails
        }

        return { success: true, inquiryNumber, data };
    } catch (error) {
        console.error('Error in SendCateringConfirmationEmail:', error);
        throw error;
    }
}

export async function SendFranchiseInquiryEmail(formData: JoinUsForm) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
            to: [formData.email, 'support@lazadessert.cafe'],
            subject: `New Franchise Inquiry - ${formData.phone}`,
            react: React.createElement(LazaFranchiseInquiry, { inquiryData: formData }),
        });

        if (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }

    } catch (error) {
        console.error('Error in SendFranchiseInquiryEmail:', error);
        throw error;
    }
}

export async function SendFranchiseWaitlistEmails(waitlistData: { name: string; email: string; submittedAt: Date }) {
    try {
        // Send confirmation email to the user
        const { data: userEmail, error: userError } = await resend.emails.send({
            from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
            to: [waitlistData.email],
            subject: `Welcome to the Laza Franchise Waitlist! 🎉`,
            react: React.createElement(LazaFranchiseWaitlistConfirmation, { waitlistData }),
        });

        if (userError) {
            console.error('Error sending user confirmation email:', userError);
            throw new Error('Failed to send user confirmation email');
        }

        // Send notification email to support
        const { data: supportEmail, error: supportError } = await resend.emails.send({
            from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
            to: ['support@lazadessert.cafe'],
            subject: `New Franchise Waitlist Signup - ${waitlistData.name}`,
            react: React.createElement(LazaFranchiseWaitlistNotification, { waitlistData }),
        });

        if (supportError) {
            console.error('Error sending support notification email:', supportError);
            throw new Error('Failed to send support notification email');
        }

        return {
            success: true,
            userEmailId: userEmail?.id,
            supportEmailId: supportEmail?.id
        };

    } catch (error) {
        console.error('Error in SendFranchiseWaitlistEmails:', error);
        throw error;
    }
}

// // Export notification email functions
// export { sendLowStockAlert, sendLowStockDigest, queueLowStockAlert } from '@/lib/services/emailNotifications';
// export { sendDailySummary } from '@/lib/services/dailySummary';

// @/lib/services/emailNotifications