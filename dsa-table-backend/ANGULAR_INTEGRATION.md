# Angular Integration Guide

This backend is configured to work seamlessly with Angular applications.

## Configuration

### CORS
- **Allowed Origins**: `http://localhost:4200` (Angular default dev server)
- **Allowed Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Credentials**: Enabled (for future authentication)

### Security
- CSRF disabled for stateless REST API
- All `/api/**` endpoints are publicly accessible
- Swagger UI available at `/swagger-ui.html`

## API Base URL

```
http://localhost:8080/api
```

## Example Angular Service

```typescript
// character.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Character {
  id?: number;
  name: string;
  race?: string;
  culture?: string;
  profession?: string;
  gender?: string;
  xp?: number;
  currentLife?: number;
  currentAsp?: number;
  currentKarma?: number;
  initiative?: number;
  properties?: HeroProperty[];
  talents?: Talent[];
  spells?: Spell[];
  combatTalents?: CombatTalent[];
  advantages?: Advantage[];
  specialities?: Speciality[];
}

export interface HeroProperty {
  id?: number;
  name: string;
  value: number;
}

export interface Talent {
  id?: number;
  name: string;
  check: string;
  value: number;
}

export interface Spell {
  id?: number;
  name: string;
  check: string;
  value: number;
}

export interface CombatTalent {
  id?: number;
  name: string;
  attack: number;
  parry: number;
}

export interface Advantage {
  id?: number;
  name: string;
  text?: string;
  additionalText?: string[];
}

export interface Speciality {
  id?: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getAllCharacters(ownerId?: number, sessionId?: number): Observable<Character[]> {
    let url = `${this.apiUrl}/characters`;
    const params: string[] = [];
    if (ownerId) params.push(`ownerId=${ownerId}`);
    if (sessionId) params.push(`sessionId=${sessionId}`);
    if (params.length > 0) url += '?' + params.join('&');
    return this.http.get<Character[]>(url);
  }

  getCharacterById(id: number): Observable<Character> {
    return this.http.get<Character>(`${this.apiUrl}/characters/${id}`);
  }

  createCharacter(character: Character): Observable<Character> {
    return this.http.post<Character>(`${this.apiUrl}/characters`, character);
  }

  updateCharacter(id: number, character: Character): Observable<Character> {
    return this.http.put<Character>(`${this.apiUrl}/characters/${id}`, character);
  }

  deleteCharacter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/characters/${id}`);
  }

  getCharacterProperties(id: number): Observable<HeroProperty[]> {
    return this.http.get<HeroProperty[]>(`${this.apiUrl}/characters/${id}/properties`);
  }

  updateCharacterProperties(id: number, properties: HeroProperty[]): Observable<HeroProperty[]> {
    return this.http.put<HeroProperty[]>(`${this.apiUrl}/characters/${id}/properties`, properties);
  }
}
```

## Example Angular Component

```typescript
// character-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CharacterService, Character } from './character.service';

@Component({
  selector: 'app-character-list',
  template: `
    <div *ngFor="let character of characters">
      <h3>{{ character.name }}</h3>
      <p>Race: {{ character.race }}, Profession: {{ character.profession }}</p>
      <p>LeP: {{ character.currentLife }}, ASP: {{ character.currentAsp }}</p>
    </div>
  `
})
export class CharacterListComponent implements OnInit {
  characters: Character[] = [];

  constructor(private characterService: CharacterService) {}

  ngOnInit() {
    this.characterService.getAllCharacters().subscribe(
      data => this.characters = data,
      error => console.error('Error loading characters', error)
    );
  }
}
```

## HTTP Interceptor (Optional)

For adding authentication headers later:

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // Add auth token here when implementing authentication
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${authToken}`)
      });
      return next.handle(cloned);
    }
    
    return next.handle(req);
  }
}
```

## Available Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Characters
- `GET /api/characters` - Get all characters (optional: `?ownerId=1` or `?sessionId=1`)
- `GET /api/characters/{id}` - Get character by ID
- `POST /api/characters` - Create character
- `PUT /api/characters/{id}` - Update character
- `DELETE /api/characters/{id}` - Delete character
- `GET /api/characters/{id}/properties` - Get character properties
- `PUT /api/characters/{id}/properties` - Update character properties
- `PUT /api/characters/{id}/properties/{propertyName}` - Update single property

### Game Sessions
- `GET /api/sessions` - Get all sessions (optional: `?gmId=1` or `?playerId=1`)
- `GET /api/sessions/{id}` - Get session by ID
- `POST /api/sessions` - Create session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session

## Testing with Swagger UI

Visit `http://localhost:8080/swagger-ui.html` to test all endpoints interactively.


