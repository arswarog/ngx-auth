import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { AuthStatus, IAuthService } from './auth.interface';
import { BehaviorSubject, Observable, Subscriber } from 'rxjs';
import * as Rx from 'rxjs/operators';


interface CallerRequest {
    subscriber: Subscriber<any>;
    failedRequest: HttpRequest<any>;
    retries: number;
    next?: HttpHandler;
}

@Injectable({
    providedIn: 'root',
})
export class HttpAuthService implements HttpInterceptor {
    public trace = false; // TODO disable
    public status: AuthStatus;
    public status$: Observable<AuthStatus>;

    private auth: IAuthService;
    private statusPrivate$ = new BehaviorSubject<AuthStatus>(AuthStatus.Starting);

    constructor(private http: HttpClient) {
        this.status$ = this.statusPrivate$
            .pipe(
                Rx.distinctUntilChanged(),
                Rx.tap(status => this.logMessage('Change status to ' + status)),
            );

        this.status$.subscribe(
            () => this.tryToProcessQueue(),
        );

        // setInterval(() => this.tryToProcessQueue(), 5000);
    }

    private logMessage(msg: string) {
        if (this.trace)
            console.log(`[log] ${msg}`);
    }

    private refreshInProgress: boolean;
    private requests: CallerRequest[] = [];

    private setStatus(status: AuthStatus) {
        this.logMessage('Set status ' + status);
        this.status = status;
        this.statusPrivate$.next(status);
    }

    public init(auth: IAuthService) {
        if (this.auth)
            throw new Error('Can not re-init HttpAuthService');
        this.auth = auth;
    }

    public setUnauthorizedStatus(backUrl?: string) {
        this.logMessage('set status unauth');
        if (this.status === AuthStatus.Unauthorized)
            return;
        this.setStatus(AuthStatus.Unauthorized);
        setTimeout(() => this.auth.authorize(backUrl));
    }

    public setRefreshingStatus() {
        this.logMessage('set status Refreshing');
        this.setStatus(AuthStatus.Refreshing);
    }

    private addToQueue(request: HttpRequest<any>, subscriber: Subscriber<any>, next?: HttpHandler): void {
        this.requests.push({subscriber, failedRequest: request, retries: 0});
    }

    private tryToProcessQueue() {
        if (!this.requests.length) {
            this.logMessage('Try to process queue: queue clean');
            return;
        }

        this.logMessage(`Try to process queue: ${this.requests.length} requests`);

        const requests = this.requests;
        this.requests = [];
        requests.forEach((request) => {
            // клонируем наш "старый" запрос, с добавлением новенького токена
            const req = request.failedRequest;
            request.retries++;
            // и повторяем (помним request.subscriber - subscriber вызывающего кода)
            this.repeatRequest(req, request.subscriber);
        });
    }

    private log(request: HttpRequest<any>, type: string, message: string = ''): void {
        this.logMessage(`Request ${type} ${request.method} ${request.url} ${message}`);
    }

    public intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return new Observable<HttpEvent<any>>((subscriber) => {
            // как только вызывающий код сделает подписку мы попадаем сюда и подписываемся на наш HttpRequest
            // тобишь выполняем оригинальный запрос

            this.log(request, 'start');
            if (!this.auth.canRequest(request)) {
                this.log(request, 'wait ');
                return this.addToQueue(request, subscriber, next);
            }

            // {
            //     this.addToQueue(request);
            // }
            this.prepareRequest(request).then(
                req => {
                    this.log(req, 'real ');
                    const originalRequestSubscription
                        = next.handle(req)
                        .subscribe(
                            response => {
                                if (response instanceof HttpResponse) {
                                    this.log(request, '' + response.status);
                                    // оповещаем в инициатор (success) ответ от сервера
                                    if (this.auth.response)
                                        this.auth.response(request, response as any);

                                    this.setStatus(AuthStatus.Online);
                                }
                                subscriber.next(response);
                            },
                            err => {
                                this.logMessage(err);
                                this.log(request, '' + err.status);
                                if (err.status === 401) {
                                    // если споймали 401ую - обрабатываем далее по нашему алгоритму
                                    this.handleUnauthorizedError(subscriber, request);
                                } else {
                                    // оповещаем об ошибке
                                    this.setStatus(AuthStatus.Online);
                                    this.handleError(request, err);
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
    }

    private async handleUnauthorizedError(subscriber: Subscriber<any>, request: HttpRequest<any>): Promise<void> {
        // this.logMessage('handleUnauthorizedError', request.url);
        // запоминаем "401ый" запрос
        this.addToQueue(request, subscriber);
        if (!this.refreshInProgress) {
            // делаем запрос на восстанавливение токена, и установим флаг, дабы следующие "401ые"
            // просто запоминались но не инициировали refresh
            this.refreshInProgress = true;
            this.setStatus(AuthStatus.Refreshing);
            const refresh = await this.auth.refreshToken(request);
            this.refreshInProgress = false;
            if (refresh) {
                // если токен рефрешнут успешно, повторим запросы которые накопились пока мы ждали ответ от рефреша
                this.repeatFailedRequests();
            } else {
                this.setStatus(AuthStatus.Unauthorized);
                // если по каким - то причинам запрос на рефреш не отработал, то делаем логаут
                this.auth.logout();
            }
        }
    }

    /**
     * @deprecated
     */
    private repeatFailedRequests() {
        // this.logMessage('repeatFailedRequests');
        this.requests.forEach((request) => {
            // клонируем наш "старый" запрос, с добавлением новенького токена
            const req = request.failedRequest;
            request.retries++;
            // и повторяем (помним с.subscriber - subscriber вызывающего кода)
            this.repeatRequest(req, request.subscriber);
        });
        this.requests = [];
    }

    private repeatRequest(request: HttpRequest<any>, subscriber: Subscriber<any>) {
        this.log(request, 'rerun');
        // и собственно сам процесс переотправки
        this.http.request(request).subscribe((res) => {
                if (this.auth.response)
                    this.auth.response(request, res as any);

                subscriber.next(res);
            },
            (err) => {
                if (err.isBurderOpen === 401) {
                    // if just refreshed, but for unknown reasons we got 401 again - logout user
                    this.auth.logout();
                }
                this.handleError(request, err);
                subscriber.error(err);
            },
            () => {
                subscriber.complete();
            },
        );
    }

    private async prepareRequest(req: HttpRequest<any>): Promise<HttpRequest<any>> {
        const needRefresh = await this.auth.isNeedRefresh(req);
        if (needRefresh) {
            this.logMessage(`${req.url} needs to refresh token`);
            this.setStatus(AuthStatus.Refreshing);
            await this.auth.refreshToken(req);
            // this.setStatus(AuthStatus.Online);
        }
        const token = await this.auth.getAccessToken(req);
        const tokenType = this.auth.getTokenType ? this.auth.getTokenType(req) : 'Bearer';

        if (token && tokenType) {
            req = req.clone({
                headers: req.headers.set('Authorization', tokenType + ' ' + token),
            });
        }

        // this.logMessage('Access token for "' + req.url + '" : ' + token);

        if (this.auth.prepareRequest) {
            req = this.auth.prepareRequest(req);
        }

        return req;
    }

    private handleError(req: HttpRequest<any>, error: HttpErrorResponse) {
        if (this.auth.errorHandler)
            return this.auth.errorHandler(req, error);

        console.log(`HTTP ERROR ${error.status} "${error.statusText}" on ${req.method} ${req.url}`);
        console.log('Details:', error);
    }
}
