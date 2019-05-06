import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import * as Rx from 'rxjs/operators';

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
    title = 'ngx-auth';

    code: any = null;
    clientAuth: any = null;
    bankAuth: any = null;
    bankWallets: any = null;

    private unsubscribe = new Subject();

    constructor(private activatedRoute: ActivatedRoute,
                private http: HttpClient,
                private router: Router,
                public authService: AuthService) {
        this.authService.restoreMasterToken();
    }

    public ngOnInit() {
        setTimeout(() => this.code = {
            masterToken  : this.authService.masterToken,
            serviceTokens: this.authService.serviceTokens,
        }, 100);
        this.activatedRoute.queryParams
            .pipe(
                Rx.takeUntil(this.unsubscribe),
            )
            .subscribe(
                query => {
                    this.code = query;
                    let back = query.back || '/';
                    if (back && back.substr(0, 10) === '/auth/code') {
                        back = '/';
                    }
                    if (query.code) {
                        this.authService.applyGrandCode(query.code).then(
                            () => this.router.navigateByUrl('/'),
                            error => {
                                if (error.status === 0) {
                                    this.title = 'Maintenance mode';
                                    // this.message = '';
                                }
                                // this.loading = false;
                                // this.debug = error;

                                if (error.status === 401) {
                                    alert('401');
                                    this.authService.login(back);
                                }
                            },
                        );
                    } else {
                        // this.router.navigateByUrl('/');
                    }
                },
            );
    }

    public ngOnDestroy(): void {
        this.unsubscribe.next();
    }

    getClientAuth() {
        this.clientAuth = this.http.get('client/auth');
    }

    getBankAuth() {
        this.bankAuth = this.http.get('bank:auth');
    }

    getBankWallets() {
        this.bankWallets = this.http.get('bank/v1:user');
    }
}
