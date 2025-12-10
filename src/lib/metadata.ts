import { createClient } from '@/lib/supabase/server'

// Cache for system settings to avoid multiple database calls
let settingsCache: { app_name?: string; app_description?: string } | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function getSystemSettings() {
  const now = Date.now()
  
  // Return cached settings if still valid
  if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return settingsCache
  }

  try {
    const supabase = await createClient()
    
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['app_name', 'app_description'])
    
    if (settings) {
      settingsCache = {
        app_name: settings.find(s => s.key === 'app_name')?.value || 'Leaniverse.co',
        app_description: settings.find(s => s.key === 'app_description')?.value || 'Modern SaaS Platform'
      }
      cacheTimestamp = now
    }
  } catch (error) {
    console.error('Failed to fetch system settings for metadata:', error)
    // Use fallback values if database is unavailable
    settingsCache = {
      app_name: 'Leaniverse.co',
      app_description: 'Modern SaaS Platform'
    }
  }

  return settingsCache || { app_name: 'Leaniverse.co', app_description: 'Modern SaaS Platform' }
}

export async function generatePageTitle(currentPage: string): Promise<string> {
  const settings = await getSystemSettings()
  return `${currentPage} - ${settings.app_name} ${settings.app_description}`
}

export async function generatePageMetadata(currentPage: string, description?: string) {
  const settings = await getSystemSettings()
  const title = `${currentPage} - ${settings.app_name} ${settings.app_description}`
  
  return {
    title,
    description: description || `${currentPage} on ${settings.app_name} - ${settings.app_description}`
  }
}