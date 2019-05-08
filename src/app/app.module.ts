import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AUTH_PROVIDER } from './http-auth/auth.interface';
import { HttpAuthModule } from './http-auth/http-auth.module';
import { AuthService } from './services/auth.service';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path     : '**',
        component: AppComponent,
    },
];


@NgModule({
    declarations: [
        AppComponent,
    ],
    imports     : [
        RouterModule.forRoot(routes),
        BrowserModule,
        HttpAuthModule,
    ],
    providers   : [
        AuthService,
        {
            provide : AUTH_PROVIDER,
            useExisting: AuthService,
        },
    ],
    bootstrap   : [
        AppComponent,
    ],
})

export class AppModule {
}
