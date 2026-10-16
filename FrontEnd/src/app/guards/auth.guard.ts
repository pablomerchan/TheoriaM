import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../core/session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);

  return session.estaAutenticado()
    ? true
    : router.createUrlTree(['/is'], {
        queryParams: { returnUrl: state.url }
      });
};
