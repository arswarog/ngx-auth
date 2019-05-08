import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export const AUTH_PROVIDER = new InjectionToken<IAuthService>('AUTH_PROVIDER');

export interface IAuthInterceptor {
    init(http: HttpClient, auth: IAuthService);
}

export enum AuthStatus {
    Starting,
    Refreshing,
    Loging,
    Unauthorized,
}

export interface IAuthService {
    authStatus$: BehaviorSubject<AuthStatus>;
    getAccessToken(req?: HttpRequest<any>): Promise<string>;
    getTokenType?(req?: HttpRequest<any>): string;
    refreshToken(req?: HttpRequest<any>): Observable<any>;
    login(backUri?: string | string[]): void;
    logout(): void;
    response?(request: HttpRequest<any>, response: HttpResponse<any>);

    /**
     * Подготовить запрос вручную (токен уже добавлен)
     * @param request
     */
    prepareRequest?(request: HttpRequest<any>): HttpRequest<any>;
}

export class TokenNotExistsError extends Error {
}

export function sleep(timeout = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
