'use client';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import './globals.css';
import Navbar from './components/Navbar';
import ToasterProvider from './components/ToasterProvider';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress hydration warnings in development
    if (process.env.NODE_ENV === 'development') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (/React hydration/.test(args[0])) {
          return;
        }
        originalConsoleError(...args);
      };
    }
  }, []);

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          
          <Navbar />
          {children}
           <ToasterProvider />
          
          </SessionProvider>
      </body>
    </html>
  );
}