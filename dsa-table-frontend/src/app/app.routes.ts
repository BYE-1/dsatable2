import { Routes } from '@angular/router';
import { CharacterListComponent } from './components/character-list/character-list.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { GameSessionListComponent } from './components/game-session-list/game-session-list.component';
import { GameSessionDetailComponent } from './components/game-session-detail/game-session-detail.component';
import { GameSessionFormComponent } from './components/game-session-form/game-session-form.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'characters', component: CharacterListComponent, canActivate: [authGuard] },
  { path: 'sessions', component: GameSessionListComponent, canActivate: [authGuard] },
  { path: 'sessions/new', component: GameSessionFormComponent, canActivate: [authGuard] },
  { path: 'sessions/:id', component: GameSessionDetailComponent, canActivate: [authGuard] },
  { path: 'sessions/:id/edit', component: GameSessionFormComponent, canActivate: [authGuard] }
];
