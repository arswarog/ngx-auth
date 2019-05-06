import { Injectable } from '@angular/core';
import { IAuthService } from './auth.interface';
import { HttpClient, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class MockAuthService implements IAuthService {
    public jwt: string = null;

    public anotherJwt: string = null;

    constructor(private http: HttpClient) {}

    public async getAccessToken(req?: HttpRequest<any>): Promise<string> {
        let jwt = this.jwt;
        if (req.url.substr(0, 7) === 'another' && req.url !== 'another/auth') {
            jwt = this.anotherJwt;
        }

        if (jwt) {
            return 'Bearer ' + jwt;
        } else {
            return null;
        }
    }

    public logout(): void {
        console.log('logout');
    }

    public refreshToken(req?: HttpRequest<any>): Observable<any> {
        console.log('refreshToken', req.url);
        return new Observable(observer => {
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

                        observer.next(result);
                        observer.complete();
                    },
                );
                return;
            }
            observer.complete();
        });
    }

    response(request: HttpRequest<any>, response: HttpResponse<any>) {
        console.log('response', request);
        console.log('response', response);
    }
}
