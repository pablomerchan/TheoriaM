import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem('theoriam_token');

  return token
    ? true
    : router.createUrlTree(['/is'], {
        queryParams: { returnUrl: state.url }
      });
};
