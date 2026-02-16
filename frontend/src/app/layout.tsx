import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yetebaberut Food Complex',
  description: 'Industrial Food Factory Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>{children}</body>
    </html>
  )
}