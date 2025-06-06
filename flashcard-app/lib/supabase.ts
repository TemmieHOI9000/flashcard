// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { GetServerSidePropsContext } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for Pages Router)
export const createServerSupabaseClient = (ctx: GetServerSidePropsContext) => {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return ctx.req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieStr = `${name}=${value}; Path=${options.path ?? '/'}; HttpOnly`
        ctx.res.setHeader('Set-Cookie', cookieStr)
      },
      remove(name: string, options: CookieOptions) {
        const cookieStr = `${name}=; Path=${options.path ?? '/'}; Max-Age=0`
        ctx.res.setHeader('Set-Cookie', cookieStr)
      },
    },
  })
}
