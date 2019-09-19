import { HttpClient, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as Rx from 'rxjs/operators';
import { Router } from '@angular/router';
import { ConfigService, encodeQueryParams, runDemo } from '@app/services/config.service';
import { Location } from '@angular/common';
import { IClient } from '@app/services/client.service';
import { HttpAuthService } from '@app/http-auth/http-auth.service';
import { AuthStatus, IAuthService } from '@app/http-auth/auth.interface';
import { SentryService } from '@app/services/sentry.service';

@Injectable({providedIn: 'root'})
export class AuthService implements IAuthService {
    public readonly SERVICE_AUTH_PATH = 'auth/obtain/';
    public readonly MASTER_AUTH_PATH = 'client:auth/';

    public status$: Observable<AuthStatus>;

    public masterToken: string = null;
    public serviceTokens: { [service: string]: string } = {};

    public backUrl = '/';

    public waitings: { [service: string]: Observable<any> } = {};

    public httpError$ = new Subject<[HttpRequest<any>, HttpErrorResponse]>();

    public user$: BehaviorSubject<IClient> = new BehaviorSubject<IClient>({
        id        : '0',
        name      : 'Logging in',
        first_name: '',
        last_name : '',
        // accounts  : [],
        roles     : [],
        services  : [],
    });

    public debugMode = false;

    constructor(private http: HttpClient,
                private config: ConfigService,
                private router: Router,
                private auth: HttpAuthService,
                private location: Location,
                private sentry: SentryService,
                injector: Injector) {
        if (window.location.origin === 'http://127.0.0.1:4200') {
            this.config['apiUrl'] = '/api';
            this.config['mapping'] = {} as any;
        }

        if (!this.auth)
            throw new Error('HttpAuthServer does not exists');

        this.status$ = this.auth.status$;

        this.restoreMasterToken();
    }

    public setRefreshingStatus() {
        this.auth.setRefreshingStatus();
    }

    clientID() {
        return this.config.clientID;
    }

    authServerURL() {
        return this.config.authServerURL;
    }

    public refreshUser() {
        return new Promise((resolve, reject) => {
            this.http.get<any>('client:auth/') // TODO IClient
                .subscribe(
                    data => resolve(this.online(data.data)),
                    reject,
                );
        });
    }

    private online(client: IClient) {
        // this.status$.next(OnlineStatus.Online);
        const allRoles: any = {};

        client.services = [];

        const roles = client.services.reduce((roles, module) => {
            module.roles.forEach(role => allRoles[role] = true);
            return [
                ...roles,
                ...module.roles.map(role => module.name + '.' + role),
            ];
        }, []);

        roles.push(...Object.keys(allRoles));

        this.user$.next({
            ...client,
            name: client.first_name + ' ' + client.last_name,
            roles,
        });

        this.sentry.setUser(client);

        // this.rbac.setBaseRoles(roles);
        return client;
    }

    /**
     * Подготовка запроса - подмена адреса
     * @param request
     */
    public prepareRequest(request: HttpRequest<any>): HttpRequest<any> {
        const info = urnInfo(request.url);

        if (info.serviceVersion === 'http' || request.url[0] === '/') {
            return request;
        }

        let parts: string[] = null;

        if (info.service in this.config['mapping'])
            parts = [this.config['mapping'][info.service], info.version, info.path];
        else
            parts = [this.config['apiUrl'].replace('{service}', info.service), info.version, info.path];

        if (runDemo) {
            let path = info.path.substr(-1) === '/' ? info.path.substr(0, info.path.length - 1) : info.path;
            path = path.replace('?', '__');
            parts = ['/api', info.service, info.version, path + '.json'];
            request = request.clone({
                method: 'GET',
            });
        }

        request = request.clone({
            url: parts.filter(i => i).join('/'),
        });

        return request;
    }

    public async isNeedRefresh(req: HttpRequest<any>): Promise<boolean> {
        const info = urnInfo(req.url);
        if (info.serviceVersion === 'http')
            return false;

        if (!this.masterToken)
            return info.path === this.MASTER_AUTH_PATH && req.method === 'POST';

        if (info.service && info.service !== 'client' && info.path !== this.SERVICE_AUTH_PATH) {
            if (this.serviceTokens[info.service]) {
                return false;
            }
            return true;
        } else {
            if (!this.masterToken && info.service !== 'client') {
                return true;
            }
            return false;
        }
    }

    /**
     * Получение access_token и, при необходимости, его запрос
     * @param req
     */
    public async getAccessToken(req: HttpRequest<any>): Promise<string> {
        const info = urnInfo(req.url);
        if (info.service && info.service !== 'client' && info.path !== this.SERVICE_AUTH_PATH) {
            if (this.serviceTokens[info.service]) {
                return this.serviceTokens[info.service];
            }
            // await this.refreshToken(req).toPromise();
            return this.serviceTokens[info.service];
        } else {
            if (!this.masterToken && info.path !== this.MASTER_AUTH_PATH) {
                // await this.refreshToken().toPromise();
            }
            return this.masterToken;
        }
    }

    public authorize(backUrl?: string): void {
        if (!backUrl) {
            if (this.router.url.match(/\/auth\/code/))
                backUrl = '/';
            else
                backUrl = this.router.url;
        }

        setTimeout(() => {
            const redirectUri = window.location.origin + this.location['_baseHref'] + '/auth/code?back=' + this.backUrl;
            if (this.auth.status !== AuthStatus.Unauthorized)
                return;

            if (!this.debugMode || confirm('relogin ' + this.auth.status))
                window.location.href = this.loginURL('authorize', redirectUri);
        }, 100);
    }

    /**
     * Процедура получения авторизации
     * @param back
     */
    public login(back: string) {
        this.backUrl = back;

        this.auth.setUnauthorizedStatus();
    }

    /**
     * Тип токена
     */
    public getTokenType(): string {
        return 'Bearer';
    }

    public canRequest(req?: HttpRequest<any>): boolean {
        const info = req ? urnInfo(req.url) : urnInfo('');

        if (!this.masterToken) {
            if (this.auth.status !== AuthStatus.Refreshing)
                this.auth.setUnauthorizedStatus();
            return req.url === this.MASTER_AUTH_PATH && req.method === 'POST';
        }

        if (req.url === this.MASTER_AUTH_PATH)
            return true;

        if (this.auth.status === AuthStatus.Online)
            return true;

        if (!info.service || info.service === 'client' || info.path === this.SERVICE_AUTH_PATH)
            return true;

        return false;
    }

    /**
     * Запрос на обновление токена
     * @param req
     */
    public refreshToken(req?: HttpRequest<any>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const info = req ? urnInfo(req.url) : urnInfo('');

            if (info.service && info.service !== 'client' && info.path !== this.SERVICE_AUTH_PATH) {
                const observer = this.http.post<string>(
                    info.service + ':' + this.SERVICE_AUTH_PATH,
                    {
                        // data: this.masterToken,
                    },
                ).pipe(
                    Rx.tap(res => this.onAuthRenew(res, req)),
                    // Rx.finalize()
                );
                this.waitings[info.service] = observer;
                observer.subscribe(
                    () => resolve(true),
                    error => {
                        if (error.isBurderOpen === 401) {
                            resolve(false);
                        } else {
                            reject(error);
                        }
                    },
                );
            } else {
                if (this.router.url.match(/\/auth\/code/)) {
                    this.login('/');
                } else {
                    this.login(this.router.url);
                }
                return;
            }
        });
    }

    /**
     * Событие обновления токена
     * @param res
     * @param req
     */
    public onAuthRenew(res, req) {
    }

    /**
     * @deprecated
     */
    public isNeedRefreshToken(): boolean {
        // expires_at - время когда токен должен истечь, записано при логине или после очередного рефреша
        const expiresAtString = localStorage.getItem('expires_at');
        if (!expiresAtString) {
            return false;
        }

        const expiresAt = JSON.parse(expiresAtString);
        // считаем, что токен нужно рефрешить не когда он уже истек, а за минуту до его невалидности
        const isExpireInMinute = new Date().getTime() > (expiresAt - 60000);
        return isExpireInMinute;
    }

    /**
     * Выход
     */
    public logout(soft = false) {
        return new Promise<void>((resolve, reject) => {
            this.masterToken = '';
            localStorage.removeItem('master_token');

            const next = '/accounts/login/?next=' + this.loginURL('authorize', window.location.origin);

            if (soft)
                window.location.reload();
            else
                window.location.href = this.config['authServerURL'] + 'logout/?' + encodeQueryParams({next});
        });
    }

    restoreMasterToken(): boolean {
        this.masterToken = localStorage.getItem('master_token');
        return !!this.masterToken;
    }

    saveMasterToken() {
        localStorage.setItem('master_token', this.masterToken);
    }

    /**
     * Получить по code access_token
     * @param code
     */
    public applyGrandCode(code: string): Promise<void> {
        this.auth.setRefreshingStatus();

        return new Promise((resolve, reject) => {
            console.log('APPLY CODE', code);
            this.http.post<any>(this.MASTER_AUTH_PATH, {
                code,
            })
                .subscribe(
                    data => {
                        if (data.data && data['token']) {
                            this.masterToken = data['token'];
                            this.saveMasterToken();
                            resolve();
                        } else {
                            console.error('Response doesn\'t have token');
                            reject('Response doesn\'t have token');
                        }
                    },
                    error => {
                        console.log('APPLY CODE ERROR', error);
                        if (error.isBurderOpen === 401) {
                            if (confirm('Server says what you have invalid code, try another one?')) {
                                setTimeout(() => this.login('/'), 500);
                            }
                        }
                        reject(error);
                    },
                );
        });
    }

    public loginURL(mode: 'authorize' | 'refresh', redirect_uri: string): string {
        return this.authServerURL() + mode + '/?' + buildQueryParams({
            redirect_uri,
            client_id    : this.clientID(),
            response_type: 'code',
        });
    }

    /**
     * обработчик каждого запроса
     * @param request
     * @param response
     */
    response(request: HttpRequest<any>, response: HttpResponse<any>) {
        // ('response', response);
        if (response instanceof HttpResponse) {
            const info = urnInfo(request.url);
            if (info.service && response.body.token) {
                if (info.service === 'client') {
                    this.masterToken = response.body.token;
                    this.saveMasterToken();
                } else
                    this.serviceTokens[info.service] = response.body.token;
            }
        }
    }

    public errorHandler(req: HttpRequest<any>, err: HttpErrorResponse) {
        console.log(`HTTP ERROR ${err.status} "${err.statusText}" on ${req.method} ${req.url}`);
        console.log(err);

        this.httpError$.next([req, err]);
    }
}

export function urnInfo(urn: string): {
    service: string;
    serviceVersion: string;
    version: string;
    path: string;
} {
    const pos = urn.indexOf(':');
    if (pos === -1) {
        return {
            version       : '',
            service       : '',
            serviceVersion: '',
            path          : urn,
        };
    }

    const serviceVersion = urn.substr(0, pos);
    const path = urn.substr(pos + 1);
    let service = '';
    let version = '';

    if (serviceVersion.indexOf('/') !== -1) {
        ([service, version] = serviceVersion.split('/'));
    } else {
        service = serviceVersion;
    }

    return {
        service,
        serviceVersion,
        version,
        path,
    };
}

export function buildQueryParams(params: object): string {
    let url = '';
    const tmp = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key]));
    if (tmp.length) {
        url += tmp.join('&');
    }
    return url;
}
