import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Protected routes
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  let user = null;
  try {
    const {
      data: { user: fetchedUser },
      error,
    } = await supabase.auth.getUser();
    
    if (error) {
      // Only log errors on protected paths or unexpected errors
      // "Auth session missing" on public routes is expected and shouldn't be logged
      const isExpectedError = 
        error.message?.includes('session missing') || 
        error.message?.includes('JWT expired') ||
        error.message?.includes('Invalid Refresh Token');
      
      if (isProtectedPath || !isExpectedError) {
        console.error('Auth error in middleware:', error.message);
      }
    } else {
      user = fetchedUser;
    }
  } catch (error) {
    // Handle network errors or Supabase being unavailable
    // These are always unexpected and should be logged
    console.error('Failed to fetch user in middleware:', error);
    // Continue without user - let the request proceed
    // This prevents the app from crashing if Supabase is temporarily unavailable
  }

  if (isProtectedPath && !user) {
    // No user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

