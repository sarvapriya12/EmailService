'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { Mail, Phone, MessageSquare, ShieldAlert, Award, Wrench, Headphones } from 'lucide-react'

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  company: z.string().optional(),
  subject: z.string().min(3, { message: 'Subject must be at least 3 characters.' }),
  companySize: z.string().optional(),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      company: '',
      subject: '',
      companySize: '',
      message: '',
    },
  })

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setSubmitted(true)
    toast.success('Your message has been sent successfully!')
    reset()
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Card */}
        <div className="lg:col-span-7 bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-10 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface">
          <h1 className="font-heading text-3xl font-extrabold text-ezen-primary mb-2">
            Contact Us
          </h1>
          <p className="text-sm text-ezen-outline mb-6">
            Looking for something? Drop us a line and we'll get back to you shortly.
          </p>

          {submitted ? (
            <div className="border border-ezen-secondary/20 bg-ezen-secondary-container/10 p-6 rounded-2xl text-center space-y-4">
              <h3 className="font-heading text-lg font-bold text-ezen-secondary">Thank You!</h3>
              <p className="text-sm text-ezen-on-surface-variant">
                We've received your request. We typically respond within 1-2 business days.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSubmitted(false)}
                className="mt-2"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Name *
                  </label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="h-10 px-3 bg-ezen-surface-container-lowest"
                    {...register('name')}
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                  {errors.name && (
                    <span className="text-xs text-ezen-error">{errors.name.message}</span>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label htmlFor="phone" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    placeholder="+91"
                    className="h-10 px-3 bg-ezen-surface-container-lowest"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    className="h-10 px-3 bg-ezen-surface-container-lowest"
                    {...register('email')}
                    aria-invalid={errors.email ? 'true' : 'false'}
                  />
                  {errors.email && (
                    <span className="text-xs text-ezen-error">{errors.email.message}</span>
                  )}
                </div>

                {/* Company */}
                <div className="space-y-1">
                  <label htmlFor="company" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Company
                  </label>
                  <Input
                    id="company"
                    placeholder="ACME Corp"
                    className="h-10 px-3 bg-ezen-surface-container-lowest"
                    {...register('company')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subject */}
                <div className="space-y-1">
                  <label htmlFor="subject" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    placeholder="Use it in my company"
                    className="h-10 px-3 bg-ezen-surface-container-lowest"
                    {...register('subject')}
                    aria-invalid={errors.subject ? 'true' : 'false'}
                  />
                  {errors.subject && (
                    <span className="text-xs text-ezen-error">{errors.subject.message}</span>
                  )}
                </div>

                {/* Company Size */}
                <div className="space-y-1">
                  <label htmlFor="companySize" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                    Your Company Size
                  </label>
                  <select
                    id="companySize"
                    className="w-full h-10 rounded-lg border border-input px-3 bg-ezen-surface-container-lowest text-ezen-on-surface outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
                    {...register('companySize')}
                  >
                    <option value="">Select size...</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label htmlFor="message" className="block text-xs font-bold text-ezen-primary uppercase tracking-wider">
                  Message *
                </label>
                <Textarea
                  id="message"
                  placeholder="Write down your message..."
                  rows={5}
                  className="px-3 py-2 bg-ezen-surface-container-lowest border border-input rounded-lg resize-none outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                  {...register('message')}
                  aria-invalid={errors.message ? 'true' : 'false'}
                />
                {errors.message && (
                  <span className="text-xs text-ezen-error">{errors.message.message}</span>
                )}
              </div>

              <div className="pt-2 text-xs text-ezen-outline leading-snug space-y-2">
                <p>We typically respond within 1-2 business days.</p>
                <p>
                  We will handle your personal data as described in our{' '}
                  <Link href="/privacy-policy" className="text-ezen-primary underline font-semibold">
                    Privacy Policy
                  </Link>
                  , to answer your question and provide information about our products and services.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 h-10 bg-ezen-primary hover:bg-ezen-primary/95 text-white"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          )}
        </div>

        {/* Right Column: Direct Contacts */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Call / WhatsApp */}
          <div className="bg-white border-2 border-ezen-outline-variant rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0_0_rgba(87,52,79,0.1)] text-ezen-on-surface">
            <h2 className="font-heading text-xl font-bold text-ezen-primary mb-4 flex items-center gap-2">
              <Phone className="size-5" />
              Direct Contacts
            </h2>
            <p className="text-xs text-ezen-outline mb-6">
              Call or Schedule a video conference
            </p>

            <div className="space-y-4 text-sm font-semibold">
              <a 
                href="tel:+917940500100" 
                className="flex items-center gap-3 p-3 rounded-2xl border border-ezen-outline-variant hover:border-ezen-primary/40 hover:bg-ezen-surface-container-low transition-colors group"
              >
                <Phone className="size-5 text-ezen-primary group-hover:scale-105 transition-transform" />
                <span className="text-ezen-on-surface-variant font-mono">+91 79 4050 0100</span>
              </a>

              <a 
                href="https://wa.me/916357077743" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl border border-ezen-outline-variant hover:border-ezen-primary/40 hover:bg-ezen-surface-container-low transition-colors group"
              >
                <MessageSquare className="size-5 text-ezen-secondary group-hover:scale-105 transition-transform" />
                <span className="text-ezen-on-surface-variant font-mono">Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Cards List: Meet an expert, Partner, Custom, Support */}
          <div className="space-y-3">
            
            {/* Meet an expert */}
            <div className="bg-white border border-ezen-outline-variant/60 rounded-2xl p-4 flex gap-4 items-start hover:border-ezen-primary/30 transition-colors">
              <div className="p-2 bg-ezen-primary/10 rounded-xl text-ezen-primary">
                <Award className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ezen-primary">Meet an Expert</h4>
                <p className="text-xs text-ezen-outline">To assess your project & get a tailored demo</p>
                <a href="mailto:experts@ezen.ai" className="text-xs text-ezen-primary font-semibold underline block">
                  experts@ezen.ai
                </a>
              </div>
            </div>

            {/* Become a partner */}
            <div className="bg-white border border-ezen-outline-variant/60 rounded-2xl p-4 flex gap-4 items-start hover:border-ezen-primary/30 transition-colors">
              <div className="p-2 bg-ezen-secondary/10 rounded-xl text-ezen-secondary">
                <Headphones className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ezen-secondary">Become a Partner</h4>
                <p className="text-xs text-ezen-outline">Appointment with a partner manager</p>
                <a href="mailto:partners@ezen.ai" className="text-xs text-ezen-secondary font-semibold underline block">
                  partners@ezen.ai
                </a>
              </div>
            </div>

            {/* Request Custom Developments */}
            <div className="bg-white border border-ezen-outline-variant/60 rounded-2xl p-4 flex gap-4 items-start hover:border-ezen-primary/30 transition-colors">
              <div className="p-2 bg-ezen-primary-container/10 rounded-xl text-ezen-primary">
                <Wrench className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ezen-primary">Request Custom Developments</h4>
                <p className="text-xs text-ezen-outline">Need to get in touch with developers?</p>
                <a href="mailto:dev@ezen.ai" className="text-xs text-ezen-primary font-semibold underline block">
                  dev@ezen.ai
                </a>
              </div>
            </div>

            {/* Support Requests */}
            <div className="bg-white border border-ezen-outline-variant/60 rounded-2xl p-4 flex gap-4 items-start hover:border-ezen-primary/30 transition-colors">
              <div className="p-2 bg-ezen-error/10 rounded-xl text-ezen-error">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ezen-error">Support Requests</h4>
                <p className="text-xs text-ezen-outline">Need help? Have a question about Ezen AI?</p>
                <a href="mailto:support@ezen.ai" className="text-xs text-ezen-error font-semibold underline block">
                  support@ezen.ai
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
