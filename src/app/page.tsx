"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show content after a brief delay for smooth animation
    const showTimer = setTimeout(() => setShowContent(true), 100);

    // Start fade out animation
    const fadeTimer = setTimeout(() => setFadeOut(true), 2500);

    // Navigate to home after animation completes
    const navTimer = setTimeout(() => router.push("/home"), 3200);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <main className={`min-h-screen bg-black text-white flex flex-col items-center justify-center transition-opacity duration-500 ${
      fadeOut ? "opacity-0" : "opacity-100"
    }`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className={`text-center space-y-8 transition-all duration-1000 ${
        showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}>
        {/* Logo/Icon */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
            <span className="text-4xl">💃</span>
          </div>
          <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-3xl blur-xl animate-pulse"></div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-wider bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            Bollywood Beatz
          </h1>
          <p className="text-xl text-neutral-400 font-light tracking-wide">
            Dance Attendance App
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-200"></div>
          </div>
          <p className="text-sm text-neutral-500 animate-pulse">
            Loading your dance studio...
          </p>
        </div>

        {/* Tagline */}
        <div className="pt-8">
          <p className="text-neutral-500 text-sm animate-fade-in">
            Track attendance • Award points • Celebrate achievements
          </p>
        </div>
      </div>
    </main>
  );
}
