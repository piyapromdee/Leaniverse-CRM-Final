# Email System Setup Guide

This guide explains how to set up and use the enhanced email system with SMTP configuration and delay options.

## 🚀 Quick Setup

### 1. Database Migration
First, run the email configuration migration in your Supabase SQL editor:

```sql
-- Run the contents of sql/email_config_migration.sql
-- This creates:
-- - email_config table (SMTP settings)
-- - email_logs table (email activity tracking)
-- - Proper RLS policies for security
```

### 2. Configure SMTP Settings
1. Navigate to **Admin Panel → Email Config**
2. Choose a provider or enter custom SMTP settings
3. Fill in required fields:
   - SMTP Host (e.g., `smtp.gmail.com`)
   - SMTP Port (usually `587` for TLS)
   - Username (your email address)
   - Password (use App Password for Gmail)
   - From Email & Name

### 3. Test Configuration
- Click "Test Email" to verify settings work
- Check console logs for any connection issues

## 📧 Supported Email Providers

### Gmail Setup
1. **Host**: `smtp.gmail.com`
2. **Port**: `587`
3. **Security**: TLS (not SSL)
4. **Username**: Your Gmail address
5. **Password**: Use [App Password](https://support.google.com/accounts/answer/185833), not regular password

### Outlook/Hotmail Setup
1. **Host**: `smtp-mail.outlook.com`
2. **Port**: `587`
3. **Security**: TLS
4. **Username**: Your Outlook email
5. **Password**: Your Outlook password or App Password

### SendGrid Setup
1. **Host**: `smtp.sendgrid.net`
2. **Port**: `587`
3. **Username**: `apikey`
4. **Password**: Your SendGrid API key

## 🎯 Using the Messenger System

### Access the Messenger
Navigate to **Admin Panel → Messenger** to access bulk email functionality.

### Features Available:

#### 1. **User Filtering**
- **Text Search**: Filter by name or email address
- **Tag Filtering**: Select specific user tags
- **Combined Filters**: Use both text and tag filters together
- **Automatic Exclusions**: Disabled users are excluded automatically

#### 2. **User Selection**
- **Individual Selection**: Click checkboxes to select specific users
- **Select All**: Toggle to select/deselect all filtered users
- **Selection Counter**: See how many users are selected in real-time

#### 3. **Email Composition**
- **Subject**: Required field for email subject line
- **Message**: Rich text area with personalization support
- **Personalization**: Use `{name}` to insert recipient's name
- **Delay Settings**: Configure delay between each email (0-60 seconds)

#### 4. **Delay Configuration**
- **Purpose**: Prevent being marked as spam by email providers
- **Range**: 0-60 seconds between emails
- **Time Estimation**: Shows total sending time based on recipient count
- **Recommendations**:
  - 0 seconds: For small batches (< 10 emails)
  - 1-5 seconds: For medium batches (10-50 emails)
  - 5-10 seconds: For large batches (50+ emails)

## 🔧 Technical Features

### SMTP Integration
- **Real SMTP Sending**: Uses nodemailer with your configured SMTP server
- **HTML + Text**: Sends both HTML and plain text versions
- **Error Handling**: Comprehensive error reporting and logging
- **Connection Pooling**: Efficient connection management

### Email Logging
All email activity is logged in the `email_logs` table:
- Recipient information
- Subject and body content
- Success/failure status
- Error messages for failures
- Timestamp and admin who sent

### Security Features
- **Admin-Only Access**: Only administrators can send emails
- **Password Protection**: SMTP passwords are securely stored
- **RLS Policies**: Database-level security for all email data
- **Input Validation**: All email content is validated before sending

## 🛠 Troubleshooting

### Common Issues

#### "Email configuration not found"
- Ensure you've saved SMTP settings in Email Config page
- Check that configuration is marked as active in database

#### "SMTP Connection Failed"
- Verify SMTP host and port are correct
- Check username and password (use App Passwords for Gmail)
- Ensure firewall allows outbound connections on SMTP port

#### "Authentication Failed"
- For Gmail: Use App Password, not regular password
- For Outlook: Enable less secure apps or use App Password
- Verify username is complete email address

#### "Emails marked as spam"
- Increase delay between emails (5-10 seconds recommended)
- Verify SPF/DKIM records for your domain
- Use proper From name and email address
- Avoid spam trigger words in subject/body

### Email Provider Specific Tips

#### Gmail
- **App Passwords**: Required for 2FA-enabled accounts
- **Rate Limits**: Max ~500 emails/day for personal accounts
- **Security**: May require "Less secure app access" for some setups

#### SendGrid
- **API Key**: Use as password with username "apikey"
- **Domain Authentication**: Recommended for deliverability
- **Rate Limits**: Based on your SendGrid plan

## 📊 Monitoring & Analytics

### Email Logs
Monitor email activity through the database:
```sql
-- View recent email activity
SELECT 
  recipient_email,
  subject,
  status,
  sent_at,
  error_message
FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 50;

-- Email success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_logs 
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Performance Monitoring
- Check console logs for SMTP connection issues
- Monitor database for failed email attempts
- Track delivery rates and adjust delay settings accordingly

## 🚨 Production Recommendations

### Security
1. **Environment Variables**: Store SMTP credentials in environment variables
2. **Database Encryption**: Consider encrypting SMTP passwords at rest
3. **Access Control**: Limit admin access to authorized personnel only
4. **Audit Logs**: Monitor email sending activity regularly

### Performance
1. **Batch Processing**: Use appropriate delays for large email batches
2. **Connection Pooling**: Configure nodemailer connection pooling for high volume
3. **Rate Limiting**: Implement API rate limiting to prevent abuse
4. **Queue System**: Consider implementing email queues for very large batches

### Deliverability
1. **Domain Authentication**: Set up SPF, DKIM, and DMARC records
2. **From Address**: Use a consistent, verified from address
3. **Content Quality**: Avoid spam trigger words and maintain good text-to-HTML ratio
4. **List Hygiene**: Regularly clean email lists and handle bounces

---

## 🎉 You're All Set!

Your email system is now ready for production use with:
- ✅ SMTP configuration management
- ✅ Bulk email sending with delays
- ✅ User filtering and selection
- ✅ Email personalization
- ✅ Comprehensive logging and monitoring
- ✅ Security best practices

For additional support or advanced configurations, refer to the nodemailer documentation or your email provider's SMTP setup guides.