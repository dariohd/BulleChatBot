import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bulle — Assistant IA pour vos sites",
  description:
    "Chatbot IA autonome et embarquable, adaptable à n'importe quel site web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
