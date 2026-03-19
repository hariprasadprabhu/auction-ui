import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then(m => m.Home)
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/signup/signup').then(m => m.Signup)
  },
  {
    path: 'register/:tournamentId',
    loadComponent: () => import('./player/register/register').then(m => m.Register)
  },
];
