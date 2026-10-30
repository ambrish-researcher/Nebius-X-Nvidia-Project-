import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ARISE — Ideas become machines",
  description:
    "Imagine, assemble and understand humanoid, drone and Microduck robots in an interactive 3D learning environment.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
