import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, Inject, Injector, NgModule, Optional, SkipSelf } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { AUTH_PROVIDER, AuthInterceptor, IAuthService } from './auth.interface';
import { RefreshTokenInterceptor } from './refresh.interceptor';
import * as Rx from 'rxjs/operators';

@NgModule({
    providers: [
        {
            provide   : APP_INITIALIZER,
            // можно сразу инициировать рефреш: (a) => a.renewToken()
            // важно! renewToken должен вернуть Promise, а не Observable т.к инициализация работает
            // только с промисами
            // но очень важно делать это через экспортную функцию, дабы не сломать AOT сборку
            useFactory: refreshToken,
            deps      : [AUTH_PROVIDER],
            multi     : true,
        },
        {
            provide : HTTP_INTERCEPTORS,
            useClass: RefreshTokenInterceptor,
            multi   : true,
        },
    ],
    exports  : [HttpClientModule],
})

export class AuthModule {
    // @Optional() @SkipSelf() - если вдруг мы попытаемся импортировать CoreModule в AppModule и например UserModule - получим ошибку
    constructor(@Optional() @SkipSelf() parentModule: AuthModule,
                inj: Injector,
                @Inject(AUTH_PROVIDER) auth: IAuthService,
                http: HttpClient) {
        if (parentModule) {
            // если мы здесь, значит случайно включили CoreModule в двух и более местах
            throw new Error(
                'CoreModule is already loaded. Import it in the AppModule only');
        }

        // Получаем интерцепторы которые реализуют интерфейс AuthInterceptor
        const interceptors = inj.get<AuthInterceptor[]>(HTTP_INTERCEPTORS)
                                .filter(i => i.init);
        // передаем http сервис и сервис авторизации.
        interceptors.forEach(i => i.init(http, auth));
    }
}

export function refreshToken(auth: IAuthService) {
    return () => {
        // return own subject to complete this initialization step in any case
        // otherwise app will stay on preloader if any error while token refreshing occurred
        const subj = new Subject();
        auth.renewToken()
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
