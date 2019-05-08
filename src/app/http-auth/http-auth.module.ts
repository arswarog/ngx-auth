import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { Inject, Injector, NgModule, Optional, SkipSelf } from '@angular/core';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { AUTH_PROVIDER, AuthStatus, IAuthInterceptor, IAuthService } from './auth.interface';
import { AuthInterceptor } from './auth.interceptor';
import * as Rx from 'rxjs/operators';

@NgModule({
    providers: [
        // {
        //    provide   : APP_INITIALIZER,
        //    // можно сразу инициировать рефреш: (a) => a.refreshToken()
        //    // важно! refreshToken должен вернуть Promise, а не Observable т.к инициализация работает
        //    // только с промисами
        //    // но очень важно делать это через экспортную функцию, дабы не сломать AOT сборку
        //    useFactory: refreshToken,
        //    deps      : [AUTH_PROVIDER],
        //    multi     : true,
        // },
        {
            provide : HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi   : true,
        },
    ],
    exports  : [HttpClientModule],
})

export class HttpAuthModule {
    // @Optional() @SkipSelf() - если вдруг мы попытаемся импортировать CoreModule в AppModule и например UserModule - получим ошибку
    constructor(@Optional() @SkipSelf() parentModule: HttpAuthModule,
                inj: Injector,
                // auth: AuthService,
                @Inject(AUTH_PROVIDER) auth: IAuthService,
                http: HttpClient) {
        if (parentModule) {
            // если мы здесь, значит случайно включили CoreModule в двух и более местах
            throw new Error(
                'HttpAuthModule is already loaded. Import it in the AppModule only');
        }

        auth.authStatus$ = new BehaviorSubject<AuthStatus>(AuthStatus.Starting);

        // Получаем интерцепторы которые реализуют интерфейс IAuthInterceptor
        const interceptors = inj.get<IAuthInterceptor[]>(HTTP_INTERCEPTORS)
            .filter(i => i.init);
        // передаем http сервис и сервис авторизации.
        interceptors.forEach(i => i.init(http, auth));
    }
}

export function refreshToken(auth: IAuthService) {
    return () => {
        // return own subject to complete this initialization step in any case
        // otherwise app will stay on preloader if any error while getAccessToken refreshing occurred
        const subj = new Subject();
        auth.refreshToken()
            .pipe(
                Rx.finalize(() => {
                    subj.complete();
                }),
                Rx.catchError((err, caught: Observable<any>) => {
                    // do logout, redirect to login will occurs at UserService with onLoggedOut event
                    auth.logout();
                    return throwError(err);
                }),
            ).subscribe();
        // need to return Promise!!
        return subj.toPromise();
    };
}
