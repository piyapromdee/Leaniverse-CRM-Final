// Email template configurations for Dummi & Co

// Helper function to get base URL for assets
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return window.location.origin
  }
  // Server-side: use environment variable or localhost
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export interface EmailTemplate {
  id: string
  name: string
  description: string
  thumbnail: string
  category: 'promotional' | 'newsletter' | 'transactional' | 'welcome' | 'announcement'
  content: string
  variables: string[]
}

// Brand colors aligned with Dummi & Co CI
export const brandColors = {
  primary: '#14b8a6', // Teal-500 - Main brand color from logo
  primaryDark: '#0f766e', // Teal-700
  primaryLight: '#5eead4', // Teal-300
  secondary: '#10b981', // Emerald-500
  text: '#1f2937', // Gray-800
  textLight: '#6b7280', // Gray-500
  background: '#ffffff',
  backgroundLight: '#f0fdfa', // Teal-50
  border: '#e5e7eb', // Gray-200
  success: '#10b981', // Green-500
  warning: '#f59e0b', // Amber-500
  error: '#ef4444', // Red-500
}

// Base email styles
const baseStyles = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${brandColors.text};
      background-color: ${brandColors.backgroundLight};
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${brandColors.background};
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    
    .header {
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%);
      padding: 30px 40px;
      text-align: center;
    }
    
    .logo {
      max-width: 180px;
      height: auto;
    }
    
    .content {
      padding: 40px;
    }
    
    h1 {
      color: ${brandColors.text};
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.3;
    }
    
    h2 {
      color: ${brandColors.text};
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 15px;
      margin-top: 30px;
    }
    
    p {
      color: ${brandColors.textLight};
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: all 0.3s ease;
    }
    
    .button:hover {
      background: linear-gradient(135deg, ${brandColors.primaryDark} 0%, ${brandColors.primaryDark} 100%);
    }
    
    .button-secondary {
      background: ${brandColors.background};
      color: ${brandColors.primary};
      border: 2px solid ${brandColors.primary};
    }
    
    .button-secondary:hover {
      background: ${brandColors.backgroundLight};
    }
    
    .footer {
      background-color: ${brandColors.backgroundLight};
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid ${brandColors.border};
    }
    
    .footer p {
      font-size: 14px;
      color: ${brandColors.textLight};
      margin-bottom: 10px;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: ${brandColors.primary};
      text-decoration: none;
    }
    
    .divider {
      height: 1px;
      background-color: ${brandColors.border};
      margin: 30px 0;
    }
    
    .highlight-box {
      background-color: ${brandColors.backgroundLight};
      border-left: 4px solid ${brandColors.primary};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .stats-container {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      text-align: center;
    }
    
    .stat-item {
      flex: 1;
    }
    
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: ${brandColors.primary};
      display: block;
    }
    
    .stat-label {
      font-size: 14px;
      color: ${brandColors.textLight};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
      
      .header {
        padding: 20px;
      }
      
      h1 {
        font-size: 24px;
      }
      
      .stats-container {
        flex-direction: column;
      }
      
      .stat-item {
        margin-bottom: 20px;
      }
    }
  </style>
