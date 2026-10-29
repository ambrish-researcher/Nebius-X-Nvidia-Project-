import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ARISE — Ideas become machines",
  description:
    "A continuous robotics engineering laboratory. Explore robot construction, learn component mechanics, compare compute architectures, and run real MuJoCo experiments.",
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
