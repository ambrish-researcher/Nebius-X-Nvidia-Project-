import type { Metadata } from "next";
import SiteBackground from "../components/site-background";
import "./globals.css";
export const metadata: Metadata = {
  title: "ARISE — Ideas become machines",
  description:
    "Explore Vera Rubin, Jetson Thor T5000 and Microduck through interactive, step-by-step 3D engineering simulations.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteBackground />
        {children}
      </body>
    </html>
  );
}
