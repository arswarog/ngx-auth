import { Injectable } from '@angular/core';
import { AuthStatus, IAuthService } from './auth.interface';
import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class MockAuthService /*implements IAuthService*/ {
    public authStatus$: Observable<AuthStatus>;

    public jwt: string = null;

    public anotherJwt: string = null;

    constructor(private http: HttpClient) {}

    public async isNeedRefresh(req?: HttpRequest<any>): Promise<boolean> {
        if (req.url.substr(0, 7) === 'another' && req.url !== 'another/auth') {
            return !this.anotherJwt || !this.jwt;
        }

        return !this.jwt;
    }

    public async getAccessToken(req?: HttpRequest<any>): Promise<string> {
        if (req.url.substr(0, 7) === 'another' && req.url !== 'another/auth') {
            return this.anotherJwt;
        }

        return this.jwt;
    }

    public login(): void {
        console.log('login');
    }

    public logout(): void {
        console.log('logout');
    }

    public refreshToken(req?: HttpRequest<any>): Promise<boolean> {
        console.log('refreshToken', req.url);
        return new Promise(resolve => {
            if (req.url && req.url.substr(0, 7) === 'another' && this.jwt) {
                this.http.post('another/auth', {
                    client_id    : 'clientID',
                    grant_type   : 'refresh_token',
                    refresh_token: this.jwt,
                }).subscribe(
                    (result: any) => {
                        console.log('refreshToken', result);

                        if (req.url.substr(0, 7) === 'another') {
                            this.anotherJwt = result.access_token;
                        } else {
                            this.jwt = result.access_token;
                        }

                        resolve(true);
                    },
                    error => {
                        resolve(false);
                    },
                );
                return;
            } else {
                return true;
            }
        });
    }

    response(request: HttpRequest<any>, response: HttpResponse<any>) {
        console.log('response', request);
        console.log('response', response);
    }
}
