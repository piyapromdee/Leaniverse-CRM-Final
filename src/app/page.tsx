'use client'

import type { NextPage } from 'next'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  MessageSquare,
  FileSpreadsheet,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Globe,
  ChevronDown,
  TrendingUp,
  Clock,
  Target,
  Star,
  Quote,
  UserCheck,
  Bell,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Building2,
  ShoppingBag,
  Stethoscope,
  Utensils,
  Car,
  Wallet
} from 'lucide-react'

// ========================================
// BILINGUAL SYSTEM
// ========================================
type Language = 'th' | 'en'

const translations = {
  th: {
    // Header
    howItWorks: 'วิธีใช้งาน',
    pricing: 'ราคา',
    contact: 'ติดต่อเรา',
    signIn: 'เข้าสู่ระบบ',

    // Hero - Clear Pain Point
    heroTitle1: 'ลูกค้าทักมาแล้ว',
    heroTitle2: 'หายไปไหน?',
    heroTitle3: 'รวมทุก Lead ไว้ที่เดียว ปิดการขายได้เร็วขึ้น 3 เท่า',
    heroSubtitle: 'CRM ที่เชื่อมต่อ LINE OA และ Facebook ให้ Lead ไหลเข้าอัตโนมัติ ไม่หลุดแม้แต่คนเดียว',
    heroBtn1: 'เริ่มทดลองใช้ฟรี 14 วัน',
    heroBtn2: 'ขอดู Demo',

    // Challenges Section
    challengesTitle: 'แก้ปัญหาการขายที่ใหญ่ที่สุดของคุณ',
    challenge1Title: 'Lead หายจากแชท',
    challenge1Desc: 'ลูกค้าทักมาแล้วหาย ไม่รู้ว่าใครคือใคร',
    challenge2Title: 'พิมพ์ข้อมูลซ้ำๆ',
    challenge2Desc: 'ก็อปชื่อ เบอร์ ใส่ Excel ทุกวัน',
    challenge3Title: 'ไม่รู้กำไรขาดทุน',
    challenge3Desc: 'ยอดขายเท่าไหร่ ค่าโฆษณาคุ้มไหม',
    challenge4Title: 'LINE/FB Messenger',
    challenge4Desc: 'ทักมาทุกช่องทาง ดูแลไม่ทั่วถึง',
    challenge5Title: 'Automated CRM',
    challenge5Desc: 'Lead เข้าอัตโนมัติ จัดการ Deal ง่าย',
    challenge6Title: 'Owner Dashboard',
    challenge6Desc: 'ดู ROI, ยอดขาย, ทีม ในที่เดียว',

    // Trust Section
    trustTitle: 'ได้รับความไว้วางใจจากธุรกิจไทยที่กำลังเติบโต',

    // Pricing Section
    pricingTitle: 'ราคาชัดเจน โปร่งใส',
    oneTimeTitle: 'One-Time Investment',
    oneTimeDesc: 'จ่ายครั้งเดียว',
    coreSetup: 'CRM Core Setup',
    coreSetupPrice: '25,000',
    optionalApi: 'Optional Add-on LINE/FB API Integration',
    optionalApiPrice: '5,000',
    coreIncludes: 'รวม: Account, Training, Support',

    monthlyTitle: 'Monthly MA (Maintenance)',
    starterPlan: 'Starter Plan',
    starterPrice: '1,500',
    starterUsers: '5 Users',
    starterLeads: '500 Leads',
    growthPlan: 'Growth Plan',
    growthPrice: '3,500',
    growthUsers: '15 Users',
    growthLeads: 'Unlimited Leads',
    noHiddenFees: 'ไม่มีค่าใช้จ่ายแอบแฝง',
    includes: 'รวม: Security, Support, Updates',
    contactForDemo: 'นัดหมายเพื่อ Demo',

    // FAQ
    faqTitle: 'คำถามที่พบบ่อย',
    faq1Q: 'ต้องมี LINE Official Account ก่อนไหม?',
    faq1A: 'ใช่ครับ ต้องมี LINE OA และ/หรือ Facebook Page ทีมงานจะช่วยแนะนำการเชื่อมต่อให้',
    faq2Q: 'ไม่ต้องการ LINE/FB Integration ได้ไหม?',
    faq2A: 'ได้ครับ! Core Setup ฿25,000 ใช้ CRM + Website Lead Form ได้เลย เพิ่ม LINE/FB ทีหลังก็ได้',
    faq3Q: 'Setup ใช้เวลานานไหม?',
    faq3A: 'Core Setup 1-2 วันทำการ รวม LINE/FB เพิ่มอีก 1-2 วัน',

    // CTA Section
    ctaTitle: 'พร้อมที่จะ Automate & Grow?',
    ctaBtn: 'เริ่มทดลองใช้ฟรี 14 วัน',

    // Footer
    footerDesc: 'CRM สำหรับ SME ไทย พร้อม Auto Lead Capture',

    // Key Metrics
    metricsTitle: 'ผลลัพธ์ที่ลูกค้าของเราได้รับ',
    metric1Value: '3x',
    metric1Label: 'เพิ่มอัตราการปิด Deal',
    metric2Value: '85%',
    metric2Label: 'ลด Lead หลุดจากแชท',
    metric3Value: '2 ชม.',
    metric3Label: 'ประหยัดเวลา/วัน',
    metric4Value: '45%',
    metric4Label: 'เพิ่ม ROI โฆษณา',

    // Features
    featuresTitle: 'ฟีเจอร์ที่ช่วยแก้ทุกปัญหาการขาย',
    feature1Title: 'Auto Lead Capture',
    feature1Desc: 'Lead จาก LINE/FB ไหลเข้า CRM อัตโนมัติ ไม่ต้อง Copy-Paste',
    feature2Title: 'Smart Notification',
    feature2Desc: 'แจ้งเตือนทันทีเมื่อมี Lead ใหม่ ไม่พลาดทุกโอกาส',
    feature3Title: 'Pipeline Management',
    feature3Desc: 'ติดตาม Deal ทุกขั้นตอน รู้ว่าใครใกล้ปิดการขาย',
    feature4Title: 'ROI Dashboard',
    feature4Desc: 'ดู Cost per Lead, ยอดขาย, กำไร Real-time',

    // Testimonials
    testimonialsTitle: 'ลูกค้าของเราพูดถึงเรา',
    testimonial1Quote: 'ก่อนใช้ Dummi เสีย Lead จาก LINE วันละ 20-30 คน ตอนนี้ไม่หลุดเลย ยอดขายเพิ่ม 3 เท่าใน 2 เดือน',
    testimonial1Name: 'คุณสมชาย',
    testimonial1Role: 'เจ้าของร้านเสื้อผ้าออนไลน์',
    testimonial1Company: 'Fashion Hub',
    testimonial2Quote: 'ไม่ต้องจ้างคนมานั่ง Copy ข้อมูลลง Excel อีกแล้ว ประหยัดค่าจ้างไปเดือนละ 15,000',
    testimonial2Name: 'คุณวิภา',
    testimonial2Role: 'ผู้จัดการฝ่ายขาย',
    testimonial2Company: 'Beauty Plus Clinic',
    testimonial3Quote: 'ดู Dashboard รู้เลยว่าโฆษณาตัวไหนคุ้ม ตัวไหนเจ๊ง ปรับ Budget ได้ทันที',
    testimonial3Name: 'คุณธนา',
    testimonial3Role: 'Marketing Manager',
    testimonial3Company: 'HomeStyle Furniture',
  },
  en: {
    // Header
    howItWorks: 'How it Works',
    pricing: 'Pricing',
    contact: 'Contact',
    signIn: 'Sign In',

    // Hero
    heroTitle1: 'STOP Losing Leads from',
    heroTitle2: 'LINE & Facebook Ads',
    heroTitle3: 'Automate Your Sales Business',
    heroSubtitle: 'Dummi & Co is Smart CRM for Thai SMEs. Close deals faster. All in one platform.',
    heroBtn1: 'Start Your Free 14-Day Trial',
    heroBtn2: 'Request a Demo',

    // Challenges Section
    challengesTitle: 'Solve Your Biggest Sales Challenges',
    challenge1Title: 'Lead Loss from Chat',
    challenge1Desc: 'Customers message but get lost in the chaos',
    challenge2Title: 'Manual Data Entry',
    challenge2Desc: 'Copy-paste names & numbers to Excel daily',
    challenge3Title: 'No Financial Clarity',
    challenge3Desc: 'Revenue? ROI? Expenses? No clear view',
    challenge4Title: 'LINE/FB Messenger',
    challenge4Desc: 'Never miss a chat. Close deals faster. Auto sync to Lead.',
    challenge5Title: 'Automated CRM',
    challenge5Desc: 'Sync all Contacts & Deals automatically',
    challenge6Title: 'Owner Dashboard',
    challenge6Desc: 'CRM that understands Thai SME, with LINE & WhatsApp support',

    // Trust Section
    trustTitle: 'Trusted by Growing Thai Businesses',

    // Pricing Section
    pricingTitle: 'Clear & Transparent Pricing',
    oneTimeTitle: 'One-Time Investment',
    oneTimeDesc: 'Pay once',
    coreSetup: 'CRM Core Setup',
    coreSetupPrice: '25,000',
    optionalApi: 'Optional Add-on LINE/FB API Integration',
    optionalApiPrice: '5,000',
    coreIncludes: 'Includes: Account, Training, Support',

    monthlyTitle: 'Monthly MA (Maintenance)',
    starterPlan: 'Starter Plan',
    starterPrice: '1,500',
    starterUsers: '5 Users',
    starterLeads: '500 Leads',
    growthPlan: 'Growth Plan',
    growthPrice: '3,500',
    growthUsers: '15 Users',
    growthLeads: 'Unlimited Leads',
    noHiddenFees: 'No Hidden Fees',
    includes: 'Includes: Security, Support, Updates',
    contactForDemo: 'Contact for Demo',

    // FAQ
    faqTitle: 'FAQ',
    faq1Q: 'Do I need LINE Official Account?',
    faq1A: 'Yes, you need LINE OA and/or Facebook Page. Our team will guide you.',
    faq2Q: 'Can I skip LINE/FB Integration?',
    faq2A: 'Yes! Core Setup ฿25,000 gives you CRM + Website Lead Form. Add LINE/FB later.',
    faq3Q: 'How long is setup?',
    faq3A: 'Core Setup 1-2 business days. With LINE/FB add 1-2 more days.',

    // CTA Section
    ctaTitle: 'Ready to Automate & Grow?',
    ctaBtn: 'Start Your Free 14-Day Trial',

    // Footer
    footerDesc: 'CRM for Thai SMEs with Auto Lead Capture',

    // Key Metrics
    metricsTitle: 'Results Our Customers Achieve',
    metric1Value: '3x',
    metric1Label: 'Increase in Deal Closing',
    metric2Value: '85%',
    metric2Label: 'Reduction in Lost Leads',
    metric3Value: '2 hrs',
    metric3Label: 'Time Saved Daily',
    metric4Value: '45%',
    metric4Label: 'Increase in Ad ROI',

    // Features
    featuresTitle: 'Features That Solve Every Sales Problem',
    feature1Title: 'Auto Lead Capture',
    feature1Desc: 'Leads from LINE/FB flow into CRM automatically. No more copy-paste.',
    feature2Title: 'Smart Notification',
    feature2Desc: 'Instant alerts for new leads. Never miss an opportunity.',
    feature3Title: 'Pipeline Management',
    feature3Desc: 'Track every deal stage. Know who is close to closing.',
    feature4Title: 'ROI Dashboard',
    feature4Desc: 'See Cost per Lead, Sales, Profit in Real-time.',

    // Testimonials
    testimonialsTitle: 'What Our Customers Say',
    testimonial1Quote: 'Before Dummi, we lost 20-30 leads from LINE daily. Now zero. Sales increased 3x in 2 months.',
    testimonial1Name: 'Somchai',
    testimonial1Role: 'Online Fashion Store Owner',
    testimonial1Company: 'Fashion Hub',
    testimonial2Quote: 'No more hiring staff to copy data to Excel. Saving 15,000 baht monthly.',
    testimonial2Name: 'Wipa',
    testimonial2Role: 'Sales Manager',
    testimonial2Company: 'Beauty Plus Clinic',
    testimonial3Quote: 'Dashboard shows which ads are profitable. Adjust budget instantly.',
    testimonial3Name: 'Thana',
    testimonial3Role: 'Marketing Manager',
    testimonial3Company: 'HomeStyle Furniture',
  }
}

