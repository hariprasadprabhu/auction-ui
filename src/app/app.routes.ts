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
    path: 'admin',
    loadComponent: () => import('./admin/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'admin/teams/:tournamentId',
    loadComponent: () => import('./admin/teams/teams').then(m => m.Players)
  },
  {
    path: 'admin/teams-list/:tournamentId',
    loadComponent: () => import('./admin/teams-list/teams-list').then(m => m.TeamsListComponent)
  },
  {
    path: 'admin/auction/:tournamentId',
    loadComponent: () => import('./admin/auction/auction').then(m => m.Auction)
  },
  {
    path: 'admin/increments/:tournamentId',
    loadComponent: () => import('./admin/conditional-increments/conditional-increments').then(m => m.ConditionalIncrements)
  },
  {
    path: 'admin/owner-view/:tournamentId',
    loadComponent: () => import('./admin/owner-view/owner-view').then(m => m.OwnerView)
  },
  {
    path: 'register/:tournamentId',
    loadComponent: () => import('./player/register/register').then(m => m.Register)
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/signup/signup').then(m => m.Signup)
  }
];
