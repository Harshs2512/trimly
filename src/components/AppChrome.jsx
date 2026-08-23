"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WorkspaceNavbar from "@/components/WorkspaceNavbar";

export default function AppChrome({ children }) {
  const pathname = usePathname();
  const authRoute = ["/login", "/forgot-password", "/reset-password", "/verify-email", "/resend-verification"].includes(pathname);
  const workspaceRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (authRoute) return <main className="min-h-screen">{children}</main>;
  if (workspaceRoute) return <><WorkspaceNavbar /><main>{children}</main></>;
  return <><Navbar /><main className="flex-grow">{children}</main><Footer /></>;
}
