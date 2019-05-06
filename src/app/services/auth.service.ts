import { HttpClient, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as Rx from 'rxjs/operators';
import { empty } from 'rxjs';
import { IAuthService } from '../auth/auth.interface';

const authConfig = {
    clientID: 'asdaasd',
    domain  : 'asdasda',
};

@Injectable()
export class AuthService implements IAuthService {
    constructor(private client: HttpClient) { }

    public getAccessToken(): string {
        return 'authBearer';
    }

    public refreshToken(req?: HttpRequest<any>): Observable<string> {
        if (!this.isNeedRefreshToken()) {
            console.log('empty');
            return empty();
        }
        return this.client.post<string>(`https://${authConfig.domain}/oauth/token`,
            {
                client_id    : authConfig.clientID,
                grant_type   : 'refresh_token',
                refresh_token: localStorage.getItem('refresh_token'),
            },
        ).pipe(
            Rx.tap(res => this.onAuthRenew(res)),
        );
    }

    public onAuthRenew(res) {
        alert('onAuthRenew');
    }

    public isNeedRefreshToken(): boolean {
        // expires_at - время когда токен должен истечь, записано при логине или после очередного рефреша
        const expiresAtString = localStorage.getItem('expires_at');
        if (!expiresAtString) {
            return false;
        }

        const expiresAt        = JSON.parse(expiresAtString);
        // считаем, что токен нужно рефрешить не когда он уже истек, а за минуту до его невалидности
        const isExpireInMinute = new Date().getTime() > (expiresAt - 60000);
        return isExpireInMinute;
    }

    public logout() {
        alert('logout');
    }
}
