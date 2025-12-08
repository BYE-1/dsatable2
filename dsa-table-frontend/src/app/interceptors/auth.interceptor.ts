import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized responses (expired or invalid token)
      if (error.status === 401) {
        // Only handle if not already on login/register page and not already redirecting
        const currentUrl = router.url;
        if (!currentUrl.includes('/login') && !currentUrl.includes('/register') && !isRedirecting) {
          isRedirecting = true;
          
          // Clear auth state without navigating (logout() also navigates)
          authService.clearAuthState();
          
          // Navigate to login with return URL
          router.navigate(['/login'], { 
            queryParams: { returnUrl: currentUrl } 
          }).then(() => {
            // Reset flag after navigation completes
            setTimeout(() => { isRedirecting = false; }, 1000);
          });
        }
      }
      
      return throwError(() => error);
    })
  );
};