// ========================================
// COMPONENTS
// ========================================

// Logo - Real Image
const Logo = () => (
  <img
    src="/dummi-co-logo-new.jpg"
    alt="Dummi & Co"
    className="w-10 h-10 object-contain rounded-xl"
  />
)


// Animated ROI Graph Component with scroll trigger + line graph
const AnimatedROIGraph = ({ isVisible }: { isVisible: boolean }) => {
  const barHeights = [25, 35, 30, 45, 55, 50, 65, 75, 70, 85, 95, 110]
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  // Calculate line graph points
  const graphWidth = 100 // percentage
  const linePoints = barHeights.map((h, i) => {
    const x = (i / (barHeights.length - 1)) * graphWidth
    const y = 100 - (h / 110) * 100 // invert for SVG coords
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">ROI Performance</h3>
          <p className="text-sm text-gray-500">ยอดขายเพิ่มขึ้นหลังใช้ Dummi</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <span className="text-lg font-bold text-emerald-600">+340%</span>
        </div>
      </div>

      <div className="relative h-48 mb-4">
        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-2">
          {barHeights.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t-lg transition-all duration-1000 ease-out ${
                  i >= 6 ? 'bg-gradient-to-t from-emerald-600/30 to-emerald-400/30' : 'bg-gray-100'
                }`}
                style={{
                  height: isVisible ? `${h}%` : '0%',
                  transitionDelay: `${i * 100}ms`
                }}
              />
            </div>
          ))}
        </div>

        {/* Line Graph Overlay */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Gradient for area under line */}
          <defs>
            <linearGradient id="lineAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area under line */}
          <polygon
            points={isVisible ? `0,100 ${linePoints} 100,100` : '0,100 0,100 100,100'}
            fill="url(#lineAreaGradient)"
            className="transition-all duration-1500 ease-out"
          />

          {/* Line */}
          <polyline
            points={isVisible ? linePoints : '0,100 100,100'}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-1500 ease-out"
            style={{ transitionDelay: '500ms' }}
          />

          {/* Data points */}
          {barHeights.map((h, i) => {
            const x = (i / (barHeights.length - 1)) * 100
            const y = 100 - (h / 110) * 100
            return (
              <circle
                key={i}
                cx={x}
                cy={isVisible ? y : 100}
                r="2"
                fill="#10b981"
                stroke="white"
                strokeWidth="1"
                className="transition-all duration-1000 ease-out"
                style={{ transitionDelay: `${i * 100 + 800}ms` }}
              />
            )
          })}
        </svg>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        {months.map((m, i) => (
          <span key={i} className={i >= 6 ? 'text-emerald-600 font-medium' : ''}>{m}</span>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">฿45</p>
          <p className="text-xs text-gray-500">Cost per Lead</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">156</p>
          <p className="text-xs text-gray-500">Leads/เดือน</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">32%</p>
          <p className="text-xs text-gray-500">Conversion Rate</p>
        </div>
      </div>
    </div>
  )
}

// Testimonial Card
const TestimonialCard = ({ quote, name, role, company, index }: {
  quote: string;
  name: string;
  role: string;
  company: string;
  index: number;
}) => {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500']
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <Quote className="w-8 h-8 text-emerald-200 mb-2" />
      <p className="text-gray-700 mb-6 text-base leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full ${colors[index % 3]} flex items-center justify-center text-white font-bold`}>
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
          <p className="text-sm text-emerald-600">{company}</p>
        </div>
      </div>
    </div>
  )
}

// Feature Card
const FeatureCard = ({ icon: Icon, title, desc }: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group">
    <div className="w-14 h-14 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 flex items-center justify-center mb-4 transition-colors">
      <Icon className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
    </div>
    <h3 className="font-bold text-gray-900 mb-2 text-xl">{title}</h3>
    <p className="text-gray-600">{desc}</p>
  </div>
)

// Metric Card (for dark background)
const MetricCard = ({ value, label, icon: Icon }: {
  value: string;
  label: string;
  icon: React.ElementType;
}) => (
  <div className="text-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
      <Icon className="w-8 h-8 text-emerald-400" />
    </div>
    <p className="text-4xl md:text-5xl font-bold text-white mb-2">{value}</p>
    <p className="text-gray-300">{label}</p>
  </div>
)

// LINE Icon
const LineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

// Messenger Icon
const MessengerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
  </svg>
)

