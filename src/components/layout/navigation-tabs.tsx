'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Users, User } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/network', label: 'Network', icon: Users },
  { href: '/dashboard', label: 'Dashboard', icon: User },
];

export function NavigationTabs() {
  const pathname = usePathname();

  // Don't show on auth pages
  if (pathname?.includes('/login') || pathname?.includes('/signup') || pathname?.includes('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-3 px-4 flex-1 transition-colors ${
                isActive
                  ? 'text-blue-600 border-t-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
