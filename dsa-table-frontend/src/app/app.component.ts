import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';
import { LanguageSwitcherComponent } from './components/language-switcher/language-switcher.component';
import { User } from './models/auth.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DSA Table';
  currentUser: User | null = null;
  private languageSubscription?: Subscription;
  private userSubscription?: Subscription;

  constructor(
    public authService: AuthService,
    private translateService: TranslateService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Initialize translations
    this.translateService.setDefaultLang('en');
    const currentLang = this.languageService.getCurrentLanguage();
    
    // Load initial language
    this.translateService.use(currentLang).subscribe({
      next: () => {
        console.log('Initial language loaded:', currentLang);
      },
      error: (err) => {
        console.error('Error loading initial language:', err);
        // Fallback to default
        this.translateService.use('en');
      }
    });
    
    // Subscribe to language changes
    this.languageSubscription = this.languageService.currentLanguage$.subscribe(lang => {
      if (lang !== this.translateService.currentLang) {
        this.translateService.use(lang).subscribe({
          next: () => {
            console.log('Language changed to:', lang);
          },
          error: (err) => {
            console.error('Error changing language:', err);
          }
        });
      }
    });
    
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
