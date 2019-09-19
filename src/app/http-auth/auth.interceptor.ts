import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthInterceptor } from './auth.interface';
import { HttpAuthService } from '@app/http-auth/http-auth.service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor, IAuthInterceptor {
    private service: HttpAuthService;

    public init(service: HttpAuthService) {
        this.service = service;
    }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return this.service.intercept(request, next);
    }
}
