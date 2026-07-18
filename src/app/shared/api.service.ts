/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { auth } from './firebase';
import { from, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  private getAuthHeaders(): Observable<HttpHeaders> {
    return from(auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)).pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return from([headers]);
      })
    );
  }

  get<T>(url: string): Observable<T> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get<T>(url, { headers }))
    );
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post<T>(url, body, { headers }))
    );
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.put<T>(url, body, { headers }))
    );
  }

  delete<T>(url: string): Observable<T> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.delete<T>(url, { headers }))
    );
  }
}
