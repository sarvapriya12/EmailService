'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'


export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password')
      } else if (session) {
        router.push('/dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-ezen-background p-6">
      <div className="w-full max-w-md p-10 bg-ezen-surface border-2 border-ezen-outline-variant rounded-3xl shadow-[6px_6px_0_0_#d1c3ca]">
        {/* Logo and Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-ezen-primary flex items-center justify-center text-ezen-on-primary font-heading font-extrabold text-2xl shadow-[4px_4px_0_0_#ffd7f1] select-none">
            E
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-ezen-primary tracking-tight">Ezen AI</h1>
          <p className="text-sm text-ezen-outline font-medium">Support Intelligence Platform</p>
        </div>

        {/* Custom Styled Supabase Auth Component */}
        <Auth
          supabaseClient={supabase}
          redirectTo={typeof window !== 'undefined' ? window.location.origin + '/login' : ''}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#57344f',
                  brandAccent: '#714b67',
                  brandButtonText: '#ffffff',
                  defaultButtonBackground: '#ffffff',
                  defaultButtonBackgroundHover: '#faf1f4',
                  defaultButtonBorder: '#d1c3ca',
                  inputBackground: '#ffffff',
                  inputBorder: '#d1c3ca',
                  inputBorderFocus: '#57344f',
                  inputBorderHover: '#80747a',
                  inputText: '#1e1b1d',
                  inputPlaceholder: '#80747a',
                },
                space: {
                  buttonPadding: '12px 16px',
                  inputPadding: '12px 16px',
                },
                borderWidths: {
                  buttonBorderWidth: '2px',
                  inputBorderWidth: '2px',
                },
                radii: {
                  borderRadiusButton: '12px',
                  buttonBorderRadius: '12px',
                  inputBorderRadius: '12px',
                },
              },
            },
          }}
          providers={[]}
          showLinks={true}
        />
      </div>
    </div>
  )
}
