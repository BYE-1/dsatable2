import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="language-switcher">
      <button 
        type="button"
        class="language-button"
        [class.active]="currentLanguage === 'en'"
        (click)="setLanguage('en')"
        [attr.aria-label]="'Switch to English'"
        title="English">
        EN
      </button>
      <button 
        type="button"
        class="language-button"
        [class.active]="currentLanguage === 'de'"
        (click)="setLanguage('de')"
        [attr.aria-label]="'Switch to German'"
        title="Deutsch">
        DE
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      gap: 0;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .language-button {
      background: transparent;
      color: #fefcf8;
      border: none;
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border-right: 1px solid rgba(255, 255, 255, 0.2);
      min-width: 44px;
      text-align: center;
    }

    .language-button:last-child {
      border-right: none;
    }

    .language-button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .language-button.active {
      background: rgba(255, 255, 255, 0.25);
      font-weight: 600;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .language-button:active {
      transform: translateY(1px);
    }
  `]
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLanguage: Language = 'en';
  private subscription?: Subscription;

  constructor(
    private languageService: LanguageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.languageService.getCurrentLanguage();
    this.subscription = this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  setLanguage(lang: Language): void {
    this.languageService.setLanguage(lang);
  }
}

