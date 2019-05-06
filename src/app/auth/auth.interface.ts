import { HttpClient, HttpRequest } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export const AUTH_PROVIDER = new InjectionToken<IAuthService>('AUTH_PROVIDER');

export interface IAuthInterceptor {
    init(http: HttpClient, auth: IAuthService);
}

export interface IAuthService {
    getAccessToken(req?: HttpRequest<any>): string;
    refreshToken(req?: HttpRequest<any>): Observable<any>;
    logout(): void;
}

export class TokenNotExistsError extends Error {}
