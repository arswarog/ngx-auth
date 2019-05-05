import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { empty, Observable } from 'rxjs';
import { AUTH_PROVIDER, IAuthService } from './auth.interface';
import { AuthService } from './auth.service';

import { AuthModule } from './auth.module';

let testingController: HttpTestingController;
let http: HttpClient;
let auth: MockAuthService;

const expectedData = [
    {id: '1', name: 'FirstGame', locale: 'ru', type: '2'},
    {id: '2', name: 'SecondGame', locale: 'ru', type: '3'},
    {id: '3', name: 'LastGame', locale: 'en', type: '1'},
];

@Injectable()
class MockAuthService implements IAuthService {
    public jwt: string = null;

    public anotherJwt: string = null;

    constructor(private http: HttpClient) {}

    public token(url?: string): string {
        let jwt = this.jwt;
        if (url.substr(0, 7) === 'another' && url !== 'another/auth')
            jwt = this.anotherJwt;

        if (jwt)
            return 'Bearer ' + jwt;
        else
            return null;
    }

    public logout(): void {
        console.log('logout');
    }

    public renewToken(url?: string): Observable<any> {
        console.log('renewToken', url);
        return new Observable(observer => {
            if (url && url.substr(0, 7) === 'another' && this.jwt) {
                this.http.post('another/auth', {
                    client_id    : 'clientID',
                    grant_type   : 'refresh_token',
                    refresh_token: this.jwt,
                }).subscribe(
                    (result: any) => {
                        console.log('renewToken', result);

                        if (url.substr(0, 7) === 'another')
                            this.anotherJwt = result.access_token;
                        else
                            this.jwt = result.access_token;

                        observer.next(result);
                        observer.complete();
                    },
                );
                return;
            }
            observer.complete();
        });
    }
}

describe('AuthModule', () => {
    beforeEach(() => TestBed.configureTestingModule({
        imports  : [
            AuthModule,
            HttpClientTestingModule,
        ],
        providers: [
            {
                provide : AUTH_PROVIDER,
                useClass: MockAuthService,
            },
        ],
    }));

    beforeEach(() => {
        testingController = TestBed.get(HttpTestingController);
        http              = TestBed.get(HttpClient);
        auth              = TestBed.get(AUTH_PROVIDER);
    });

    afterEach(() => {
        testingController.verify();
    });

    it('should be created', () => {
        expect(http).toBeTruthy();
    });

    // it('no token, no Authorization header', () => {
    //    auth.jwt = null;
    //
    //    http.get('/').subscribe((data) => {
    //        expect(data).toEqual(expectedData);
    //    });
    //
    //    const req = testingController.expectOne('/');
    //    expect(req.request.method).toEqual('GET');
    //    expect(req.request.headers.get('Authorization')).toBeNull();
    //    req.flush(expectedData);
    // });

    it('append Authorization header', () => {
        auth.jwt = 'some.jwt';

        http.get('/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        const req = testingController.expectOne('/');
        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        req.flush(expectedData);
    });

    it('append another token to Authorization header', () => {
        auth.jwt        = 'some.jwt';
        auth.anotherJwt = 'another.jwt';

        http.get('/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        const req = testingController.expectOne('/');
        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        req.flush(expectedData);

        http.get('another/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        const req2 = testingController.expectOne('another/');
        expect(req2.request.method).toEqual('GET');
        expect(req2.request.headers.get('Authorization')).toEqual('Bearer another.jwt');
        req2.flush(expectedData);
    });

    it('refresh if 401 (retry queries)', () => {
        auth.jwt        = 'some.jwt';
        auth.anotherJwt = 'bad.jwt';

        http.get('another/data').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        const req = testingController.expectOne('another/data');

        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
        req.flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});

        const reqRefresh = testingController.expectOne('another/auth');
        expect(reqRefresh.request.method).toEqual('POST');
        expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        reqRefresh.flush({
            access_token: 'new.jwt',
            token_type  : 'bearer',
            expires_in  : 86400,
        });

        const reqRetry = testingController.expectOne('another/data');

        expect(reqRetry.request.method).toEqual('GET');
        expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
        reqRetry.flush(expectedData);
    });

    it('refresh if not exists another jwt (retry queries)', () => {
        auth.jwt        = 'some.jwt';
        auth.anotherJwt = null;

        http.get('another/data').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        const reqRefresh = testingController.expectOne('another/auth');
        expect(reqRefresh.request.method).toEqual('POST');
        expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        reqRefresh.flush({
            access_token: 'new.jwt',
            token_type  : 'bearer',
            expires_in  : 86400,
        });

        const reqRetry = testingController.expectOne('another/data');

        expect(reqRetry.request.method).toEqual('GET');
        expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
        reqRetry.flush(expectedData);
    });

    // error if not 401 (without retry queries)

    // cancel subscription when cancel request
});

function sleep(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
