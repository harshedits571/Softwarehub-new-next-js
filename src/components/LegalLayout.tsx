"use client";

import React from "react";
import Link from "next/link";

interface LegalLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 relative overflow-hidden selection:bg-brand-500/30 selection:text-white flex flex-col justify-between">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-[10%] w-[40rem] h-[40rem] bg-indigo-900/5 rounded-full blur-[12rem]"></div>
        <div className="absolute bottom-0 right-[10%] w-[40rem] h-[40rem] bg-purple-900/5 rounded-full blur-[12rem]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-8 max-w-[1200px] mx-auto w-full">
        <div className="glass-card !rounded-full px-6 py-2.5 flex justify-between items-center w-full bg-[#0f0f15]/80 border border-white/5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold tracking-tighter text-white hover:scale-105 transition-all text-lg">
              Harsh<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Edits</span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-medium text-xs text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-5 py-2 rounded-full border border-white/10 transition-all">
              Back to Hub
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-[900px] mx-auto w-full relative z-10 flex-1">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter">
            {title}
          </h1>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10 w-full">
        <p>&copy; {new Date().getFullYear()} Harsh Edits. All rights reserved.</p>
      </footer>
    </div>
  );
};
