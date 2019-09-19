import { HttpClient, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpAuthService } from '@app/http-auth/http-auth.service';

export const AUTH_PROVIDER = new InjectionToken<IAuthService>('AUTH_PROVIDER');

export interface IAuthInterceptor {
    init(service: HttpAuthService);
}

export enum AuthStatus {
    /**
     * Все ок
     * -> Refreshing
     * -> Unauthorized
     */
    Online = 'online',

    /**
     * Только запустился сервис
     * -> Online
     * -> Refreshing
     * -> Unauthorized
     */
    Starting = 'starting',

    /**
     * Получаем access_token
     * -> Online
     * -> Unauthorized
     */
    Refreshing = 'refreshing',

    /**
     * Есть нихрена или только он
     */
    Unauthorized = 'unauthorized',
}

export interface IAuthService {
    /**
     * Проверяет, может ли запрос обработан немедленно
     * если нет, запрос становится очередь и будет выполнен после смены статуса
     * @param req
     */
    canRequest?(req?: HttpRequest<any>): boolean;

    /**
     * Подготовить запрос вручную (токен уже добавлен)
     * нельзя изменять очередь запросов
     * @param request
     */
    prepareRequest?(request: HttpRequest<any>): HttpRequest<any>;

    /**
     * Запустить авторизацию пользователя
     * потому что текущая авторизация отстствует или невалидна
     */
    authorize(backPath?: string): void;

    isNeedRefresh(req?: HttpRequest<any>): Promise<boolean>;
    getAccessToken(req?: HttpRequest<any>): Promise<string>;
    getTokenType?(req?: HttpRequest<any>): string;
    refreshToken(req?: HttpRequest<any>): Promise<boolean>;
    login(backUri?: string | string[]): void;
    logout(): void;
    response?(request: HttpRequest<any>, response: HttpResponse<any>);
    errorHandler?(req: HttpRequest<any>, error: HttpErrorResponse);
}

export class TokenNotExistsError extends Error {
}

export function sleep(timeout = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
