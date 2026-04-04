'use client';

import { useState } from 'react';
import { Sidebar, MobileSidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

export function AppShell({ children, userEmail, userName, userRole }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar userRole={userRole} />
      </div>

      {/* Mobile sidebar sheet */}
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} userRole={userRole} />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="content-max p-4 md:p-6 lg:p-8 xl:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
