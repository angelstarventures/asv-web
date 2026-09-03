import type { Metadata, Viewport } from "next";
import { Playfair_Display, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/useAuth";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

// Playfair Display (headings) + Manrope (body/UI/tables). Applied globally: Manrope via
// --font-sans (globals.css's @theme inline), Playfair Display via --font-heading, targeted at
// h1-h6 site-wide in globals.css rather than touching every component individually. Base font
// size is also bumped up site-wide in globals.css (html { font-size }), so both fonts render
// larger than the previous Fraunces/Inter pairing at every Tailwind text-* size.
const playfairDisplay = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AngelStar Ventures",
  description: "AngelStar Ventures member portal: portfolio, ledger, and deal flow.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AngelStar",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c2520",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
