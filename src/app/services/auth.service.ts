import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, NEVER, Observable } from 'rxjs';
import * as Rx from 'rxjs/operators';
import { AuthStatus, IAuthService } from '../http-auth/auth.interface';

@Injectable()
export class AuthService implements IAuthService {
    public authStatus$: Observable<AuthStatus>;
    public authStatus: AuthStatus;
    public masterToken: string = null;
    public serviceTokens: { [service: string]: string } = {};

    public apiUrl = 'http://192.168.88.156/api';
    public mapping = {
        bank: 'http://192.168.88.31:5050/api',
    };

    public waitings: { [service: string]: Observable<any> } = {};

    constructor(private http: HttpClient) {
    }

    clientID() {
        return 'dcDAlXYqWnlkRircUMpNtcza3NTXWgWsfG6GSKEJ';
    }

    authServerURL() {
        return 'http://id.squilla.tech/api/';
    }

    /**
     * Подготовка запроса - подмена адреса
     * @param request
     */
    public prepareRequest(request: HttpRequest<any>): HttpRequest<any> {
        const info = urnInfo(request.url);

        let parts: string[] = null;

        if (info.service in this.mapping) {
            parts = [this.mapping[info.service], info.version, info.path];
        } else {
            parts = [this.apiUrl, info.serviceVersion, info.path];
        }

        request = request.clone({
            url: parts.filter(i => i).join('/'),
        });

        return request;
    }

    public async isNeedRefresh(req: HttpRequest<any>): Promise<boolean> {
        const info = urnInfo(req.url);
        if (info.service && info.path !== 'auth') {
            if (this.serviceTokens[info.service]) {
                return false;
            }
            return true;
        } else {
            if (!this.masterToken && info.path !== 'client/auth/') {
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
        console.log('get access token', info, this.serviceTokens);
        console.log('masterToken', this.masterToken);
        console.log('serviceTokens', this.serviceTokens);
        if (info.service && info.path !== 'auth') {
            if (this.serviceTokens[info.service]) {
                return this.serviceTokens[info.service];
            }
            // await this.refreshToken(req).toPromise();
            return this.serviceTokens[info.service];
        } else {
            if (!this.masterToken && info.path !== 'client/auth/') {
                // await this.refreshToken().toPromise();
            }
            return this.masterToken;
        }
    }

    /**
     * Тип токена
     */
    public getTokenType(): string {
        return 'Bearer';
    }

    public async canRequest(req?: HttpRequest<any>): Promise<boolean> {
        const info = req ? urnInfo(req.url) : urnInfo('');

        console.log('canRequest', info);

        if (this.authStatus === AuthStatus.Ok)
            return true;

        return !info.service || info.path === 'auth';
    }

    /**
     * Запрос на обновление токена
     * @param req
     */
    public refreshToken(req?: HttpRequest<any>): Promise<boolean> {
        return new Promise(resolve => {
            const info = req ? urnInfo(req.url) : urnInfo('');

            console.log('refreshToken', info);

            if (info.service && info.path !== 'auth') {
                const observer = this.http.get<string>(info.service + ':auth').pipe(
                    Rx.tap(res => this.onAuthRenew(res, req)),
                    // Rx.finalize()
                );
                this.waitings[info.service] = observer;
                observer.subscribe(
                    () => resolve(true),
                    () => resolve(false),
                );
            } else {
                this.login('/');
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
        console.log('onAuthRenew', res);
    }

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
     * Процедура получения авторизации
     * @param back
     */
    public login(back: string) {
        // if (this.router.url.substr(0, 5) === 'auth/') {
        //     return;
        // }

        const redirectUri = window.location.origin + '/auth/code?back=' + back;

        // if ([
        //     'auth/code',
        // ].indexOf(this.router.url) === -1) {
        window.location.href = this.loginURL('authorize', redirectUri);
        // }
    }

    /**
     * Выход
     */
    public logout() {
        this.login('/');
    }

    restoreMasterToken(): boolean {
        this.masterToken = localStorage.getItem('master_token');
        console.log('restored token', this.masterToken);
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
        // this.status$.next(OnlineStatus.Loging);
        // alert(code);
        console.log('CODE', code);
        return new Promise((resolve, reject) => {
            this.http.post<any>('client/auth/', {
                code,
            })
                .subscribe(
                    data => {
                        console.log('CLIENT', data);
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
                        console.log(error);
                        if (error.status === 401) {
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
        return this.authServerURL() + mode + '/?' + encodeQueryParams({
            redirect_uri, // FIXME
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
        console.log('response', response);
        if (response instanceof HttpResponse) {
            const info = urnInfo(request.url);
            if (info.service && response.body.jwt) {
                this.serviceTokens[info.service] = response.body.jwt;
            }
        }
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

export function encodeQueryParams(params: object): string {
    let url = '';
    const tmp = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key]));
    if (tmp.length) {
        url += tmp.join('&');
    }
    return url;
}
