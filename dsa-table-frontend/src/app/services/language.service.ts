import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Language = 'en' | 'de';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'app_language';
  private currentLanguageSubject = new BehaviorSubject<Language>(this.getStoredLanguage());
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor() {
    // Initialize with stored language or default to 'en'
    const stored = this.getStoredLanguage();
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, stored);
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  setLanguage(lang: Language): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.currentLanguageSubject.next(lang);
  }

  private getStoredLanguage(): Language {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return (stored === 'en' || stored === 'de') ? stored : 'en';
  }
}

