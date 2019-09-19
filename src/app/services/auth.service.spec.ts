import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { AuthService, urnInfo } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AUTH_PROVIDER, AuthStatus, sleep } from '@app/http-auth/auth.interface';
import { AuthModule } from '@app/http-auth/http-auth.module';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalService } from '@app/modal/modal.service';

let testingController: HttpTestingController;
let http: HttpClient;
let auth: AuthService & {
    authStatus$: BehaviorSubject<AuthStatus>;
};

const expectedData = [
    {id: '1', name: 'FirstGame', locale: 'ru', type: '2'},
    {id: '2', name: 'SecondGame', locale: 'ru', type: '3'},
    {id: '3', name: 'LastGame', locale: 'en', type: '1'},
];

describe('authService', () => {
    // describe('urnInfo', () => {
    //     it('with version', () => {
    //         expect(urnInfo('client/v1:auth')).toEqual({
    //             service       : 'client',
    //             serviceVersion: 'client/v1',
    //             version       : 'v1',
    //             path          : 'auth',
    //         });
    //     });
    //     it('without version', () => {
    //         expect(urnInfo('client:auth')).toEqual({
    //             service       : 'client',
    //             serviceVersion: 'client',
    //             version       : '',
    //             path          : 'auth',
    //         });
    //     });
    //     it('with version and long path', () => {
    //         expect(urnInfo('bank/v1.0:user/wallets')).toEqual({
    //             service       : 'bank',
    //             serviceVersion: 'bank/v1.0',
    //             version       : 'v1.0',
    //             path          : 'user/wallets',
    //         });
    //     });
    //     it('simple url', () => {
    //         expect(urnInfo('client/auth/')).toEqual({
    //             service       : '',
    //             serviceVersion: '',
    //             version       : '',
    //             path          : 'client/auth/',
    //         });
    //     });
    // });
    //
    // describe('prepareRequest', () => {
    //     let service: authService = null;
    //
    //     beforeAll(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide : AUTH_PROVIDER,
    //                     useClass: authService,
    //                 },
    //             ],
    //         });
    //         service = TestBed.get(authService);
    //     });
    //
    //     it('with version', () => {
    //         const req = new HttpRequest<any>('GET', 'client/v1:auth');
    //         expect(service.prepareRequest(req).url).toEqual(service.mapping.client + '/v1/auth');
    //     });
    //
    //     it('without version', () => {
    //         const req = new HttpRequest<any>('GET', 'client:auth');
    //         expect(service.prepareRequest(req).url).toEqual(service.mapping.client + '/auth');
    //     });
    //
    //     it('with version and long path', () => {
    //         const req = new HttpRequest<any>('GET', 'bank/v1.0:user/wallets');
    //         expect(service.prepareRequest(req).url).toEqual(service.mapping.bank + '/v1.0/user/wallets');
    //     });
    //
    //     // it('simple url', () => {
    //     //     const req = new HttpRequest<any>('GET', 'client/auth');
    //     //     expect(service.prepareRequest(req).url).toEqual(service.apiUrl + '/client/auth');
    //     // });
    // });
    //
    // describe('getAccessToken', () => {
    //     let service: authService = null;
    //
    //     beforeAll(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide : AUTH_PROVIDER,
    //                     useClass: authService,
    //                 },
    //             ],
    //         });
    //         service = TestBed.get(authService);
    //         service.masterToken = 'master.jwt';
    //         service.serviceTokens = {
    //             bank: 'bank.jwt',
    //         };
    //     });
    //
    //     it('with version', async () => {
    //         const req = new HttpRequest<any>('GET', 'client/v1:auth');
    //         expect(await service.getAccessToken(req)).toEqual('master.jwt');
    //     });
    //
    //     it('without version', async () => {
    //         const req = new HttpRequest<any>('GET', 'bank:auth/obtain/');
    //         expect(await service.getAccessToken(req)).toEqual('master.jwt');
    //     });
    //
    //     it('with version and long path', async () => {
    //         const req = new HttpRequest<any>('GET', 'bank/v1.0:user/wallets');
    //         expect(await service.getAccessToken(req)).toEqual('bank.jwt');
    //     });
    //
    //     it('simple url', async () => {
    //         const req = new HttpRequest<any>('GET', 'client/auth');
    //         expect(await service.getAccessToken(req)).toEqual('master.jwt');
    //     });
    // });
    //
    // describe('API', () => {
    //     beforeEach(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide    : AUTH_PROVIDER,
    //                     useExisting: authService,
    //                 },
    //             ],
    //         });
    //     });
    //
    //     beforeEach(() => {
    //         testingController = TestBed.get(HttpTestingController);
    //         http = TestBed.get(HttpClient);
    //         auth = TestBed.get(authService);
    //         auth.login = () => {throw new Error('WTF?');};
    //         auth.authStatus = AuthStatus.Starting;
    //         auth.authStatus$.next(AuthStatus.Starting);
    //     });
    //
    //     afterEach(() => {
    //         testingController.verify();
    //     });
    //
    //     it('should be created', () => {
    //         expect(http).toBeTruthy();
    //     });
    //
    //     it('request can not start because status is Starting', async () => {
    //         auth.masterToken = 'master.jwt';
    //
    //         http.get('client:auth/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         req.flush(expectedData);
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('request can not start because status is Starting', async () => {
    //         auth.masterToken = 'master.jwt';
    //
    //         http.get('client:auth/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         req.flush(expectedData);
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('append Authorization header for root service', async () => {
    //         auth.masterToken = 'master.jwt';
    //
    //         http.get('client:auth/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         req.flush(expectedData);
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('append Authorization header for bank service', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'bank.jwt',
    //         };
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/v1/user');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bank.jwt');
    //         req.flush(expectedData);
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('authorize Authorization header for bank service', async () => {
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'old.bank.jwt',
    //         };
    //
    //         http.get('bank:auth/obtain/').subscribe((data) => {
    //             expect(data).toEqual({
    //                 token: 'new.bank.jwt',
    //             });
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         req.flush({
    //             token: 'new.bank.jwt',
    //         });
    //
    //         expect(auth.serviceTokens).toEqual({
    //             bank: 'new.bank.jwt',
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('refresh if not exists bank jwt (retry queries)', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {};
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //
    //         const reqAuth = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //
    //         expect(reqAuth.request.method).toEqual('POST');
    //         expect(reqAuth.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqAuth.flush({
    //             token: 'new.jwt',
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         const reqRefresh = testingController.expectOne(auth.mapping.bank + '/v1/user');
    //         expect(reqRefresh.request.method).toEqual('GET');
    //         expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         reqRefresh.flush(expectedData);
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('refresh if 401 (retry queries)', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'bad.jwt',
    //         };
    //
    //         http.get('client:auth/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const reqPrepare = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(reqPrepare.request.method).toEqual('GET');
    //         expect(reqPrepare.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqPrepare.flush(expectedData);
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/v1/user');
    //
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         req.flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //
    //         const reqRefresh = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //         expect(reqRefresh.request.method).toEqual('POST');
    //         expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqRefresh.flush({
    //             token: 'new.jwt',
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         const reqRetry = testingController.expectOne(auth.mapping.bank + '/v1/user');
    //         expect(reqRetry.request.method).toEqual('GET');
    //         expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         reqRetry.flush(expectedData);
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('404 error', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'bank.jwt',
    //         };
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         http.get('bank/v1:bad/path').subscribe(
    //             data => {
    //                 throw new Error('This must be failed');
    //             },
    //             (error: HttpErrorResponse) => {
    //                 expect(error.status).toEqual(404);
    //                 expect(error.statusText).toEqual('Not found');
    //             },
    //         );
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/v1/bad/path');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bank.jwt');
    //         req.flush(expectedData, {status: 404, statusText: 'Not found'});
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    //
    //     it('error (not 401) when auth on microservice', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'bad.jwt',
    //         };
    //
    //         http.get('client:auth/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Starting);
    //
    //         const reqPrepare = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(reqPrepare.request.method).toEqual('GET');
    //         expect(reqPrepare.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqPrepare.flush(expectedData);
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/v1/user');
    //
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         req.flush({error: 'Unauthorized'}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //
    //         const reqRefresh = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //         expect(reqRefresh.request.method).toEqual('POST');
    //         expect(reqRefresh.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqRefresh.flush({error: 'Not found'}, {status: 404, statusText: 'Not found'});
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Online);
    //     });
    // });
    //
    // describe('API login', () => {
    //     beforeEach(() => TestBed.configureTestingModule({
    //         imports  : [
    //             authModule,
    //             HttpClientTestingModule,
    //             RouterTestingModule.withRoutes([]),
    //         ],
    //         providers: [
    //             authService,
    //             {
    //                 provide    : AUTH_PROVIDER,
    //                 useExisting: authService,
    //             },
    //         ],
    //     }));
    //
    //     beforeEach(() => {
    //         testingController = TestBed.get(HttpTestingController);
    //         http = TestBed.get(HttpClient);
    //         auth = TestBed.get(authService);
    //         auth.login = () => {
    //             console.log('login');
    //             auth['loginOk'] = true;
    //         };
    //     });
    //
    //     afterEach(() => {
    //         testingController.verify();
    //     });
    //
    //     // it('relogin if master token is null (client:some/path/)', async () => {
    //     //     auth.masterToken = null;
    //     //     auth.serviceTokens = {};
    //     //
    //     //     http.get('client:some/path/').subscribe((data) => {
    //     //         expect(data).toEqual(expectedData);
    //     //     });
    //     //
    //     //     await sleep(1);
    //     //
    //     //     expect(auth['loginOk']).toBeTruthy();
    //     // });
    //
    //     it('relogin if master token is null (bank:auth/obtain/)', async () => {
    //         auth.masterToken = null;
    //         auth.serviceTokens = {};
    //
    //         http.get('bank:auth/obtain/').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth['loginOk']).toBeTruthy();
    //     });
    //
    //     it('relogin if bank jwt not exists and bad master token is bad', async () => {
    //         auth.masterToken = 'bad.master.jwt';
    //         auth.serviceTokens = {};
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //
    //         expect(req.request.method).toEqual('POST');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.master.jwt');
    //         req.flush({}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         expect(auth['loginOk']).toBeTruthy();
    //     });
    //
    //     it('relogin if not exists bank and master jwt (retry queries)', async () => {
    //         auth.masterToken = null;
    //         auth.serviceTokens = {};
    //
    //         http.get('bank/v1:user').subscribe((data) => {
    //             expect(data).toEqual(expectedData);
    //         });
    //
    //         await sleep();
    //
    //         expect(auth['loginOk']).toBeTruthy();
    //     });
    //
    //     it('relogin if client:auth/ return 401', async () => {
    //         auth.masterToken = 'bad.master.jwt';
    //         auth.serviceTokens = {};
    //
    //         http.get('client:auth/').subscribe((data) => {});
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.master.jwt');
    //         req.flush({}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         expect(auth['loginOk']).toBeTruthy();
    //     });
    //
    //     /// client/auth 401
    // });
    //
    // describe('get access_token by code', () => {
    //     let service: authService = null;
    //
    //     beforeEach(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide    : AUTH_PROVIDER,
    //                     useExisting: authService,
    //                 },
    //             ],
    //         });
    //         service = TestBed.get(authService);
    //     });
    //
    //     beforeEach(() => {
    //         testingController = TestBed.get(HttpTestingController);
    //         http = TestBed.get(HttpClient);
    //         auth = TestBed.get(authService);
    //         auth.login = () => {
    //             console.log('login');
    //             auth['loginOk'] = true;
    //         };
    //     });
    //
    //     afterEach(() => {
    //         testingController.verify();
    //     });
    //
    //     it('Send correct code', async () => {
    //         auth.masterToken = null;
    //
    //         auth.applyGrandCode('correct-code').then(
    //             () => true,
    //             error => {throw new Error('Code is incorrect');},
    //         );
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('POST');
    //         expect(req.request.body).toEqual({
    //             code: 'correct-code',
    //         });
    //         expect(req.request.headers.get('Authorization')).toBeNull();
    //         req.flush({
    //             token: 'master.jwt',
    //             data : {},
    //         });
    //         expect(auth.masterToken).toEqual('master.jwt');
    //     });
    //
    //     it('Send correct code with old token', async () => {
    //         auth.masterToken = 'old.jwt';
    //
    //         auth.applyGrandCode('correct-code').then(
    //             () => true,
    //             error => {throw new Error('Code is incorrect');},
    //         );
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('POST');
    //         expect(req.request.body).toEqual({
    //             code: 'correct-code',
    //         });
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer old.jwt');
    //         req.flush({
    //             token: 'master.jwt',
    //             data : {},
    //         });
    //         expect(auth.masterToken).toEqual('master.jwt');
    //     });
    //
    //     it('Send incorrect code', async () => {
    //         auth.masterToken = null;
    //
    //         auth.applyGrandCode('incorrect-code').then(
    //             () => {throw new Error('Code is incorrect');},
    //             () => true,
    //         );
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('POST');
    //         expect(req.request.body).toEqual({
    //             code: 'incorrect-code',
    //         });
    //         expect(req.request.headers.get('Authorization')).toBeNull();
    //         req.flush({error: 'Failed grand'}, {status: 401, statusText: 'Unauthorized'});
    //         expect(auth.masterToken).toEqual(null);
    //     });
    //
    //     it('Send incorrect code with old token', async () => {
    //         auth.masterToken = 'old.jwt';
    //
    //         auth.applyGrandCode('incorrect-code').then(
    //             () => {throw new Error('Code is incorrect');},
    //             () => true,
    //         );
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         expect(req.request.method).toEqual('POST');
    //         expect(req.request.body).toEqual({
    //             code: 'incorrect-code',
    //         });
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer old.jwt');
    //         req.flush({error: 'Failed grand'}, {status: 401, statusText: 'Unauthorized'});
    //         expect(auth.masterToken).toEqual('old.jwt');
    //     });
    // });
    //
    // describe('concurrency', () => {
    //     let service: authService = null;
    //
    //     beforeEach(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide    : AUTH_PROVIDER,
    //                     useExisting: authService,
    //                 },
    //             ],
    //         });
    //         service = TestBed.get(authService);
    //     });
    //
    //     beforeEach(() => {
    //         testingController = TestBed.get(HttpTestingController);
    //         http = TestBed.get(HttpClient);
    //         auth = TestBed.get(authService);
    //         auth.login = () => {
    //             console.log('login');
    //             auth['loginOk'] = true;
    //         };
    //     });
    //
    //     afterEach(() => {
    //         testingController.verify();
    //     });
    //
    //     it('Send multiple requests in parallels with bad master token', async () => {
    //         auth.masterToken = 'master.jwt';
    //         auth.serviceTokens = {
    //             bank: 'bad.jwt',
    //         };
    //
    //         http.get('bank/v1:some/path').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             error => {throw new Error('Response must be truthy');},
    //         );
    //
    //         http.get('bank/v1:other/path').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             error => {throw new Error('Response must be truthy');},
    //         );
    //
    //         await sleep();
    //
    //         const req = testingController.expectOne(auth.mapping.bank + '/v1/other/path');
    //         expect(req.request.method).toEqual('GET');
    //         expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         req.flush({}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         const req2 = testingController.expectOne(auth.mapping.bank + '/v1/some/path');
    //         expect(req2.request.method).toEqual('GET');
    //         expect(req2.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         req2.flush({}, {status: 401, statusText: 'Unauthorized'});
    //
    //         await sleep();
    //
    //         const reqAuth = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //         expect(reqAuth.request.method).toEqual('POST');
    //         expect(reqAuth.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         reqAuth.flush({token: 'new.jwt'});
    //
    //         await sleep();
    //
    //         expect(auth.masterToken).toEqual('master.jwt');
    //         expect(auth.serviceTokens).toEqual({
    //             bank: 'new.jwt',
    //         });
    //
    //         const reqRetry = testingController.expectOne(auth.mapping.bank + '/v1/other/path');
    //         expect(reqRetry.request.method).toEqual('GET');
    //         expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         reqRetry.flush(expectedData);
    //
    //         const req2Retry = testingController.expectOne(auth.mapping.bank + '/v1/some/path');
    //         expect(req2Retry.request.method).toEqual('GET');
    //         expect(req2Retry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         req2Retry.flush(expectedData);
    //
    //         expect(auth['loginOk']).toBeUndefined();
    //     });
    // });
    //
    // describe('from real case', () => {
    //     let service: authService = null;
    //
    //     beforeEach(() => {
    //         TestBed.configureTestingModule({
    //             imports  : [
    //                 authModule,
    //                 HttpClientTestingModule,
    //                 RouterTestingModule.withRoutes([]),
    //             ],
    //             providers: [
    //                 authService,
    //                 {
    //                     provide    : AUTH_PROVIDER,
    //                     useExisting: authService,
    //                 },
    //             ],
    //         });
    //         service = TestBed.get(authService);
    //     });
    //
    //     beforeEach(() => {
    //         testingController = TestBed.get(HttpTestingController);
    //         http = TestBed.get(HttpClient);
    //         auth = TestBed.get(authService);
    //         auth.login = () => {
    //             console.log('login');
    //             auth['loginOk'] = true;
    //         };
    //     });
    //
    //     afterEach(() => {
    //         testingController.verify();
    //     });
    //
    //
    //     it('No master token', async () => {
    //         auth.masterToken = null;
    //         auth.serviceTokens = {};
    //
    //         // request notification/v1:centrifuge/token
    //         http.get('notification/v1:centrifuge/token').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             () => {throw new Error('Response must be truthy'); },
    //         );
    //
    //         // request notification/v1:notifications
    //         http.get('notification/v1:notifications').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             () => {throw new Error('Response must be truthy'); },
    //         );
    //
    //         await sleep();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //
    //         testingController.verify();
    //
    //         // request investor/v1:user
    //         http.get('investor/v1:user').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             () => {throw new Error('Response must be truthy'); },
    //         );
    //
    //         await sleep();
    //
    //         testingController.verify();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //         expect(auth['loginOk']).toBeTruthy();
    //
    //         // request client:auth/
    //         http.get('client:auth/').subscribe(
    //             data => expect(data).toEqual(expectedData),
    //             () => {throw new Error('Response must be truthy'); },
    //         );
    //
    //         await sleep();
    //
    //         testingController.verify();
    //
    //         expect(auth.authStatus).toEqual(AuthStatus.Refreshing);
    //         expect(auth['loginOk']).toBeTruthy();
    //
    //         // *********************************
    //
    //         // const req = testingController.expectOne(auth.mapping.client + '/auth/');
    //         // expect(req.request.method).toEqual('GET');
    //         // expect(req.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         // req.flush({}, {status: 401, statusText: 'Unauthorized'});
    //         //
    //         // await sleep();
    //         //
    //         // const req2 = testingController.expectOne(auth.mapping.bank + '/v1/some/path');
    //         // expect(req2.request.method).toEqual('GET');
    //         // expect(req2.request.headers.get('Authorization')).toEqual('Bearer bad.jwt');
    //         // req2.flush({}, {status: 401, statusText: 'Unauthorized'});
    //         //
    //         // await sleep();
    //         //
    //         // const reqAuth = testingController.expectOne(auth.mapping.bank + '/auth/obtain/');
    //         // expect(reqAuth.request.method).toEqual('POST');
    //         // expect(reqAuth.request.headers.get('Authorization')).toEqual('Bearer master.jwt');
    //         // reqAuth.flush({token: 'new.jwt'});
    //         //
    //         // await sleep();
    //         //
    //         // expect(auth.masterToken).toEqual('master.jwt');
    //         // expect(auth.serviceTokens).toEqual({
    //         //     bank: 'new.jwt',
    //         // });
    //         //
    //         // const reqRetry = testingController.expectOne(auth.mapping.bank + '/v1/other/path');
    //         // expect(reqRetry.request.method).toEqual('GET');
    //         // expect(reqRetry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         // reqRetry.flush(expectedData);
    //         //
    //         // const req2Retry = testingController.expectOne(auth.mapping.bank + '/v1/some/path');
    //         // expect(req2Retry.request.method).toEqual('GET');
    //         // expect(req2Retry.request.headers.get('Authorization')).toEqual('Bearer new.jwt');
    //         // req2Retry.flush(expectedData);
    //         //
    //         // expect(auth['loginOk']).toBeUndefined();
    //     });
    // });
});
