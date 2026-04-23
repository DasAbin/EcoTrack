import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Auth protection
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isPublicPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/org/') || isAuthPage

  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, name, age, occupation')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.name || !profile.age || !profile.occupation) {
      if (request.nextUrl.pathname !== '/onboarding' && !isAuthPage) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } else if (isAuthPage || request.nextUrl.pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}
