import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface SavedMap {
  id: number;
  name: string;
  dataParam: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedMapRequest {
  name: string;
  dataParam: string;
}

@Injectable({
  providedIn: 'root'
})
export class SavedMapsService {
  private apiUrl = `${environment.apiUrl}/saved-maps`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllMaps(): Observable<SavedMap[]> {
    return this.http.get<SavedMap[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getMapById(id: number): Observable<SavedMap> {
    return this.http.get<SavedMap>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  saveMap(name: string, dataParam: string): Observable<SavedMap> {
    const request: SavedMapRequest = { name, dataParam };
    return this.http.post<SavedMap>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  updateMap(id: number, name: string, dataParam: string): Observable<SavedMap> {
    const request: SavedMapRequest = { name, dataParam };
    return this.http.put<SavedMap>(`${this.apiUrl}/${id}`, request, { headers: this.getHeaders() });
  }

  deleteMap(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}

