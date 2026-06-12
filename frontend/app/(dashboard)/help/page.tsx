'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, MessageSquare, Phone, Mail, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FAQItem {
  question: string
  answer: string
}

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqItems: FAQItem[] = [
    {
      question: "Do I really have access to unlimited AI email processing for a single price?",
      answer: "Yes. Our standard and custom plans offer fixed monthly rates that include baseline capacities for processing email intents and drafting replies. High-volume users can purchase additional prepaid AI generation credits as needed, which never expire as long as the subscription is active."
    },
    {
      question: "What's included in the subscription?",
      answer: "Every subscription includes access to the Ezen AI dashboard, standard email inbox integration (OAuth2 for Gmail & Outlook), AI auto-categorization of incoming messages, draft replies generated according to your presets, and standard performance analytics."
    },
    {
      question: "What is self-hosted / Ezen Cloud hosting?",
      answer: "Ezen Cloud hosting is our fully managed SaaS where we handle the infrastructure, API queues, and LLM orchestration. Self-hosted allows you to run Ezen AI's agent engine on your own local server or private cloud (such as AWS or GCP), using your own API credentials for complete data sovereignty."
    },
    {
      question: "Where can I get implementation services, and how much does it cost?",
      answer: "We offer onboarding and custom integration assistance starting at a flat fee depending on complexity. Our sole developer can also help set up dedicated private LLM endpoints or custom ERP/ticketing pipeline integrations. Contact support@ezen.ai for a detailed quote."
    },
    {
      question: "Is multi-inbox or Custom Templates available in the Free plan?",
      answer: "The Free plan allows you to connect a single personal inbox with standard auto-categorization. Custom replies, template guidelines, and multi-inbox management require upgrading to the Standard or Custom plan."
    },
    {
      question: "Why do I have separate credits for AI generation and email sending?",
      answer: "AI generation credits cover the computation cost of our Large Language Models generating structured responses. Email sending relies on your connected SMTP or inbox provider (e.g. Google/Microsoft limits) which are separate from Ezen AI's computational backend."
    },
    {
      question: "How to upgrade from the Free tier to a Standard or Custom plan?",
      answer: "You can upgrade directly from your Ezen AI dashboard under Settings > Subscription. Simply choose the plan that fits your business needs, select monthly or annual billing, and complete the payment through our secure PhonePe gateway."
    },
    {
      question: "What is the difference between the Standard plan and the Custom plan?",
      answer: "The Standard plan is designed for growing businesses connecting up to 5 inboxes with standard AI responses. The Custom plan supports unlimited inbox connections, custom LLM fine-tuning, priority support SLAs, and dedicated webhook pipelines."
    },
    {
      question: "How do you define a paying seat/user?",
      answer: "We define a paying user (or seat) as a team member who has access to the Ezen AI dashboard to view analytics, train models, or review drafted email replies. Reading and responding to automated queue runs do not count towards user seats."
    },
    {
      question: "Can I switch from Ezen Cloud to a self-hosted instance or vice-versa?",
      answer: "Yes. You can export your templates, presets, and conversation logs from the settings page at any time and import them into a self-hosted instance of the Ezen AI agent runner."
    },
    {
      question: "What does the External Developer API mean?",
      answer: "The External Developer API allows you to programmatically trigger email classification, feed new contexts to your AI agent, and hook Ezen AI into your existing CRM, database, or internal messaging flows."
    }
  ]

  const emergencyLines = [
    { region: "America", phone: "+1 (650) 870 2051" },
    { region: "Latin America", phone: "+1 (650) 260 6552" },
    { region: "Europe", phone: "+32 2 616 80 02" },
    { region: "Africa", phone: "+254 207 640 404" },
    { region: "Middle East", phone: "+971 4 498 7800" },
    { region: "Asia / India", phone: "+91 79 4050 0100" }
  ]

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      
      {/* Top Section */}
      <div className="bg-white border-2 border-ezen-outline-variant rounded-3xl p-8 sm:p-10 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface mb-8 text-center space-y-6">
        <div className="inline-flex p-3 bg-ezen-primary/10 rounded-2xl text-ezen-primary">
          <HelpCircle className="size-8" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-ezen-primary">
          Need Help?
        </h1>
        <p className="text-sm text-ezen-on-surface-variant max-w-md mx-auto">
          Get your questions answered immediately, talk to our virtual assistant, or reach support.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full bg-ezen-primary hover:bg-ezen-primary/95 text-white h-10 px-6">
              <MessageSquare className="size-4 mr-2" />
              Ask Ezen AI
            </Button>
          </Link>
          <span className="text-xs text-ezen-outline uppercase font-bold">or</span>
          <Link href="/contact" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full h-10 px-6">
              Contact us
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: FAQ Accordion */}
        <div className="md:col-span-8 bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface">
          <div className="border-b border-ezen-outline-variant/30 pb-4 mb-6">
            <h2 className="font-heading text-2xl font-extrabold text-ezen-primary">
              Any Questions?
            </h2>
            <p className="text-xs text-ezen-outline mt-1">
              If the answer to your question is not on this page, please contact our{' '}
              <a href="mailto:support@ezen.ai" className="text-ezen-primary underline font-semibold">
                Account Managers
              </a>
              .
            </p>
          </div>

          <div className="space-y-3 font-sans">
            {faqItems.map((item, idx) => (
              <div 
                key={idx} 
                className="border border-ezen-outline-variant/60 rounded-xl overflow-hidden bg-ezen-surface-container-lowest"
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full py-4 px-5 flex justify-between items-center text-left text-sm font-bold text-ezen-primary hover:bg-ezen-surface-container-low transition-colors"
                >
                  <span>{item.question}</span>
                  {openIndex === idx ? (
                    <ChevronUp className="size-4 shrink-0 text-ezen-primary" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-ezen-outline" />
                  )}
                </button>
                {openIndex === idx && (
                  <div className="px-5 pb-4 text-xs text-ezen-on-surface-variant leading-relaxed border-t border-ezen-outline-variant/20 pt-3 bg-white">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Emergency lines */}
        <div className="md:col-span-4 bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface space-y-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-ezen-primary flex items-center gap-2">
              <Phone className="size-5" />
              Emergency Lines
            </h3>
            <p className="text-xs text-ezen-outline mt-1">
              24/7 Priority support hotline for critical service failures.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {emergencyLines.map((line, idx) => (
              <div key={idx} className="pb-3 border-b border-ezen-outline-variant/20 last:border-b-0">
                <span className="block font-bold text-ezen-primary uppercase tracking-wider text-[10px]">
                  {line.region}
                </span>
                <a 
                  href={`tel:${line.phone.replace(/[^0-9+]/g, '')}`}
                  className="text-sm font-mono text-ezen-on-surface-variant hover:text-ezen-primary font-semibold transition-colors block mt-0.5"
                >
                  {line.phone}
                </a>
              </div>
            ))}
          </div>

          <div className="bg-ezen-surface-container-low p-4 rounded-xl border border-ezen-outline-variant/30 text-[11px] text-ezen-outline leading-snug">
            Emergency lines are reserved for service outages or high-priority SLAs. For billing or general queries, please email us directly.
          </div>
        </div>

      </div>

    </div>
  )
}