// Language Switcher
const LanguageSwitcher = ({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) => (
  <button
    onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
  >
    <Globe className="w-4 h-4" />
    {lang === 'th' ? 'EN' : 'TH'}
  </button>
)

// Hero Background with animated elements
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    {/* Grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.02]"
      style={{
        backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}
    />
    {/* Glow effects */}
    <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
    <div className="absolute bottom-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
  </div>
)

// Hero Illustration - Web3 Style Interactive Dashboard
const HeroIllustration = () => (
  <div className="relative">
    <div className="w-80 h-80 md:w-[420px] md:h-[400px] relative">
      {/* Glowing orbs - Web3 style */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Dashboard Card */}
      <div className="absolute top-0 right-0 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-5 w-56 transform rotate-2 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Dashboard</span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Live</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Leads Today</span>
              <span className="text-emerald-600 font-semibold">+23%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Conversion</span>
              <span className="text-emerald-600 font-semibold">32%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* New Lead Notification Card */}
      <div className="absolute bottom-16 left-0 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-60 transform -rotate-2 border border-gray-100 animate-float">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#06C755] to-[#04a648] rounded-full flex items-center justify-center shadow-lg">
            <LineIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Lead ใหม่!</p>
            <p className="text-xs text-gray-500">จาก LINE Official</p>
          </div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-700">&ldquo;สนใจสินค้าครับ ขอราคาหน่อยครับ&rdquo;</p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button className="flex-1 text-xs bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors">
            ตอบกลับ
          </button>
          <button className="flex-1 text-xs bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            ดูรายละเอียด
          </button>
        </div>
      </div>

      {/* Stats Floating Card */}
      <div className="absolute top-1/2 -right-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 w-36 shadow-2xl border border-slate-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">156</p>
          <p className="text-xs text-gray-400">Leads/เดือน</p>
        </div>
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">+45%</span>
          </div>
        </div>
      </div>

      {/* Connection Lines - Web3 style */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.3)" />
          </linearGradient>
        </defs>
        <line x1="140" y1="200" x2="60" y2="280" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="200" y1="80" x2="280" y2="160" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    </div>

    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translateY(0) rotate(-2deg); }
        50% { transform: translateY(-10px) rotate(-2deg); }
      }
      .animate-float {
        animation: float 4s ease-in-out infinite;
      }
    `}</style>
  </div>
)

// Challenge Card Component
const ChallengeCard = ({ icon: Icon, title, desc, isHighlighted = false }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  isHighlighted?: boolean;
}) => (
  <div className={`p-6 rounded-xl border transition-all hover:shadow-lg ${
    isHighlighted
      ? 'bg-emerald-50 border-emerald-200'
      : 'bg-white border-gray-200 hover:border-emerald-200'
  }`}>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
      isHighlighted ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
    }`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
    <p className="text-base text-gray-600">{desc}</p>
  </div>
)

