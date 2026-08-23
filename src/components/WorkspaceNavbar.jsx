"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import NotificationsMenu from "@/components/NotificationsMenu";

export default function WorkspaceNavbar() {
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Trimlly home"><Image src="/logo.png" width={60} height={50} alt="Trimlly" className="h-11 w-auto object-contain" /></Link>
        <nav className="flex items-center gap-2">
          <Link href="/barbers" className="hidden sm:block"><Button variant="ghost" size="sm">Browse</Button></Link>
          <Link href="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
          {session?.user?.role === "barber" && <Link href="/dashboard/barber" className="hidden md:block"><Button variant="ghost" size="sm">Barber</Button></Link>}
          {session?.user?.role === "admin" && <Link href="/admin"><Button variant="outline" size="sm">Admin</Button></Link>}
          {session && <NotificationsMenu />}
          {session && <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>Log out</Button>}
        </nav>
      </div>
    </header>
  );
}
