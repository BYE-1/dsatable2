import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Character, HeroProperty } from '../models/character.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  private apiUrl = `${environment.apiUrl}/characters`;

  constructor(private http: HttpClient) {}

  getAllCharacters(ownerId?: number, sessionId?: number): Observable<Character[]> {
    let params = new HttpParams();
    if (ownerId) params = params.set('ownerId', ownerId.toString());
    if (sessionId) params = params.set('sessionId', sessionId.toString());
    
    return this.http.get<Character[]>(this.apiUrl, { params });
  }

  getCharacterById(id: number): Observable<Character> {
    return this.http.get<Character>(`${this.apiUrl}/${id}`);
  }

  createCharacter(character: Character): Observable<Character> {
    return this.http.post<Character>(this.apiUrl, character);
  }

  updateCharacter(id: number, character: Character): Observable<Character> {
    return this.http.put<Character>(`${this.apiUrl}/${id}`, character);
  }

  deleteCharacter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCharacterProperties(id: number): Observable<HeroProperty[]> {
    return this.http.get<HeroProperty[]>(`${this.apiUrl}/${id}/properties`);
  }

  updateCharacterProperties(id: number, properties: HeroProperty[]): Observable<HeroProperty[]> {
    return this.http.put<HeroProperty[]>(`${this.apiUrl}/${id}/properties`, properties);
  }

  updateCharacterProperty(id: number, propertyName: string, value: number): Observable<HeroProperty> {
    return this.http.put<HeroProperty>(`${this.apiUrl}/${id}/properties/${propertyName}`, { value });
  }

  uploadCharacterFromXml(file: File, sessionId?: number): Observable<Character> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
      formData.append('sessionId', sessionId.toString());
    }
    return this.http.post<Character>(`${this.apiUrl}/upload-xml`, formData);
  }
}


