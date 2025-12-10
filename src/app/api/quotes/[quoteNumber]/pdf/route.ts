import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

// Helper functions
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Generate PDF for a quote
function generateQuotePDF(quote: {
  quote_number: string
  client_name: string
  client_company: string
  client_email: string
  client_phone?: string
  total_amount: number
  valid_until: string
  created_at: string
  status: string
  items?: QuoteItem[]
  notes?: string
  terms?: string
}): Buffer {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = 20

  // Colors
  const primaryColor: [number, number, number] = [22, 163, 74]
  const darkGray: [number, number, number] = [51, 51, 51]
  const lightGray: [number, number, number] = [128, 128, 128]

  // Header
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Dummi & Co', margin, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('CRM Implementation Services', margin, 33)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('QUOTATION', pageWidth - margin - 45, 25)

  yPos = 55

  // Quote Info
  doc.setTextColor(...darkGray)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Number:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(quote.quote_number, margin + 35, yPos)

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', margin + 80, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(quote.created_at), margin + 95, yPos)

  doc.setFont('helvetica', 'bold')
  doc.text('Valid Until:', margin + 140, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(220, 38, 38)
  doc.text(formatDate(quote.valid_until), margin + 165, yPos)
  doc.setTextColor(...darkGray)

  yPos += 15

  // Bill To Box
  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, yPos, 80, 45, 3, 3, 'FD')

  doc.setTextColor(...primaryColor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', margin + 5, yPos + 8)

  doc.setTextColor(...darkGray)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(quote.client_name, margin + 5, yPos + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightGray)
  if (quote.client_company) {
    doc.text(quote.client_company, margin + 5, yPos + 25)
  }
  doc.text(quote.client_email, margin + 5, yPos + 32)
  if (quote.client_phone) {
    doc.text(quote.client_phone, margin + 5, yPos + 39)
  }

  // From Box
  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(pageWidth - margin - 80, yPos, 80, 45, 3, 3, 'FD')

  doc.setTextColor(...primaryColor)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', pageWidth - margin - 75, yPos + 8)

  doc.setTextColor(...darkGray)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Dummi & Co', pageWidth - margin - 75, yPos + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...lightGray)
  doc.text('info@dummi.co', pageWidth - margin - 75, yPos + 25)
  doc.text('Bangkok, Thailand', pageWidth - margin - 75, yPos + 32)

  yPos += 55

  // Line Items Table
  const items = quote.items || []
  const tableData = items.length > 0
    ? items.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total)
      ])
    : [['CRM Implementation Services', '1', formatCurrency(quote.total_amount), formatCurrency(quote.total_amount)]]

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkGray
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    margin: { left: margin, right: margin }
  })

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Totals
  const totalsX = pageWidth - margin - 80

  doc.setFontSize(10)
  doc.setTextColor(...lightGray)
  doc.text('Subtotal:', totalsX, yPos)
  doc.setTextColor(...darkGray)
  doc.text(formatCurrency(quote.total_amount), totalsX + 55, yPos, { align: 'right' })

  yPos += 8

  doc.setTextColor(...lightGray)
  doc.text('VAT (7%):', totalsX, yPos)
  doc.setTextColor(...darkGray)
  const vat = quote.total_amount * 0.07
  doc.text(formatCurrency(vat), totalsX + 55, yPos, { align: 'right' })

  yPos += 10

  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.5)
  doc.line(totalsX - 5, yPos - 3, pageWidth - margin, yPos - 3)

  doc.setFillColor(...primaryColor)
  doc.roundedRect(totalsX - 10, yPos, 85, 15, 2, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', totalsX, yPos + 10)
  doc.setFontSize(12)
  const grandTotal = quote.total_amount + vat
  doc.text(formatCurrency(grandTotal), totalsX + 70, yPos + 10, { align: 'right' })

  yPos += 30

  // Notes & Terms
  if (quote.notes || quote.terms) {
    doc.setTextColor(...darkGray)
    doc.setFontSize(9)

    if (quote.notes) {
      doc.setFont('helvetica', 'bold')
      doc.text('Notes:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...lightGray)
      const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin)
      doc.text(notesLines, margin, yPos + 6)
      yPos += 6 + (notesLines.length * 5)
    }

    if (quote.terms) {
      yPos += 5
      doc.setTextColor(...darkGray)
      doc.setFont('helvetica', 'bold')
      doc.text('Terms & Conditions:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...lightGray)
      const termsLines = doc.splitTextToSize(quote.terms, pageWidth - 2 * margin)
      doc.text(termsLines, margin, yPos + 6)
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25

  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setTextColor(...lightGray)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' })
  doc.text(
    `This quotation is valid until ${formatDate(quote.valid_until)}. Prices are subject to change after this date.`,
    pageWidth / 2,
    footerY + 6,
    { align: 'center' }
  )
  doc.text('Dummi & Co | info@dummi.co | Bangkok, Thailand', pageWidth / 2, footerY + 12, { align: 'center' })

  // Return as buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteNumber: string }> }
) {
  try {
    const { quoteNumber } = await params

    console.log('📄 [QUOTE PDF] Generating PDF for:', quoteNumber)

    const supabase = await createClient()

    // Fetch quote from database
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_number', quoteNumber)
      .single()

    if (error || !quote) {
      console.error('❌ [QUOTE PDF] Quote not found:', error)
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const pdfBuffer = generateQuotePDF({
      quote_number: quote.quote_number,
      client_name: quote.client_name,
      client_company: quote.client_company,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      total_amount: quote.total_amount,
      valid_until: quote.valid_until,
      created_at: quote.created_at,
      status: quote.status,
      items: quote.items,
      notes: quote.notes,
      terms: quote.terms
    })

    console.log('✅ [QUOTE PDF] PDF generated successfully')

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quoteNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ [QUOTE PDF] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
