# Franchise Waitlist Email System

This directory contains the franchise waitlist page for the Laza Dessert Cafe. The email system is integrated with the existing Resend setup in the `/email` directory.

## Files

- `page.tsx` - The main waitlist page component
- `README.md` - This documentation file

## Email Integration

The waitlist system uses the existing email infrastructure:
- `../email/LazaFranchiseWaitlistConfirmation.tsx` - User confirmation email template
- `../email/LazaFranchiseWaitlistNotification.tsx` - Support notification email template
- `../email/index.ts` - Contains the `SendFranchiseWaitlistEmails` function

## Email Templates

### 1. Support Notification Email
Sent to `support@lazadessert.cafe` when someone joins the waitlist.

**Features:**
- Professional design with Laza branding
- Contact information (name, email, timestamp)
- Next steps checklist
- Direct reply button
- Mobile-responsive layout

### 2. User Confirmation Email
Sent to the person who joined the waitlist.

**Features:**
- Welcoming design with Laza branding
- Personalized greeting
- Information about next steps
- Current location details
- Social media links
- Mobile-responsive layout

## Setup Instructions

The franchise waitlist email system is already integrated with your existing Resend setup. No additional configuration is needed!

### Current Setup

✅ **Resend Integration:** Uses your existing `RESEND_KEY` environment variable  
✅ **Email Templates:** Professional React email components  
✅ **Automatic Sending:** Both confirmation and notification emails are sent  
✅ **Error Handling:** Graceful fallback if emails fail  

### Environment Variables

Make sure you have your Resend API key set in `.env.local`:
```
RESEND_KEY=your_resend_api_key_here
```

### Email Flow

1. **User submits waitlist form**
2. **System sends two emails:**
   - Confirmation email to the user
   - Notification email to support@lazadessert.cafe
3. **User sees success message**

## Testing

1. **View Email Templates:**
   - Submit the waitlist form
   - Check the console logs for the email content
   - The emails are logged in both HTML and text formats

2. **Test with Real Emails:**
   - Set up Resend or your preferred email service
   - Submit the form with a real email address
   - Check both your support email and the user's email

## Customization

### Email Content
Edit the templates in `email-templates.ts`:
- Update branding colors
- Modify messaging
- Add/remove sections
- Change contact information

### Styling
The emails use inline CSS for maximum compatibility:
- Responsive design
- Dark mode support
- Cross-client compatibility

### Branding
Update these elements:
- Logo URL: `https://lazadessert.cafe/lazabluelogo.png`
- Brand colors: `#2C4B7E` (primary), `#1B3A6B` (secondary)
- Contact information
- Social media links

## Security Considerations

1. **Rate Limiting:** Implement rate limiting to prevent spam
2. **Validation:** Validate email addresses and names
3. **Sanitization:** Sanitize user input before sending
4. **API Keys:** Keep email service API keys secure
5. **Domain Verification:** Verify your sending domain

## Monitoring

Consider implementing:
- Email delivery tracking
- Open rate monitoring
- Bounce handling
- Unsubscribe functionality
- Analytics for waitlist signups

## Future Enhancements

- Database storage for waitlist members
- Email preferences management
- Automated follow-up sequences
- Integration with CRM systems
- A/B testing for email content
