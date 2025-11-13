import { SignIn } from "@clerk/nextjs"
import { Zap } from "lucide-react"
import { Orbitron } from "next/font/google"

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "700"] })

export default function SignInPage() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className={`${orbitron.className} text-4xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text`}>
            SmartSchema
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          AI-Powered Database Design Assistant
        </p>
      </div>
      <div className="rounded-xl border-2 border-border bg-card shadow-lg p-6 bg-gradient-to-br from-background to-muted/20">
        <SignIn 
          path="/sign-in" 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none border-0 bg-transparent",
              headerTitle: "bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-semibold text-2xl",
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
        />
      </div>
    </div>
  )
}

