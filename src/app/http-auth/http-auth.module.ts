import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { Inject, Injector, ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { Subject } from 'rxjs';
import { AUTH_PROVIDER, IAuthInterceptor, IAuthService } from './auth.interface';
import { AuthInterceptor } from './auth.interceptor';
import * as Rx from 'rxjs/operators';
import { HttpAuthService } from './http-auth.service';

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
        HttpAuthService,
        {
            provide   : HTTP_INTERCEPTORS,
            useFactory: AuthInterceptorFactory,
            multi     : true,
        },
    ],
    exports  : [
        HttpClientModule,
    ],
})
export class AuthModule {
    // @Optional() @SkipSelf() - если вдруг мы попытаемся импортировать CoreModule в AppModule и например UserModule - получим ошибку
    constructor(@Optional() @SkipSelf() parentModule: AuthModule,
                inj: Injector,
                service: HttpAuthService,
                @Inject(AUTH_PROVIDER) auth: IAuthService) {
        if (parentModule)
        // если мы здесь, значит случайно включили модуль в двух и более местах
            throw new Error(
                'authModule is already loaded. Import it in the AppModule only');

        // Инжектим AUTH_PROVIDER в сервис
        service.init(auth);

        // Получаем интерцепторы которые реализуют интерфейс IAuthInterceptor
        const interceptors = inj.get<IAuthInterceptor[]>(HTTP_INTERCEPTORS)
            .filter(i => i.init);
        // передаем http сервис и сервис авторизации.
        interceptors.forEach(i => i.init(service));
    }
}

export function refreshToken(auth: IAuthService): () => Promise<any> {
    return () => {
        // return own subject to complete this initialization step in any case
        // otherwise app will stay on preloader if any error while getAccessToken refreshing occurred
        const subj = new Subject();
        return auth.refreshToken().then(
            () => {
                subj.complete();
            },
            () => {
                // do logout, redirect to login will occurs at UserService with onLoggedOut event
                auth.logout();
            },
        );
    };
}

let interceptor: AuthInterceptor = null;

export function AuthInterceptorFactory() {
    if (interceptor)
        return interceptor;

    interceptor = new AuthInterceptor();

    return interceptor;
}
