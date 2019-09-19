import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AUTH_PROVIDER, AuthStatus, IAuthService, sleep } from './auth.interface';
import { AuthModule } from './http-auth.module';
import { MockAuthService } from './mock-auth.service.spec';
import { BehaviorSubject } from 'rxjs';

interface IInnerAuthService extends IAuthService {
    authStatus$: BehaviorSubject<AuthStatus>;
}

let testingController: HttpTestingController;
let http: HttpClient;
let auth: MockAuthService & IInnerAuthService;

const expectedData = [
    {id: '1', name: 'FirstGame', locale: 'ru', type: '2'},
    {id: '2', name: 'SecondGame', locale: 'ru', type: '3'},
    {id: '3', name: 'LastGame', locale: 'en', type: '1'},
];

describe('authModule', () => {
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
        http = TestBed.get(HttpClient);
        auth = TestBed.get(AUTH_PROVIDER);
    });

    afterEach(() => {
        testingController.verify();
    });

    it('should be created', () => {
        expect(http).toBeTruthy();
    });

    it('append Authorization header', async () => {
        auth.jwt = 'some.jwt';

        http.get('/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        await sleep();

        const req = testingController.expectOne('/');
        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        req.flush(expectedData);

        expect(auth.authStatus$.value).toEqual(AuthStatus.Online);
    });

    it('append another getAccessToken to Authorization header', async () => {
        auth.jwt = 'some.jwt';
        auth.anotherJwt = 'another.jwt';

        http.get('/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        await sleep();

        const req = testingController.expectOne('/');
        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        req.flush(expectedData);

        http.get('another/').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        await sleep();

        const req2 = testingController.expectOne('another/');
        expect(req2.request.method).toEqual('GET');
        expect(req2.request.headers.get('Authorization')).toEqual('Bearer another.jwt');
        req2.flush(expectedData);

        expect(auth.authStatus$.value).toEqual(AuthStatus.Online);
    });

    it('refresh if 401 (retry queries)', async () => {
        auth.jwt = 'some.jwt';
        auth.anotherJwt = 'bad.jwt';

        http.get('another/data').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        await sleep();

        const req = testingController.expectOne('another/data');

        expect(req.request.method).toEqual('GET');
        expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
        req.flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});

        await sleep();

        const reqRefresh = testingController.expectOne('another/auth');
        expect(reqRefresh.request.method).toEqual('POST');
        expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        reqRefresh.flush({
            access_token: 'new.jwt',
            token_type  : 'bearer',
            expires_in  : 86400,
        });

        await sleep();

        const reqRetry = testingController.expectOne('another/data');

        expect(reqRetry.request.method).toEqual('GET');
        expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
        reqRetry.flush(expectedData);

        expect(auth.authStatus$.value).toEqual(AuthStatus.Online);
    });

    it('refresh if not exists another jwt (retry queries)', async () => {
        auth.jwt = 'some.jwt';
        auth.anotherJwt = null;

        http.get('another/data').subscribe((data) => {
            expect(data).toEqual(expectedData);
        });

        await sleep();

        const reqRefresh = testingController.expectOne('another/auth');
        expect(reqRefresh.request.method).toEqual('POST');
        expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        reqRefresh.flush({
            access_token: 'new.jwt',
            token_type  : 'bearer',
            expires_in  : 86400,
        });

        await sleep();

        const reqRetry = testingController.expectOne('another/data');

        expect(reqRetry.request.method).toEqual('GET');
        expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
        reqRetry.flush(expectedData);

        expect(auth.authStatus$.value).toEqual(AuthStatus.Online);
    });

    // error if not 401 (without retry queries)

    // cancel subscription when cancel request


});