// ========================================
// MAIN PAGE
// ========================================
const SalesPage: NextPage = () => {
  const [lang, setLang] = useState<Language>('th')
  const t = translations[lang]
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [roiGraphVisible, setRoiGraphVisible] = useState(false)
  const roiRef = useRef<HTMLDivElement>(null)

  // Scroll visibility detection for ROI Graph
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRoiGraphVisible(true)
          }
        })
      },
      { threshold: 0.3 }
    )

    if (roiRef.current) {
      observer.observe(roiRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ')
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName || '',
          last_name: lastNameParts.join(' ') || '',
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company,
          source: 'website',
          priority: 'high',
          notes: 'Lead from landing page contact form',
          utm_source: 'website',
          landing_page: window.location.href,
        }),
      })
      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', company: '', email: '', phone: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-kanit), system-ui, sans-serif' }}>

      {/* ========================================
          HEADER
          ======================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-white font-semibold hidden sm:block">Dummi & Co</span>
            </div>
            <nav className="hidden lg:flex items-center gap-8 text-base">
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors font-medium">{t.howItWorks}</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors font-medium">{t.pricing}</a>
              <a href="#contact" className="text-gray-300 hover:text-white transition-colors font-medium">{t.contact}</a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Tel Button */}
              <a href="tel:0940261987" className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">094-026-1987</span>
              </a>
              {/* LINE Button */}
              <a href="https://line.me/R/ti/p/@deemmi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05b04c] text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                <LineIcon className="w-4 h-4" />
                <span className="hidden sm:inline">@deemmi</span>
              </a>
              <LanguageSwitcher lang={lang} setLang={setLang} />
              <a href="/auth/sign-in" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10">
                  {t.signIn}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================
          HERO SECTION - ATTENTION
          ======================================== */}
      <section className="relative min-h-[70vh] flex items-center pt-14">
        <HeroBackground />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                <span className="text-gray-300">{t.heroTitle1}</span>
                <br />
                <span className="text-emerald-400">{t.heroTitle2}</span>
                <br />
                <span className="text-white text-2xl sm:text-3xl lg:text-4xl">{t.heroTitle3}</span>
              </h1>
              <p className="text-lg text-gray-300 mb-6 max-w-lg">
                {t.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#contact">
                  <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-6 text-lg">
                    {t.heroBtn1}
                  </Button>
                </a>
                <a href="#contact">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white text-white bg-white/10 hover:bg-white/20 font-semibold px-8 py-6 text-lg">
                    {t.heroBtn2}
                  </Button>
                </a>
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="hidden lg:flex justify-center">
              <HeroIllustration />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-gray-500 animate-bounce" />
        </div>
      </section>

      {/* ========================================
          TRUST SECTION - AUTO SLIDING CAROUSEL
          ======================================== */}
      <section className="py-8 bg-white border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-gray-600 font-medium text-lg mb-6">{t.trustTitle}</p>
          {/* Auto-sliding logo carousel */}
          <div className="relative">
            <div className="flex animate-scroll-logos-hero">
              {/* First set of logos */}
              {[
                { abbr: 'FH', name: 'Fashion Hub' },
                { abbr: 'BP', name: 'Beauty Plus' },
                { abbr: 'HS', name: 'HomeStyle' },
                { abbr: 'TF', name: 'TechFit' },
                { abbr: 'GS', name: 'GreenShop' },
                { abbr: 'PT', name: 'PetCare' },
                { abbr: 'WL', name: 'Wellness' },
                { abbr: 'FD', name: 'FoodDelivery' },
              ].map((logo, i) => (
                <div key={`hero-a-${i}`} className="flex-shrink-0 mx-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-colors">
                    <span className="text-xl font-bold text-gray-400">{logo.abbr}</span>
                  </div>
                  <span className="text-xs text-gray-500">{logo.name}</span>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {[
                { abbr: 'FH', name: 'Fashion Hub' },
                { abbr: 'BP', name: 'Beauty Plus' },
                { abbr: 'HS', name: 'HomeStyle' },
                { abbr: 'TF', name: 'TechFit' },
                { abbr: 'GS', name: 'GreenShop' },
                { abbr: 'PT', name: 'PetCare' },
                { abbr: 'WL', name: 'Wellness' },
                { abbr: 'FD', name: 'FoodDelivery' },
              ].map((logo, i) => (
                <div key={`hero-b-${i}`} className="flex-shrink-0 mx-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-colors">
                    <span className="text-xl font-bold text-gray-400">{logo.abbr}</span>
                  </div>
                  <span className="text-xs text-gray-500">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes scroll-logos-hero {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-scroll-logos-hero {
            animation: scroll-logos-hero 20s linear infinite;
          }
          .animate-scroll-logos-hero:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* ========================================
          CHALLENGES SECTION - INTEREST
          ======================================== */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.challengesTitle}
          </h2>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <ChallengeCard
              icon={MessageSquare}
              title={t.challenge1Title}
              desc={t.challenge1Desc}
            />
            <ChallengeCard
              icon={FileSpreadsheet}
              title={t.challenge2Title}
              desc={t.challenge2Desc}
            />
            <ChallengeCard
              icon={DollarSign}
              title={t.challenge3Title}
              desc={t.challenge3Desc}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <ChallengeCard
              icon={Zap}
              title={t.challenge4Title}
              desc={t.challenge4Desc}
              isHighlighted
            />
            <ChallengeCard
              icon={Users}
              title={t.challenge5Title}
              desc={t.challenge5Desc}
              isHighlighted
            />
            <ChallengeCard
              icon={BarChart3}
              title={t.challenge6Title}
              desc={t.challenge6Desc}
              isHighlighted
            />
          </div>
        </div>
      </section>

      {/* ========================================
          KEY METRICS - SOCIAL PROOF
          ======================================== */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            {t.metricsTitle}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <MetricCard icon={TrendingUp} value={t.metric1Value} label={t.metric1Label} />
            <MetricCard icon={Target} value={t.metric2Value} label={t.metric2Label} />
            <MetricCard icon={Clock} value={t.metric3Value} label={t.metric3Label} />
            <MetricCard icon={PieChart} value={t.metric4Value} label={t.metric4Label} />
          </div>
        </div>
      </section>

      {/* ========================================
          FEATURES SECTION
          ======================================== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            {t.featuresTitle}
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12 max-w-2xl mx-auto">
            ทุกฟีเจอร์ออกแบบมาเพื่อแก้ปัญหาจริงของ SME ไทย
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon={UserCheck} title={t.feature1Title} desc={t.feature1Desc} />
            <FeatureCard icon={Bell} title={t.feature2Title} desc={t.feature2Desc} />
            <FeatureCard icon={Target} title={t.feature3Title} desc={t.feature3Desc} />
            <FeatureCard icon={BarChart3} title={t.feature4Title} desc={t.feature4Desc} />
          </div>
        </div>
      </section>

      {/* ========================================
          ROI GRAPH SECTION
          ======================================== */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                ดู ROI ได้ Real-time<br />
                <span className="text-emerald-600">รู้ทันทีว่าคุ้มไหม</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Dashboard แสดงผลลัพธ์การตลาดแบบ Real-time ดู Cost per Lead,
                ยอดขายจากแต่ละช่องทาง และ ROI ของทุกแคมเปญ
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">ดู Cost per Lead แยกตาม Channel</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">เปรียบเทียบ ROI ระหว่างแคมเปญ</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-gray-700">Track ยอดขายจากทุกช่องทาง</span>
                </li>
              </ul>
              <a href="#contact">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg font-semibold">
                  ดู Demo Dashboard
                </Button>
              </a>
            </div>
            <div ref={roiRef}>
              <AnimatedROIGraph isVisible={roiGraphVisible} />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          OWNER PROFIT MONITOR SECTION
          ======================================== */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-emerald-500/20 text-emerald-400 text-sm font-medium px-4 py-1 rounded-full mb-4">
                สำหรับเจ้าของธุรกิจ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Owner Dashboard<br />
                <span className="text-emerald-400">Monitor กำไร Real-time</span>
              </h2>
              <p className="text-lg text-gray-300 mb-6">
                ไม่ต้องรอสรุปสิ้นเดือน ดูได้ทันทีว่าธุรกิจเป็นอย่างไร
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">ดูยอดขายรวม แยกตามทีม แยกตามช่องทาง</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">เปรียบเทียบ Cost per Lead กับยอดขาย</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">รู้ว่าโฆษณาตัวไหนคุ้มค่าที่สุด</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-gray-200">Monitor Performance ของทีมขาย</span>
                </li>
              </ul>
              <a href="#contact">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-6 text-lg">
                  ขอดู Demo Dashboard
                </Button>
              </a>
            </div>

            {/* Mock Dashboard Preview - White background for contrast */}
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Owner Dashboard</h3>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                  <p className="text-emerald-600 text-xs mb-1 font-medium">ยอดขายเดือนนี้</p>
                  <p className="text-2xl font-bold text-gray-900">฿847,500</p>
                  <p className="text-emerald-600 text-xs">+12% จากเดือนที่แล้ว</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-blue-600 text-xs mb-1 font-medium">กำไรสุทธิ</p>
                  <p className="text-2xl font-bold text-gray-900">฿285,000</p>
                  <p className="text-blue-600 text-xs">Margin 33.6%</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <p className="text-orange-600 text-xs mb-1 font-medium">Cost per Lead</p>
                  <p className="text-2xl font-bold text-gray-900">฿45</p>
                  <p className="text-orange-600 text-xs">-8% จากเดือนที่แล้ว</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <p className="text-purple-600 text-xs mb-1 font-medium">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">32%</p>
                  <p className="text-purple-600 text-xs">+5% จากเดือนที่แล้ว</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-gray-600 text-xs mb-3 font-medium">Top Channels</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center">
                      <LineIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700 font-medium">LINE</span>
                        <span className="text-gray-900 font-semibold">฿520,000</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full w-[65%] bg-[#06C755] rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0084FF] flex items-center justify-center">
                      <MessengerIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-700 font-medium">Facebook</span>
                        <span className="text-gray-900 font-semibold">฿327,500</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full w-[35%] bg-[#0084FF] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          TESTIMONIALS SECTION - AUTO SLIDING
          ======================================== */}
      <section className="py-20 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            {t.testimonialsTitle}
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12">
            ลูกค้ากว่า 50+ ธุรกิจเติบโตไปพร้อมเรา
          </p>

          {/* Auto-sliding Testimonial Carousel */}
          <div className="relative">
            <div className="flex animate-scroll-testimonials">
              {/* First set of testimonials */}
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial1Quote}
                  name={t.testimonial1Name}
                  role={t.testimonial1Role}
                  company={t.testimonial1Company}
                  index={0}
                />
              </div>
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial2Quote}
                  name={t.testimonial2Name}
                  role={t.testimonial2Role}
                  company={t.testimonial2Company}
                  index={1}
                />
              </div>
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial3Quote}
                  name={t.testimonial3Name}
                  role={t.testimonial3Role}
                  company={t.testimonial3Company}
                  index={2}
                />
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial1Quote}
                  name={t.testimonial1Name}
                  role={t.testimonial1Role}
                  company={t.testimonial1Company}
                  index={0}
                />
              </div>
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial2Quote}
                  name={t.testimonial2Name}
                  role={t.testimonial2Role}
                  company={t.testimonial2Company}
                  index={1}
                />
              </div>
              <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                <TestimonialCard
                  quote={t.testimonial3Quote}
                  name={t.testimonial3Name}
                  role={t.testimonial3Role}
                  company={t.testimonial3Company}
                  index={2}
                />
              </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes scroll-testimonials {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-scroll-testimonials {
            animation: scroll-testimonials 25s linear infinite;
          }
          .animate-scroll-testimonials:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>

      {/* ========================================
          INDUSTRY CASE SECTION
          ======================================== */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            ธุรกิจไหนเหมาะใช้ CRM?
          </h2>
          <p className="text-center text-gray-400 text-lg mb-12">
            ไม่ว่าธุรกิจไหน ถ้ามี Lead เข้ามาทุกวัน Dummi ช่วยคุณได้
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* E-commerce */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                <ShoppingBag className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">E-commerce / ขายออนไลน์</h3>
              <p className="text-gray-400 text-sm mb-4">
                ลูกค้าทักมาจาก LINE, FB รวมไว้ที่เดียว ไม่พลาดทุก Order
              </p>
              <div className="bg-emerald-500/10 rounded-lg p-3">
                <p className="text-xs text-emerald-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">ร้านเสื้อผ้า เพิ่มยอดขาย 3x ใน 2 เดือน ด้วยการ Follow-up อัตโนมัติ</p>
              </div>
            </div>

            {/* Clinic / Beauty */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                <Stethoscope className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">คลินิก / ความงาม</h3>
              <p className="text-gray-400 text-sm mb-4">
                จัดการนัดหมาย ติดตาม Treatment ลูกค้ากลับมาซ้ำแน่นอน
              </p>
              <div className="bg-pink-500/10 rounded-lg p-3">
                <p className="text-xs text-pink-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">คลินิกความงาม ลด No-show 60% ด้วยระบบแจ้งเตือนนัด</p>
              </div>
            </div>

            {/* Restaurant / Food */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <Utensils className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ร้านอาหาร / Catering</h3>
              <p className="text-gray-400 text-sm mb-4">
                รับออเดอร์จาก Social ง่าย ติดตามลูกค้าประจำได้สะดวก
              </p>
              <div className="bg-orange-500/10 rounded-lg p-3">
                <p className="text-xs text-orange-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">ร้านเค้ก เพิ่มลูกค้าประจำ 40% ด้วยโปรโมชั่นวันเกิด</p>
              </div>
            </div>

            {/* Real Estate */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Building2 className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">อสังหาริมทรัพย์</h3>
              <p className="text-gray-400 text-sm mb-4">
                ติดตาม Lead ทุก Stage ตั้งแต่สนใจจนถึงปิดการขาย
              </p>
              <div className="bg-blue-500/10 rounded-lg p-3">
                <p className="text-xs text-blue-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">โครงการบ้าน ปิดการขายเพิ่ม 25% ด้วย Pipeline ที่ชัดเจน</p>
              </div>
            </div>

            {/* Car Sales */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Car className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ขายรถ / มอเตอร์ไซค์</h3>
              <p className="text-gray-400 text-sm mb-4">
                Deal ราคาสูง ติดตามทุก Touch Point จนปิดการขาย
              </p>
              <div className="bg-purple-500/10 rounded-lg p-3">
                <p className="text-xs text-purple-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">เต็นท์รถมือสอง ลด Lost Lead 70% รู้ทุกคนที่ติดต่อมา</p>
              </div>
            </div>

            {/* Finance / Insurance */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                <Wallet className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">สินเชื่อ / ประกันภัย</h3>
              <p className="text-gray-400 text-sm mb-4">
                จัดการเคส ติดตามเอกสาร ไม่มี Lead หลุดแม้แต่คนเดียว
              </p>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <p className="text-xs text-yellow-400 font-medium">Case Study:</p>
                <p className="text-xs text-gray-300">ทีมประกัน เพิ่ม Conversion 35% ด้วย Follow-up ตรงเวลา</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          PRICING SECTION - DESIRE
          ======================================== */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            {t.pricingTitle}
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12">{t.noHiddenFees}</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* One-Time Investment */}
            <Card className="p-8 border-2 border-gray-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-slate-800 rounded-full" />
                <h3 className="font-bold text-gray-900 text-xl">{t.oneTimeTitle}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-4 border-b border-gray-100">
                  <span className="text-gray-700 text-lg">{t.coreSetup}</span>
                  <span className="font-bold text-gray-900 text-xl">THB {t.coreSetupPrice}</span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-gray-100">
                  <span className="text-gray-700">{t.optionalApi}</span>
                  <span className="font-bold text-emerald-600 text-xl">+THB {t.optionalApiPrice}</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">{t.coreIncludes}</p>
            </Card>

            {/* Monthly MA */}
            <Card className="p-8 border-2 border-emerald-500 rounded-2xl bg-gradient-to-br from-emerald-50 to-white">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <h3 className="font-bold text-gray-900 text-xl">{t.monthlyTitle}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Starter */}
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-2 text-lg">{t.starterPlan}</p>
                  <p className="text-3xl font-bold text-gray-900">THB {t.starterPrice}<span className="text-base font-normal text-gray-500">/mo</span></p>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>{t.starterUsers}</p>
                    <p>{t.starterLeads}</p>
                  </div>
                </div>

                {/* Growth */}
                <div className="bg-emerald-500 rounded-xl p-5 text-white">
                  <p className="font-semibold mb-2 text-lg">{t.growthPlan}</p>
                  <p className="text-3xl font-bold">THB {t.growthPrice}<span className="text-base font-normal opacity-80">/mo</span></p>
                  <div className="mt-3 space-y-1 text-sm opacity-90">
                    <p>{t.growthUsers}</p>
                    <p>{t.growthLeads}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">{t.includes}</p>

              <a href="#contact" className="block mt-4">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-lg py-6 font-semibold">
                  {t.contactForDemo}
                </Button>
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================
          FAQ SECTION
          ======================================== */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t.faqTitle}</h2>

          <div className="space-y-4">
            {[
              { q: t.faq1Q, a: t.faq1A },
              { q: t.faq2Q, a: t.faq2A },
              { q: t.faq3Q, a: t.faq3A },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">{item.q}</h3>
                <p className="text-base text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          CTA / CONTACT SECTION - ACTION
          ======================================== */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t.ctaTitle}</h2>
          </div>

          <Card className="p-8 md:p-10 border-2 border-gray-200 rounded-2xl">
            {submitStatus === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-900">ขอบคุณครับ! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="บริษัท"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <input
                  type="tel"
                  placeholder="เบอร์โทร"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="px-5 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-xl font-semibold rounded-xl disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังส่ง...' : t.ctaBtn}
                    <ArrowRight className="ml-2 w-6 h-6" />
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* ========================================
          FOOTER
          ======================================== */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo />
                <span className="font-semibold text-lg">Dummi & Co</span>
              </div>
              <p className="text-base text-gray-400">{t.footerDesc}</p>
              <div className="flex gap-3 mt-4">
                <LineIcon className="w-6 h-6 text-[#00C300]" />
                <MessengerIcon className="w-6 h-6 text-[#0084FF]" />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-lg">Links</h4>
              <ul className="space-y-2 text-base text-gray-400">
                <li><a href="#how-it-works" className="hover:text-emerald-400">{t.howItWorks}</a></li>
                <li><a href="#pricing" className="hover:text-emerald-400">{t.pricing}</a></li>
                <li><a href="#contact" className="hover:text-emerald-400">{t.contact}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-lg">Contact</h4>
              <div className="space-y-3 text-base text-gray-400">
                <p className="flex items-center gap-2"><Mail className="w-5 h-5 flex-shrink-0" /> sales@dummiandco.com</p>
                <p className="flex items-center gap-2"><Phone className="w-5 h-5 flex-shrink-0" /> 02-4609214</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p>62 ซ.สวนสยาม 2 ถนนสวนสยาม</p>
                    <p>แขวงคันนายาว เขตคันนายาว</p>
                    <p>กรุงเทพฯ 10230</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-base text-gray-500">
            <p className="mb-2">บริษัท ดัมมี่ แอนด์ โค จำกัด</p>
            <p>© 2025 Dummi & Co. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default SalesPage
