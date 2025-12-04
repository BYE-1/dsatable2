import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  
  // If no token exists, redirect to login
  if (!token) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // If token exists, check if we have a stored user
  const currentUser = authService.getCurrentUser();
  
  // If we have both token and user, allow access immediately
  // Token will be validated on API calls via interceptor
  if (currentUser) {
    return true;
  }

  // If we have token but no user (e.g., after page refresh),
  // validate the token by fetching current user from server
  return authService.getCurrentUserFromServer().pipe(
    map(() => true),
    catchError(() => {
      // Token is invalid, redirect to login
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};

