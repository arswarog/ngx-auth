import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { AuthService, urnInfo } from './auth.service';
import { HttpAuthModule } from '../http-auth/http-auth.module';
import { TestBed } from '@angular/core/testing';
import { AUTH_PROVIDER } from '../http-auth/auth.interface';

let testingController: HttpTestingController;
let http: HttpClient;
let auth: AuthService;

const expectedData = [
    {id: '1', name: 'FirstGame', locale: 'ru', type: '2'},
    {id: '2', name: 'SecondGame', locale: 'ru', type: '3'},
    {id: '3', name: 'LastGame', locale: 'en', type: '1'},
];

describe('AuthService', () => {
    describe('urnInfo', () => {
        it('with version', () => {
            expect(urnInfo('client/v1:auth')).toEqual({
                service       : 'client',
                serviceVersion: 'client/v1',
                version       : 'v1',
                path          : 'auth',
            });
        });
        it('without version', () => {
            expect(urnInfo('client:auth')).toEqual({
                service       : 'client',
                serviceVersion: 'client',
                version       : '',
                path          : 'auth',
            });
        });
        it('with version and long path', () => {
            expect(urnInfo('bank/v1.0:user/wallets')).toEqual({
                service       : 'bank',
                serviceVersion: 'bank/v1.0',
                version       : 'v1.0',
                path          : 'user/wallets',
            });
        });
        it('simple url', () => {
            expect(urnInfo('client/auth')).toEqual({
                service       : '',
                serviceVersion: '',
                version       : '',
                path          : 'client/auth',
            });
        });
    });

    describe('prepareRequest', () => {
        let service: AuthService = null;

        beforeAll(() => {
            TestBed.configureTestingModule({
                imports  : [
                    HttpAuthModule,
                    HttpClientTestingModule,
                ],
                providers: [
                    AuthService,
                    {
                        provide : AUTH_PROVIDER,
                        useClass: AuthService,
                    },
                ],
            });
            service = TestBed.get(AuthService);
        });

        it('with version', () => {
            const req = new HttpRequest<any>('GET', 'client/v1:auth');
            expect(service.prepareRequest(req).url).toEqual(service.apiUrl + '/client/v1/auth');
        });

        it('without version', () => {
            const req = new HttpRequest<any>('GET', 'client:auth');
            expect(service.prepareRequest(req).url).toEqual(service.apiUrl + '/client/auth');
        });

        it('with version and long path', () => {
            const req = new HttpRequest<any>('GET', 'bank/v1.0:user/wallets');
            expect(service.prepareRequest(req).url).toEqual(service.mapping.bank + '/v1.0/user/wallets');
        });

        it('simple url', () => {
            const req = new HttpRequest<any>('GET', 'client/auth');
            expect(service.prepareRequest(req).url).toEqual(service.apiUrl + '/client/auth');
        });
    });

    describe('getAccessToken', () => {
        let service: AuthService = null;

        beforeAll(() => {
            TestBed.configureTestingModule({
                imports  : [
                    HttpAuthModule,
                    HttpClientTestingModule,
                ],
                providers: [
                    AuthService,
                    {
                        provide : AUTH_PROVIDER,
                        useClass: AuthService,
                    },
                ],
            });
            service = TestBed.get(AuthService);
            service.masterToken = 'master.jwt';
            service.serviceTokens = {
                bank: 'bank.jwt',
            };
        });

        it('with version', async () => {
            const req = new HttpRequest<any>('GET', 'client/v1:auth');
            expect(await service.getAccessToken(req)).toEqual('master.jwt');
        });

        it('without version', async () => {
            const req = new HttpRequest<any>('GET', 'bank:auth');
            expect(await service.getAccessToken(req)).toEqual('master.jwt');
        });

        it('with version and long path', async () => {
            const req = new HttpRequest<any>('GET', 'bank/v1.0:user/wallets');
            expect(await service.getAccessToken(req)).toEqual('bank.jwt');
        });

        it('simple url', async () => {
            const req = new HttpRequest<any>('GET', 'client/auth');
            expect(await service.getAccessToken(req)).toEqual('master.jwt');
        });
    });

    describe('API', () => {
        beforeEach(() => TestBed.configureTestingModule({
            imports  : [
                HttpAuthModule,
                HttpClientTestingModule,
            ],
            providers: [
                AuthService,
            ],
        }));

        beforeEach(() => {
            testingController = TestBed.get(HttpTestingController);
            http = TestBed.get(HttpClient);
            auth = TestBed.get(AuthService);
        });

        afterEach(() => {
            testingController.verify();
        });

        it('should be created', () => {
            expect(http).toBeTruthy();
        });

        // it('no getAccessToken, no Authorization header', () => {
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

        it('refresh if not exists bank jwt (retry queries)', async () => {
            auth.masterToken = 'master.jwt';
            auth.serviceTokens = {};

            http.get('bank/v1:user').subscribe((data) => {
                expect(data).toEqual(expectedData);
            });

            await sleep();

            const reqRetry = testingController.expectOne(auth.mapping.bank + '/auth');

            expect(reqRetry.request.method).toEqual('GET');
            expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
            reqRetry.flush({
                jwt: 'new.jwt',
            });

            await sleep();

            const reqRefresh = testingController.expectOne(auth.mapping.bank + '/v1/user');
            expect(reqRefresh.request.method).toEqual('GET');
            expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
            reqRefresh.flush(expectedData);
        });

        it('refresh if 401 (retry queries)', async () => {
            auth.masterToken = 'master.jwt';
            auth.serviceTokens = {
                bank: 'bad.jwt',
            };

            http.get('bank/v1:user').subscribe((data) => {
                expect(data).toEqual(expectedData);
            });

            await sleep();

            const req = testingController.expectOne(auth.mapping.bank + '/v1/user');

            expect(req.request.method).toEqual('GET');
            expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
            req.flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});

            await sleep();

            const reqRefresh = testingController.expectOne(auth.mapping.bank + '/auth');
            expect(reqRefresh.request.method).toEqual('GET');
            expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
            reqRefresh.flush({
                jwt: 'new.jwt',
            });

            await sleep();

            const reqRetry = testingController.expectOne(auth.mapping.bank + '/v1/user');
            expect(reqRetry.request.method).toEqual('GET');
            expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
            reqRetry.flush(expectedData);
        });

        it('append Authorization header for root service', async () => {
            auth.masterToken = 'master.jwt';

            http.get('client/auth').subscribe((data) => {
                expect(data).toEqual(expectedData);
            });

            await sleep();

            const req = testingController.expectOne(auth.apiUrl + '/client/auth');
            expect(req.request.method).toEqual('GET');
            expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
            req.flush(expectedData);
        });

        it('append Authorization header for bank service', async () => {
            auth.masterToken = 'master.jwt';
            auth.serviceTokens = {
                bank: 'bank.jwt',
            };

            http.get('bank/v1:user').subscribe((data) => {
                expect(data).toEqual(expectedData);
            });

            await sleep();

            const req = testingController.expectOne(auth.mapping.bank + '/v1/user');
            expect(req.request.method).toEqual('GET');
            expect(req.request.headers.get('Authorization')).toEqual('Bearer bank.jwt');
            req.flush(expectedData);
        });

        it('append Authorization header for bank service', async () => {
            auth.masterToken = 'master.jwt';
            auth.serviceTokens = {
                bank: 'bank.jwt',
            };

            http.get('bank:auth').subscribe((data) => {
                expect(data).toEqual(expectedData);
            });

            await sleep();

            const req = testingController.expectOne(auth.mapping.bank + '/auth');
            expect(req.request.method).toEqual('GET');
            expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
            req.flush(expectedData);
        });

        // it('append another getAccessToken to Authorization header', () => {
        //     auth.jwt = 'some.jwt';
        //     auth.anotherJwt = 'another.jwt';
        //
        //     http.get('/').subscribe((data) => {
        //         expect(data).toEqual(expectedData);
        //     });
        //
        //     const req = testingController.expectOne('/');
        //     expect(req.request.method).toEqual('GET');
        //     expect(req.request.headers.get('Authorization')).toEqual('Bearer some.jwt');
        //     req.flush(expectedData);
        //
        //     http.get('another/').subscribe((data) => {
        //         expect(data).toEqual(expectedData);
        //     });
        //
        //     const req2 = testingController.expectOne('another/');
        //     expect(req2.request.method).toEqual('GET');
        //     expect(req2.request.headers.get('Authorization')).toEqual('Bearer another.jwt');
        //     req2.flush(expectedData);
        // });

        // // error if not 401 (without retry queries)
        //
        // // cancel subscription when cancel request
        // })
    });
});

function sleep(timeout = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
