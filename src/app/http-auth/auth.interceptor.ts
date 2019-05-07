import { HttpClient, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import * as Rx from 'rxjs/operators';
import { IAuthInterceptor, IAuthService } from './auth.interface';

interface CallerRequest {
    subscriber: Subscriber<any>;
    failedRequest: HttpRequest<any>;
    retries: number;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor, IAuthInterceptor {
    private auth: IAuthService;
    private http: HttpClient;
    private refreshInProgress: boolean;
    private requests: CallerRequest[] = [];

    public init(http: HttpClient, auth: IAuthService) {
        this.http = http;
        this.auth = auth;
    }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        console.log('*** request', request.url);
        // перехватываем только "наши" запросы
        // if (!req.url.includes('api/')) {
        //    return next.handle(req);
        // }

        // оборачиваем Observable из вызывающего кода своим, внутренним Observable
        // далее вернем вызывающему коду Observable, который под нашим контролем здесь
        const observable = new Observable<HttpEvent<any>>((subscriber) => {
            // как только вызывающий код сделает подписку мы попадаем сюда и подписываемся на наш HttpRequest
            // тобишь выполняем оригинальный запрос

            this.prepareRequest(request).then(
                req => {
                    console.log('*** request to real url', req.url);
                    const originalRequestSubscription
                        = next.handle(req)
                        .subscribe(
                            response => {
                                // оповещаем в инициатор (success) ответ от сервера
                                if (this.auth.response) {
                                    console.log('interceptoer');
                                    this.auth.response(request, response as any);
                                }
                                subscriber.next(response);
                            },
                            err => {
                                if (err.status === 401) {
                                    // если споймали 401ую - обрабатываем далее по нашему алгоритму
                                    this.handleUnauthorizedError(subscriber, request);
                                } else {
                                    // оповещаем об ошибке
                                    subscriber.error(err);
                                }
                            },
                            () => {
                                // комплит запроса, отрабатывает finally() инициатора
                                subscriber.complete();
                            },
                        );

                    return () => {
                        // на случай если в вызывающем коде мы сделали отписку от запроса
                        // если не сделать отписку и здесь, в dev tools браузера не увидим отмены запросов,
                        // т.к инициатор (например Controller) делает отписку от нашего враппера, а не от исходного запроса
                        originalRequestSubscription.unsubscribe();
                    };
                });
        });

        // вернем вызывающему коду Observable, пусть сам решает когда делать подписку.
        return observable;
    }

    private handleUnauthorizedError(subscriber: Subscriber<any>, request: HttpRequest<any>) {
        console.log('handleUnauthorizedError', request.url);
        // запоминаем "401ый" запрос
        this.requests.push({subscriber, failedRequest: request, retries: 0});
        if (!this.refreshInProgress) {
            // делаем запрос на восстанавливение токена, и установим флаг, дабы следующие "401ые"
            // просто запоминались но не инициировали refresh
            this.refreshInProgress = true;
            this.auth.refreshToken(request)
                .pipe(
                    Rx.tap(console.log),
                    Rx.finalize(() => {
                        console.log('finalize');
                        this.refreshInProgress = false;
                    }),
                )
                .subscribe(() =>
                        // если токен рефрешнут успешно, повторим запросы которые накопились пока мы ждали ответ от рефреша
                        this.repeatFailedRequests(),
                    () => {
                        // если по каким - то причинам запрос на рефреш не отработал, то делаем логаут
                        this.auth.logout();
                    },
                );
        }
    }

    private repeatFailedRequests() {
        console.log('repeatFailedRequests');
        this.requests.forEach((request) => {
            // клонируем наш "старый" запрос, с добавлением новенького токена
            const req = request.failedRequest;
            console.log('****failed', req);
            request.retries++;
            // и повторяем (помним с.subscriber - subscriber вызывающего кода)
            this.repeatRequest(req, request.subscriber);
        });
        this.requests = [];
    }

    private repeatRequest(request: HttpRequest<any>, subscriber: Subscriber<any>) {
        // и собственно сам процесс переотправки
        this.http.request(request).subscribe((res) => {
                if (this.auth.response) {
                    console.log('repeat');
                    this.auth.response(request, res as any);
                }
                subscriber.next(res);
            },
            (err) => {
                if (err.status === 401) {
                    // if just refreshed, but for unknown reasons we got 401 again - logout user
                    this.auth.logout();
                }
                subscriber.error(err);
            },
            () => {
                subscriber.complete();
            },
        );
    }

    private async prepareRequest(req: HttpRequest<any>): Promise<HttpRequest<any>> {
        const token = await this.auth.getAccessToken(req);
        const tokenType = this.auth.getTokenType ? this.auth.getTokenType(req) : 'Bearer';

        if (token && tokenType) {
            req = req.clone({
                headers: req.headers.set('Authorization', tokenType + ' ' + token),
            });
        }

        console.log('Access token for "' + req.url + '" : ' + token);

        if (this.auth.prepareRequest) {
            req = this.auth.prepareRequest(req);
        }

        return req;
    }
}