`

// Email templates
export const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Welcome new subscribers with a professional branded email',
    thumbnail: '/templates/welcome-thumb.png',
    category: 'welcome',
    variables: ['first_name', 'company_name'],
    content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Dummi & Co</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="http://localhost:3000/dummi-co-logo-new.jpg" alt="Dummi & Co" class="logo" style="width: 120px; height: auto; display: block; margin: 0 auto;">
          </div>
          
          <div class="content">
            <h1>Welcome to Dummi & Co, {{first_name}}! 🎉</h1>
            
            <p>We're thrilled to have you join our community of forward-thinking professionals.</p>
            
            <div class="highlight-box">
              <p><strong>Here's what you can expect from us:</strong></p>
              <ul style="margin-left: 20px; color: ${brandColors.textLight};">
                <li>Industry insights and best practices</li>
                <li>Exclusive offers and early access to new features</li>
                <li>Tips to maximize your success with our platform</li>
              </ul>
            </div>
            
            <p>Ready to get started? Let's make great things happen together!</p>
            
            <div style="text-align: center;">
              <a href="https://yourdomain.com/get-started" class="button">Get Started</a>
            </div>
            
            <div class="divider"></div>
            
            <p>If you have any questions, our support team is here to help you every step of the way.</p>
          </div>
          
          <div class="footer">
            <p><strong>Dummi & Co</strong></p>
            <p>Your Success is Our Mission</p>
            <div class="social-links">
              <a href="#">LinkedIn</a>
              <a href="#">Twitter</a>
              <a href="#">Facebook</a>
            </div>
            <p style="font-size: 12px; margin-top: 20px;">
              © 2024 Dummi & Co. All rights reserved.<br>
              123 Business Ave, Suite 100, San Francisco, CA 94107
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: 'promotional',
    name: 'Promotional Campaign',
    description: 'Drive sales with an eye-catching promotional email',
    thumbnail: '/templates/promo-thumb.png',
    category: 'promotional',
    variables: ['first_name', 'discount_percent', 'promo_code'],
    content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Special Offer from Dummi & Co</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="http://localhost:3000/dummi-co-logo-new.jpg" alt="Dummi & Co" class="logo" style="width: 120px; height: auto; display: block; margin: 0 auto;">
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <h1 style="color: ${brandColors.primary};">{{discount_percent}}% OFF</h1>
              <p style="font-size: 20px; font-weight: 600;">Exclusive Offer for {{first_name}}</p>
            </div>
            
            <div class="highlight-box" style="text-align: center; background: linear-gradient(135deg, ${brandColors.backgroundLight}, white);">
              <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: ${brandColors.textLight};">Use Code</p>
              <p style="font-size: 28px; font-weight: 700; color: ${brandColors.primary}; letter-spacing: 3px;">{{promo_code}}</p>
            </div>
            
            <p>Don't miss out on this limited-time opportunity to supercharge your business with Dummi & Co's premium solutions.</p>
            
            <div class="stats-container">
              <div class="stat-item">
                <span class="stat-number">{{discount_percent}}%</span>
                <span class="stat-label">Savings</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">48h</span>
                <span class="stat-label">Limited Time</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">100+</span>
                <span class="stat-label">Happy Clients</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://yourdomain.com/claim-offer" class="button">Claim Your Discount</a>
            </div>
            
            <p style="text-align: center; font-size: 14px; color: ${brandColors.textLight};">
              *Offer expires in 48 hours. Terms and conditions apply.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Dummi & Co</strong></p>
            <p>Your Success is Our Mission</p>
            <p style="font-size: 12px; margin-top: 20px;">
              © 2024 Dummi & Co. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    description: 'Keep your audience engaged with regular updates',
    thumbnail: '/templates/newsletter-thumb.png',
    category: 'newsletter',
    variables: ['first_name', 'month', 'year'],
    content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dummi & Co Newsletter</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="http://localhost:3000/dummi-co-logo-new.jpg" alt="Dummi & Co" class="logo" style="width: 120px; height: auto; display: block; margin: 0 auto;">
            <p style="color: white; margin-top: 15px; font-size: 18px;">{{month}} {{year}} Newsletter</p>
          </div>
          
          <div class="content">
            <h1>Hello {{first_name}}, here's what's new!</h1>
            
            <div style="background: linear-gradient(135deg, ${brandColors.backgroundLight}, white); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: ${brandColors.primary};">📈 This Month's Highlights</h2>
              <ul style="color: ${brandColors.textLight}; margin-left: 20px;">
                <li>New feature launch: Advanced Analytics Dashboard</li>
                <li>Case study: How Company X increased revenue by 150%</li>
                <li>Upcoming webinar: "Mastering CRM in 2024"</li>
              </ul>
            </div>
            
            <h2>Featured Article</h2>
            <p>Discover how modern CRM systems are revolutionizing customer relationships and driving unprecedented growth for businesses worldwide.</p>
            <a href="#" class="button-secondary">Read More</a>
            
            <div class="divider"></div>
            
            <h2>Success Story of the Month</h2>
            <div class="highlight-box">
              <p>"Dummi & Co transformed our sales process. We've seen a 200% increase in qualified leads!"</p>
              <p style="text-align: right; font-style: italic;">- Sarah Johnson, CEO of TechStart</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://yourdomain.com/explore" class="button">Explore More Stories</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Stay Connected</strong></p>
            <div class="social-links">
              <a href="#">LinkedIn</a>
              <a href="#">Twitter</a>
              <a href="#">Facebook</a>
            </div>
            <p style="font-size: 12px;">
              © 2024 Dummi & Co. All rights reserved.<br>
              <a href="#" style="color: ${brandColors.primary};">Unsubscribe</a> | 
              <a href="#" style="color: ${brandColors.primary};">Update Preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: 'announcement',
    name: 'Product Announcement',
    description: 'Announce new features or products with style',
    thumbnail: '/templates/announce-thumb.png',
    category: 'announcement',
    variables: ['first_name', 'product_name', 'launch_date'],
    content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Big Announcement from Dummi & Co</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header" style="background: linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%);">
            <img src="http://localhost:3000/dummi-co-logo-new.jpg" alt="Dummi & Co" class="logo" style="width: 120px; height: auto; display: block; margin: 0 auto;">
            <h1 style="color: white; margin-top: 20px; font-size: 32px;">🚀 Big Announcement!</h1>
          </div>
          
          <div class="content">
            <h1>Introducing {{product_name}}</h1>
            <p style="font-size: 18px; color: ${brandColors.primary}; font-weight: 600;">
              The future of business automation is here, {{first_name}}!
            </p>
            
            <div style="background: linear-gradient(135deg, ${brandColors.backgroundLight}, white); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: ${brandColors.textLight};">Launching</p>
              <p style="font-size: 24px; font-weight: 700; color: ${brandColors.primary};">{{launch_date}}</p>
            </div>
            
            <h2>What's New?</h2>
            <div class="highlight-box">
              <ul style="margin-left: 20px; color: ${brandColors.textLight};">
                <li><strong>AI-Powered Insights:</strong> Make data-driven decisions faster</li>
                <li><strong>Seamless Integration:</strong> Connect with 100+ business tools</li>
                <li><strong>Advanced Automation:</strong> Save 10+ hours per week</li>
                <li><strong>Real-time Collaboration:</strong> Work better as a team</li>
              </ul>
            </div>
            
            <div class="stats-container">
              <div class="stat-item">
                <span class="stat-number">50%</span>
                <span class="stat-label">More Efficient</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">3x</span>
                <span class="stat-label">Faster Results</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">24/7</span>
                <span class="stat-label">Support</span>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://yourdomain.com/early-access" class="button">Get Early Access</a>
              <p style="font-size: 14px; color: ${brandColors.textLight}; margin-top: 10px;">
                Be among the first 100 users to get exclusive benefits!
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Dummi & Co</strong></p>
            <p>Innovation Meets Excellence</p>
            <p style="font-size: 12px; margin-top: 20px;">
              © 2024 Dummi & Co. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  {
    id: 'transactional',
    name: 'Order Confirmation',
    description: 'Professional transaction and order confirmations',
    thumbnail: '/templates/transaction-thumb.png',
    category: 'transactional',
    variables: ['first_name', 'order_number', 'total_amount', 'product_name'],
    content: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Dummi & Co</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="http://localhost:3000/dummi-co-logo-new.jpg" alt="Dummi & Co" class="logo" style="width: 120px; height: auto; display: block; margin: 0 auto;">
          </div>
          
          <div class="content">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, ${brandColors.primary}, ${brandColors.primaryDark}); border-radius: 50%; line-height: 60px; color: white; font-size: 24px;">✓</div>
              <h1 style="margin-top: 20px;">Order Confirmed!</h1>
              <p style="color: ${brandColors.textLight};">Thank you for your purchase, {{first_name}}</p>
            </div>
            
            <div style="background-color: ${brandColors.backgroundLight}; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 14px; color: ${brandColors.textLight}; margin-bottom: 5px;">Order Number</p>
              <p style="font-size: 20px; font-weight: 600; color: ${brandColors.text};">#{{order_number}}</p>
            </div>
            
            <h2>Order Details</h2>
            <div style="border: 1px solid ${brandColors.border}; border-radius: 8px; padding: 20px;">
              <p><strong>Product:</strong> {{product_name}}</p>
              <p><strong>Amount:</strong> <span style="color: ${brandColors.primary}; font-size: 18px; font-weight: 600;">$\{{total_amount}}</span></p>
              <p><strong>Payment Status:</strong> <span style="color: ${brandColors.success};">✓ Completed</span></p>
            </div>
            
            <div class="divider"></div>
            
            <h2>What's Next?</h2>
            <p>You'll receive another email with your account details and getting started guide within the next few minutes.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://yourdomain.com/account" class="button">Access Your Account</a>
            </div>
            
            <div class="highlight-box">
              <p><strong>Need Help?</strong></p>
              <p>Our support team is available 24/7 to assist you. Reply to this email or visit our help center.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Dummi & Co</strong></p>
            <p>Thank you for choosing us!</p>
            <p style="font-size: 12px; margin-top: 20px;">
              © 2024 Dummi & Co. All rights reserved.<br>
              This is a transactional email regarding order #{{order_number}}
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }
]

// Function to get template by ID
export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find(template => template.id === id)
}

// Function to get templates by category
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return emailTemplates.filter(template => template.category === category)
}

// Function to process template with actual data
export function processTemplate(template: string, data: Record<string, any>): string {
  let processedTemplate = template
  
  // Replace variables with actual data
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
    processedTemplate = processedTemplate.replace(regex, data[key] || '')
  })
  
  // Remove any remaining unreplaced variables
  processedTemplate = processedTemplate.replace(/{{[^}]+}}/g, '')
  
  // Update logo URL if provided
  if (data.logo_url) {
    processedTemplate = processedTemplate.replace(
      /https:\/\/yourdomain\.com\/dummi-co-logo\.png/g,
      data.logo_url
    )
  }

  // Fix logo URLs for local development and production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  processedTemplate = processedTemplate.replace(
    /\$\{process\.env\.NEXT_PUBLIC_SITE_URL \|\| 'http:\/\/localhost:3000'\}/g,
    siteUrl
  )
  
  return processedTemplate
}