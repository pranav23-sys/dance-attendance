import "./globals.css";

export const metadata = {
  title: "Bollywood Beatz",
  description: "Dance class attendance, points, and awards",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  minimumScale: 0.5,
  userScalable: true, // Enable pinch-to-zoom for accessibility
  viewportFit: 'cover', // Better mobile viewport handling
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <div id="toast-root" />
      </body>
    </html>
  );
}
