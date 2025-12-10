import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Fetch only app_name and app_description without authentication
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['app_name', 'app_description'])

    if (error) {
      console.error('Error fetching app info:', error)
      // Return fallback values
      return NextResponse.json({
        app_name: 'Leaniverse.co',
        app_description: 'Modern SaaS Platform'
      })
    }

    const appInfo = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      app_name: appInfo.app_name || 'Leaniverse.co',
      app_description: appInfo.app_description || 'Modern SaaS Platform'
    })
  } catch (error) {
    console.error('Error in app-info GET:', error)
    // Return fallback values
    return NextResponse.json({
      app_name: 'Leaniverse.co',
      app_description: 'Modern SaaS Platform'
    })
  }
}