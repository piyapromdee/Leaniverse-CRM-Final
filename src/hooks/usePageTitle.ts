'use client'

import { useEffect, useState } from 'react'

interface SystemSettings {
  app_name: string
  app_description: string
}

let cachedSettings: SystemSettings | null = null

export function usePageTitle(currentPage: string) {
  const [settings, setSettings] = useState<SystemSettings | null>(cachedSettings)

  useEffect(() => {
    if (!cachedSettings) {
      fetchSettings()
    }
  }, [])

  useEffect(() => {
    if (settings) {
      const title = `${currentPage} - ${settings.app_name} ${settings.app_description}`
      document.title = title
    }
  }, [currentPage, settings])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/public/app-info')
      if (response.ok) {
        const appSettings = await response.json()
        cachedSettings = appSettings
        setSettings(appSettings)
      }
    } catch (error) {
      console.error('Failed to fetch settings for page title:', error)
      // Use fallback
      const fallback = {
        app_name: 'Leaniverse.co',
        app_description: 'Modern SaaS Platform'
      }
      cachedSettings = fallback
      setSettings(fallback)
    }
  }

  return settings
}

// Helper function to update title immediately
export function updatePageTitle(currentPage: string, appName?: string, appDescription?: string) {
  if (typeof window !== 'undefined') {
    const name = appName || cachedSettings?.app_name || 'Leaniverse.co'
    const desc = appDescription || cachedSettings?.app_description || 'Modern SaaS Platform'
    document.title = `${currentPage} - ${name} ${desc}`
  }
}