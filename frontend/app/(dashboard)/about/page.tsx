'use client'

import React from 'react'
import { User, Mountain } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="relative w-full font-sans text-ezen-on-surface">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center py-12 max-w-4xl mx-auto space-y-6">
          <span className="inline-block font-mono text-xs font-bold text-ezen-secondary tracking-[0.2em] uppercase bg-ezen-secondary-container/10 px-3 py-1 rounded-md">
            Our Manifesto
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-ezen-primary">
            Humanizing Support for the <br />
            <span className="relative scribble-accent scribble-underline text-ezen-secondary">Creator Economy</span>
          </h1>
          <p className="text-base sm:text-lg text-ezen-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            We believe AI shouldn't be a cold wall between businesses and clients. It should be the loom that weaves responsive clarity into every single conversation, helping builders scale without losing their soul.
          </p>
        </section>

        {/* Feature grid detail */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-8">
          <div className="md:col-span-6 border-2 border-ezen-outline-variant/60 rounded-3xl overflow-hidden aspect-video md:aspect-square shadow-[6px_6px_0_0_rgba(87,52,79,0.05)] bg-[#FAF3E8]">
            <img 
              className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" 
              alt="Hands working on crafts"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuADObDD03PxXli_AwZZ6HvWHRo3EcHaFm_f7bb9oBeC4fru1ESo_WShxMpJGCIm1uPNj8vrG-kV7jSNPOZIeKDq1uNgCgVLmqfN1ndUjnzp2GzkGX2512-FV3bkASN1ctdOTOmB7pDaAOSYI9Qe-dJm0T9qivbEJJXJruh5ixKz5X_V732az8tmYtt_-bUp-bQCqsI0_o6gi_lsXZdLWE6q0ZOc5gYXkB4mO5GBY9xIncb8X8TE6ZnzwPamnwuLMbABHdO6lj3ybh4" 
            />
          </div>
          
          <div className="md:col-span-6 space-y-6">
            <h2 className="font-heading text-3xl font-extrabold text-ezen-primary leading-tight">
              Empowering the <br />
              <span className="text-ezen-secondary italic">Modern Artisan</span>
            </h2>
            <p className="text-sm text-ezen-on-surface-variant leading-relaxed">
              Whether you are managing inquiries for unique custom products, casting jewelry, or handling complex software services—Ezen acts as your silent, empathetic partner.
            </p>
          </div>
        </section>

        {/* Journey Section with Subtle Glow and Milestone feel */}
        <section className="bg-ezen-surface border border-ezen-outline-variant/30 rounded-[2.5rem] p-8 sm:p-12 text-center relative overflow-hidden shadow-[0_0_30px_rgba(80,0,136,0.09)] transition-all duration-300 hover:shadow-[0_0_45px_rgba(80,0,136,0.14)]">
          <div className="absolute inset-0 bg-gradient-to-tr from-ezen-primary/3 via-transparent to-ezen-secondary/3 pointer-events-none" />
          
          <div className="max-w-3xl mx-auto space-y-4 relative z-10 flex flex-col items-center">
            {/* Rock icon representing milestone */}
            <div className="w-14 h-14 bg-ezen-primary/5 rounded-full flex items-center justify-center border border-ezen-primary/10 shadow-[0_0_15px_rgba(80,0,136,0.05)] text-ezen-primary mb-2">
              <Mountain className="size-7 animate-pulse" />
            </div>
            
            <h2 className="font-heading text-3xl font-extrabold text-ezen-primary">Our Journey</h2>
            <p className="text-sm text-ezen-on-surface-variant leading-relaxed max-w-2xl mx-auto">
              We launched this application with the idea of making things easier and more efficient for small businesses.
            </p>
          </div>
        </section>

        {/* Developer About Me Section */}
        <section className="bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface flex gap-4 items-start max-w-2xl mx-auto">
          <div className="p-3 bg-ezen-primary/10 rounded-2xl text-ezen-primary shrink-0">
            <User className="size-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-lg font-bold text-ezen-primary">
              About the Developer
            </h3>
            <p className="text-sm text-ezen-on-surface-variant leading-relaxed font-medium">
              I am a sole software developer trying to provide access to advanced AI email services at the minimum possible fee/cost for everyone.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
