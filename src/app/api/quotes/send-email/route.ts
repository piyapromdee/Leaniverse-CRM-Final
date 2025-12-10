import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

// Generate HTML email template for quote
const generateQuoteEmailHtml = (
  quote: {
    quote_number: string
    client_name: string
    total_amount: number
    valid_until: string
    items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>
  },
  message: string
) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const formattedAmount = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(quote.total_amount)

  const validUntilDate = new Date(quote.valid_until).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Generate items table if items exist
  let itemsTable = ''
  if (quote.items && quote.items.length > 0) {
    itemsTable = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Description</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map(item => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${item.description}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">฿${item.unit_price.toLocaleString()}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">฿${item.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background-color: #f8f9fa;">
            <td colspan="3" style="padding: 12px; text-align: right;">Total Amount:</td>
            <td style="padding: 12px; text-align: right; color: #16a34a;">${formattedAmount}</td>
          </tr>
        </tfoot>
      </table>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background-color: #16a34a; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="${baseUrl}/dummi-co-logo.png" alt="Dummi & Co" style="max-width: 150px; height: auto;" />
          <h1 style="color: white; margin: 15px 0 0 0; font-size: 24px;">Quotation</h1>
        </div>

        <!-- Content -->
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Dear ${quote.client_name},
          </p>

          <p style="font-size: 14px; color: #555; line-height: 1.6; white-space: pre-wrap;">
            ${message}
          </p>

          <!-- Quote Details Box -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Quote Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Quote Number:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">${quote.quote_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Total Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #16a34a; font-size: 18px;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Valid Until:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">${validUntilDate}</td>
              </tr>
            </table>
          </div>

          ${itemsTable}

          <!-- Contact CTA -->
          <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #166534;">
              <strong>Ready to proceed?</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: #166534;">
              Reply to this email or contact us at <a href="mailto:info@dummi.co" style="color: #16a34a; font-weight: bold;">info@dummi.co</a>
            </p>
          </div>

          <p style="font-size: 14px; color: #555; line-height: 1.6;">
            If you have any questions about this quotation, please don't hesitate to contact us.
          </p>

          <p style="font-size: 14px; color: #555; margin-top: 25px;">
            Best regards,<br/>
            <strong>Dummi & Co Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Dummi & Co Administration</p>
          <p>This quotation is valid until ${validUntilDate}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const { quoteId, to, subject, message, quoteData } = await request.json()

    console.log('📨 [QUOTE EMAIL] Request received:', {
      quoteId,
      to,
      subject: subject?.substring(0, 50) + '...'
    })

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Email recipient and subject are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Check Gmail credentials
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD

    if (!user || !pass) {
      console.error('❌ [QUOTE EMAIL] Gmail credentials not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // If quoteId provided, fetch quote from database
    let quote = quoteData
    if (quoteId && !quote) {
      const { data: dbQuote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single()

      if (quoteError || !dbQuote) {
        console.error('❌ [QUOTE EMAIL] Quote not found:', quoteError)
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        )
      }
      quote = dbQuote
    }

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote data is required' },
        { status: 400 }
      )
    }

    // Generate email HTML
    const emailHtml = generateQuoteEmailHtml(
      {
        quote_number: quote.quote_number,
        client_name: quote.client_name,
        total_amount: quote.total_amount,
        valid_until: quote.valid_until,
        items: quote.items
      },
      message || `Thank you for your interest in our services. Please find your quotation details below.`
    )

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })

    // Send email
    console.log('📧 [QUOTE EMAIL] Sending to:', to)
    const info = await transporter.sendMail({
      from: `"Dummi & Co" <${user}>`,
      to: to,
      subject: subject,
      html: emailHtml,
      replyTo: user
    })

    console.log('✅ [QUOTE EMAIL] Email sent successfully:', info.messageId)

    // Update quote status in database if quoteId provided
    if (quoteId) {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId)

      if (updateError) {
        console.warn('⚠️ [QUOTE EMAIL] Failed to update quote status:', updateError)
      } else {
        console.log('✅ [QUOTE EMAIL] Quote status updated to sent')
      }
    }

    // Log the email send activity
    try {
      await supabase.from('email_logs').insert({
        type: 'quote',
        reference_id: quoteId,
        to_email: to,
        subject: subject,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
    } catch (logError) {
      // Email logs table might not exist, that's okay
      console.log('📝 [QUOTE EMAIL] Could not log email (table may not exist)')
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Quote sent successfully to ${to}`
    })

  } catch (error) {
    console.error('❌ [QUOTE EMAIL] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send quote email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
