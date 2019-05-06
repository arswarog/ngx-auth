import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export const AUTH_PROVIDER = new InjectionToken<IAuthService>('AUTH_PROVIDER');

export interface IAuthInterceptor {
    init(http: HttpClient, auth: IAuthService);
}

export interface IAuthService {
    getAccessToken(req?: HttpRequest<any>): Promise<string>;
    getTokenType?(req?: HttpRequest<any>): string;
    refreshToken(req?: HttpRequest<any>): Observable<any>;
    logout(): void;
    response?(request: HttpRequest<any>, response: HttpResponse<any>);

    /**
     * Подготовить завпрос вручную (токен уже добавлен)
     * @param request
     */
    prepareRequest?(request: HttpRequest<any>): HttpRequest<any>;
}

export class TokenNotExistsError extends Error {
}
