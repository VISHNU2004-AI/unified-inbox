import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Unified Inbox | AI-Powered Multi-Channel Customer Messaging',
  description: 'Connect WhatsApp, Instagram, Facebook Messenger, and Live Chat into one AI-powered unified inbox. Automated multilingual responses in Hindi, English, and Hinglish with human review control.',
  keywords: ['unified inbox', 'whatsapp business', 'instagram dm', 'messenger', 'ai customer support', 'hinglish ai', 'saas inbox'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
