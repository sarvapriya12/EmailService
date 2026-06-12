export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string
  href: string
  active: boolean
  badgeText?: string
  gradient: string
  replacesName: string
  price: number
  isPerUser: boolean
}

export const APPS_LIST: AppDefinition[] = [
  {
    id: 'email',
    name: 'Automated mail',
    description: 'AI-powered support inbox, ticket routing, templates, and review pipelines.',
    icon: 'mail',
    href: '/mails',
    active: true,
    gradient: 'from-ezen-primary to-ezen-primary-container',
    replacesName: 'Mailchimp',
    price: 20.00,
    isPerUser: false,
  },
  {
    id: 'automated_call',
    name: 'Automated call',
    description: 'Autonomous voice support agents capable of handling live telephone calls.',
    icon: 'phone_in_talk',
    href: '#',
    active: false,
    badgeText: 'Coming Soon',
    gradient: 'from-ezen-outline/20 to-ezen-outline/40',
    replacesName: 'Aircall',
    price: 45.00,
    isPerUser: true,
  },
  {
    id: 'website_builder',
    name: 'Website builder',
    description: 'Generative builder to design and deploy high-converting landing pages.',
    icon: 'language',
    href: '#',
    active: false,
    badgeText: 'Coming Soon',
    gradient: 'from-ezen-outline/20 to-ezen-outline/40',
    replacesName: 'Wordpress',
    price: 25.00,
    isPerUser: false,
  },
  {
    id: 'whatsapp_replies',
    name: 'AI WhatsApp Replies',
    description: 'Automated smart response agent for WhatsApp Business chats.',
    icon: 'chat',
    href: '#',
    active: false,
    badgeText: 'Coming Soon',
    gradient: 'from-ezen-outline/20 to-ezen-outline/40',
    replacesName: 'Zendesk Chat',
    price: 30.00,
    isPerUser: true,
  },
  {
    id: 'instagram_replies',
    name: 'AI Instagram DM Replies',
    description: 'Context-aware AI replier for Instagram Direct Messages and comments.',
    icon: 'photo_camera',
    href: '#',
    active: false,
    badgeText: 'Coming Soon',
    gradient: 'from-ezen-outline/20 to-ezen-outline/40',
    replacesName: 'ManyChat',
    price: 15.00,
    isPerUser: true,
  },
]
