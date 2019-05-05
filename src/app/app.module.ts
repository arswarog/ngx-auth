import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AUTH_PROVIDER } from './auth/auth.interface';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './services/auth.service';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports     : [
        BrowserModule,
        AuthModule,
    ],
    providers   : [
        {
            provide : AUTH_PROVIDER,
            useClass: AuthService,
        },
    ],
    bootstrap   : [
        AppComponent,
    ],
})

export class AppModule {}
