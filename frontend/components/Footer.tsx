import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full mt-12 py-8 px-6 bg-[#0c090a] border-t border-[#1e171b] flex flex-col sm:flex-row justify-between items-center gap-6 text-xs select-none rounded-t-3xl text-[#e9e0e3]/85">
      <div className="font-semibold text-white/90">
        © {new Date().getFullYear()} Ezen AI. All rights reserved.
      </div>
      <div className="flex gap-6 flex-wrap justify-center font-bold">
        <Link href="/contact" className="hover:text-white transition-colors text-white/80">Contact Us</Link>
        <Link href="/privacy-policy" className="hover:text-white transition-colors text-white/80">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-white transition-colors text-white/80">Terms & Conditions</Link>
        <Link href="/refund-policy" className="hover:text-white transition-colors text-white/80">Refund Policy</Link>
      </div>
    </footer>
  )
}
