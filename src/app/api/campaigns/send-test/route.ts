import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { brandColors } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }
    
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    
    if (!user || !pass) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured' },
        { status: 500 }
      )
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    await transporter.sendMail({
      from: `"Dummi & Co" <${user}>`,
      to: email,
      subject: 'Test Email from Dummi & Co',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${brandColors.backgroundLight};">
          <div style="max-width: 600px; margin: 0 auto; background-color: ${brandColors.background}; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%); padding: 30px 40px; text-align: center;">
              <img src="${baseUrl}/dummi-co-logo.png" alt="Dummi & Co" style="max-width: 180px; height: auto;">
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <h1 style="color: ${brandColors.text}; font-size: 28px; font-weight: 700; margin-bottom: 20px;">Test Email Successful! 🎉</h1>
              
              <p style="color: ${brandColors.textLight}; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                Great news! Your email configuration is working perfectly.
              </p>
              
              <div style="background-color: ${brandColors.backgroundLight}; border-left: 4px solid ${brandColors.primary}; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: ${brandColors.text};">
                  <strong>✓ Email delivery: Working</strong><br>
                  <strong>✓ Brand template: Applied</strong><br>
                  <strong>✓ Logo: Displaying correctly</strong>
                </p>
              </div>
              
              <p style="color: ${brandColors.textLight}; font-size: 16px; line-height: 1.6;">
                You can now send beautifully branded campaigns to your contacts with confidence.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${baseUrl}/dashboard/campaigns" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Create Your First Campaign
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: ${brandColors.backgroundLight}; padding: 30px 40px; text-align: center; border-top: 1px solid ${brandColors.border};">
              <p style="font-size: 14px; color: ${brandColors.textLight}; margin-bottom: 10px;">
                <strong>Dummi & Co</strong><br>
                Your Success is Our Mission
              </p>
              <p style="font-size: 12px; color: ${brandColors.textLight}; margin-top: 20px;">
                © 2024 Dummi & Co. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: 'Test Email Successful! Your email configuration is working correctly. You can now send campaigns to your contacts.'
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}