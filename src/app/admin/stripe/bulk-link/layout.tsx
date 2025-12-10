import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bulk Link Products | Admin',
  description: 'Link unlinked products to Stripe in bulk',
}

export default function BulkLinkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}