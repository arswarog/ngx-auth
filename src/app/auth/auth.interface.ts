import { HttpClient } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export const AUTH_PROVIDER = new InjectionToken<IAuthService>('AUTH_PROVIDER');

export interface AuthInterceptor {
    init(http: HttpClient, auth: IAuthService);
}

export interface IAuthService {
    token(url?: string): string;
    renewToken(url?: string): Observable<any>;
    logout(): void;
}
