import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyCBCT by 360 Visualise",
  description:
    "CBCT scan referrals, scans and reports for referring dentists. By 360 Visualise.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
