import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { RemindersProvider } from "@/components/reminders/RemindersProvider";
import { NotificationBell } from "@/components/reminders/NotificationBell";
import { Toaster } from "@/components/reminders/Toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PawPlan - personalised care plans for dogs & cats",
    template: "%s · PawPlan",
  },
  description:
    "Enter your dog's or cat's breed, age and size to get tailored nutrition, vaccine timelines, grooming, growth and training plans - with reminders so you never miss a dose.",
  applicationName: "PawPlan",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
};

function PawLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <ellipse cx="6" cy="9.5" rx="2" ry="2.6" />
      <ellipse cx="10" cy="5.5" rx="2" ry="2.6" />
      <ellipse cx="14.5" cy="5.5" rx="2" ry="2.6" />
      <ellipse cx="18.5" cy="9.5" rx="2" ry="2.6" />
      <path d="M12.2 11c-2.6 0-5.7 3.6-5.7 6.1 0 1.7 1.3 2.6 2.9 2.6 1.2 0 1.9-.6 2.8-.6s1.6.6 2.8.6c1.6 0 2.9-.9 2.9-2.6 0-2.5-3.1-6.1-5.7-6.1Z" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <RemindersProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-background/85 backdrop-blur-md dark:border-stone-800/70">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-full text-lg font-semibold tracking-tight text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:text-stone-100"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-stone-950">
                  <PawLogo />
                </span>
                PawPlan
              </Link>
              <NotificationBell />
            </div>
          </header>

          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>

          <footer className="border-t border-stone-200/70 dark:border-stone-800/70">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:justify-between sm:px-6 dark:text-stone-500">
              <p>PawPlan offers general guidance and is not a substitute for veterinary care.</p>
              <p>Made for curious pet parents.</p>
            </div>
          </footer>
          <Toaster />
        </RemindersProvider>
      </body>
    </html>
  );
}
