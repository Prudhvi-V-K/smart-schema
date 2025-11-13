import type React from "react"
import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "AI Schema Generator",
  description: "Generate database schemas with AI-powered insights",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg border-2",
          headerTitle: "bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-semibold",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton: "border-border hover:bg-accent transition-colors",
          socialButtonsBlockButtonText: "font-medium",
          formButtonPrimary: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all",
          formFieldLabel: "text-foreground font-medium",
          formFieldInput: "border-border focus:border-primary focus:ring-primary",
          footerActionLink: "text-primary hover:text-primary/80 font-medium",
          identityPreviewText: "text-foreground",
          identityPreviewEditButton: "text-primary hover:text-primary/80",
          formResendCodeLink: "text-primary hover:text-primary/80",
          otpCodeFieldInput: "border-border focus:border-primary focus:ring-primary",
          alertText: "text-foreground",
        },
        variables: {
          colorPrimary: "hsl(275, 70%, 50%)",
          colorText: "hsl(var(--foreground))",
          colorTextSecondary: "hsl(var(--muted-foreground))",
          colorBackground: "hsl(var(--background))",
          colorInputBackground: "hsl(var(--input))",
          colorInputText: "hsl(var(--foreground))",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.className} ${geistMono.variable} antialiased`}>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
