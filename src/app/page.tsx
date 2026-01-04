"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [logoRotation, setLogoRotation] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show content after a brief delay for smooth animation
    const showTimer = setTimeout(() => setShowContent(true), 200);

    // Start particle effects
    const particleTimer = setTimeout(() => setShowParticles(true), 500);

    // Start logo rotation
    const rotationInterval = setInterval(() => {
      setLogoRotation(prev => (prev + 1) % 360);
    }, 50);

    // Start fade out animation
    const fadeTimer = setTimeout(() => setFadeOut(true), 4000);

    // Navigate to home after animation completes
    const navTimer = setTimeout(() => router.push("/home"), 4700);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(particleTimer);
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
      clearInterval(rotationInterval);
    };
  }, [router]);

  return (
    <main className={`min-h-screen bg-black text-white flex flex-col items-center justify-center transition-all duration-1000 ${
      fadeOut ? "opacity-0 scale-110" : "opacity-100 scale-100"
    }`}>
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs with different animations */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-pink-500/15 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-ping delay-500"></div>

        {/* Rotating rings */}
        <div className="absolute top-1/3 right-1/3 w-20 h-20 border-2 border-orange-400/30 rounded-full animate-spin"></div>
        <div className="absolute bottom-1/3 left-1/3 w-16 h-16 border border-pink-400/40 rounded-full animate-spin delay-700" style={{animationDirection: 'reverse'}}></div>

        {/* Floating particles */}
        {showParticles && (
          <>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Main content with enhanced animations */}
      <div className={`text-center space-y-8 transition-all duration-1500 ${
        showContent ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"
      }`}>
        {/* Enhanced Logo/Icon */}
        <div className="relative">
          <div
            className="w-28 h-28 mx-auto bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden transition-all duration-1000"
            style={{
              transform: `rotate(${logoRotation}deg) scale(${showContent ? 1 : 0.5})`,
              background: `linear-gradient(${logoRotation * 2}deg, #ff8c1a, #ec4899, #a855f7)`
            }}
          >
            <img
              src="/icon-512.png"
              alt="Bollywood Beatz Logo"
              className="w-full h-full object-contain animate-pulse"
              style={{ transform: `rotate(${-logoRotation}deg)` }}
            />
          </div>

          {/* Multiple glow effects */}
          <div className="absolute -inset-6 bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-purple-500/30 rounded-3xl blur-2xl animate-pulse"></div>
          <div className="absolute -inset-8 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-3xl blur-3xl animate-ping delay-300"></div>

          {/* Rotating border */}
          <div className="absolute inset-0 rounded-3xl border-2 border-gradient-to-r from-orange-400/50 to-pink-400/50 animate-spin" style={{animationDuration: '3s'}}></div>
        </div>

        {/* Enhanced Title with wave effect */}
        <div className="space-y-3">
          <h1 className="text-6xl font-bold tracking-wider bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            <span className="inline-block animate-bounce delay-100">B</span>
            <span className="inline-block animate-bounce delay-200">o</span>
            <span className="inline-block animate-bounce delay-300">l</span>
            <span className="inline-block animate-bounce delay-400">l</span>
            <span className="inline-block animate-bounce delay-500">y</span>
            <span className="inline-block animate-bounce delay-600">w</span>
            <span className="inline-block animate-bounce delay-700">o</span>
            <span className="inline-block animate-bounce delay-800">o</span>
            <span className="inline-block animate-bounce delay-900">d</span>
            <span className="inline-block animate-bounce delay-1000"> </span>
            <span className="inline-block animate-bounce delay-1100">B</span>
            <span className="inline-block animate-bounce delay-1200">e</span>
            <span className="inline-block animate-bounce delay-1300">a</span>
            <span className="inline-block animate-bounce delay-1400">t</span>
            <span className="inline-block animate-bounce delay-1500">z</span>
          </h1>
          <p className="text-xl text-neutral-400 font-light tracking-wide animate-fade-in delay-1000">
            Dance Attendance App
          </p>
        </div>

        {/* Enhanced Loading Indicator */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>

            {/* Inner pulsing dots */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>

          <p className="text-sm text-neutral-500 animate-pulse delay-500">
            Loading your dance studio...
          </p>
        </div>

        {/* Enhanced Tagline with typing effect */}
        <div className="pt-8">
          <p className="text-neutral-500 text-sm font-medium tracking-wider animate-fade-in delay-1500">
            <span className="animate-pulse delay-1600">T</span>
            <span className="animate-pulse delay-1650">r</span>
            <span className="animate-pulse delay-1700">a</span>
            <span className="animate-pulse delay-1750">c</span>
            <span className="animate-pulse delay-1800">k</span>
            <span className="animate-pulse delay-1850"> </span>
            <span className="animate-pulse delay-1900">a</span>
            <span className="animate-pulse delay-1950">t</span>
            <span className="animate-pulse delay-2000">t</span>
            <span className="animate-pulse delay-2050">e</span>
            <span className="animate-pulse delay-2100">n</span>
            <span className="animate-pulse delay-2150">d</span>
            <span className="animate-pulse delay-2200">a</span>
            <span className="animate-pulse delay-2250">n</span>
            <span className="animate-pulse delay-2300">c</span>
            <span className="animate-pulse delay-2350">e</span>
            <span className="animate-pulse delay-2400"> • </span>
            <span className="animate-pulse delay-2450">A</span>
            <span className="animate-pulse delay-2500">w</span>
            <span className="animate-pulse delay-2550">a</span>
            <span className="animate-pulse delay-2600">r</span>
            <span className="animate-pulse delay-2650">d</span>
            <span className="animate-pulse delay-2700"> </span>
            <span className="animate-pulse delay-2750">p</span>
            <span className="animate-pulse delay-2800">o</span>
            <span className="animate-pulse delay-2850">i</span>
            <span className="animate-pulse delay-2900">n</span>
            <span className="animate-pulse delay-2950">t</span>
            <span className="animate-pulse delay-3000">s</span>
            <span className="animate-pulse delay-3050"> • </span>
            <span className="animate-pulse delay-3100">C</span>
            <span className="animate-pulse delay-3150">e</span>
            <span className="animate-pulse delay-3200">l</span>
            <span className="animate-pulse delay-3250">e</span>
            <span className="animate-pulse delay-3300">b</span>
            <span className="animate-pulse delay-3350">r</span>
            <span className="animate-pulse delay-3400">a</span>
            <span className="animate-pulse delay-3450">t</span>
            <span className="animate-pulse delay-3500">e</span>
            <span className="animate-pulse delay-3550"> </span>
            <span className="animate-pulse delay-3600">a</span>
            <span className="animate-pulse delay-3650">c</span>
            <span className="animate-pulse delay-3700">h</span>
            <span className="animate-pulse delay-3750">i</span>
            <span className="animate-pulse delay-3800">e</span>
            <span className="animate-pulse delay-3850">v</span>
            <span className="animate-pulse delay-3900">e</span>
            <span className="animate-pulse delay-3950">m</span>
            <span className="animate-pulse delay-4000">e</span>
            <span className="animate-pulse delay-4050">n</span>
            <span className="animate-pulse delay-4100">t</span>
            <span className="animate-pulse delay-4150">s</span>
          </p>
        </div>
      </div>
    </main>
  );
}
