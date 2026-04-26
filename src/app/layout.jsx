// app/layout.jsx
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Trimly - Skip the wait",
  description: "Trimly - smart queue & booking for barbers"
};

import Providers from "@/components/Providers";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          <Navbar />
          <main className=" ">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
