"use client";

import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function BrandedHeader({ user }: { user?: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-950 via-gray-900 to-black border-b border-gray-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* VB Logo */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-yellow-400">
            <span className="text-gray-900 font-bold text-lg">VB</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Verified<span className="text-yellow-400">BizLink</span>
            </h1>
            <p className="text-xs text-gray-400 -mt-1">
              Get Verified. Get Trusted. Grow Together.
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
            Contact
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{user.email}</span>
              <Link href="/dashboard">
                <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300">
                  Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white hover:text-yellow-400 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
            <Link
              href="/pricing"
              className="block text-gray-400 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="block text-gray-400 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="block text-gray-400 hover:text-white transition-colors py-2"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>

            {user ? (
              <>
                <div className="text-sm text-gray-400 py-2">{user.email}</div>
                <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 mb-2">
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 mb-2">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
