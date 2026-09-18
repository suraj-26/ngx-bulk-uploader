import {
    Injectable,
    Injector,
    NgZone,
    ComponentRef
} from '@angular/core';

import {
    Overlay,
    OverlayRef,
    FlexibleConnectedPositionStrategy
} from '@angular/cdk/overlay';

import {
    ComponentPortal
} from '@angular/cdk/portal';

import { filter, Observable, Subject } from 'rxjs';

import { PopupContext } from '../contracts/popup-context';
import { PopupResult } from '../contracts/popup-result';

@Injectable({
    providedIn: 'root'
})
export class OverlayPopupService {

    private overlayRef?: OverlayRef;

    constructor(
        private overlay: Overlay,
        private injector: Injector,
        private ngZone: NgZone
    ) {}

    open<T>(
        component: any,
        anchor: HTMLElement,
        context: PopupContext<T>
    ): Observable<PopupResult<T>> {

        this.close();

        const result =
            new Subject<PopupResult<T>>();

        const positionStrategy =
            this.overlay
                .position()
                .flexibleConnectedTo(anchor)
                .withPush(false)
                .withViewportMargin(8)
                .withPositions([
                    {
                        originX: 'start',
                        originY: 'bottom',
                        overlayX: 'start',
                        overlayY: 'top'
                    },
                    {
                        originX: 'start',
                        originY: 'top',
                        overlayX: 'start',
                        overlayY: 'bottom'
                    },
                    {
                        originX: 'end',
                        originY: 'bottom',
                        overlayX: 'end',
                        overlayY: 'top'
                    },
                    {
                        originX: 'end',
                        originY: 'top',
                        overlayX: 'end',
                        overlayY: 'bottom'
                    }
                ]);



            this.overlayRef =
                this.overlay.create({

                    positionStrategy,

                    hasBackdrop: false,

                    scrollStrategy:
                        this.overlay.scrollStrategies.reposition()

                });

            const portal =
                new ComponentPortal(component, null, this.injector);

            const componentRef =
                this.overlayRef.attach(portal) as ComponentRef<any>;

        requestAnimationFrame(() => {
            this.overlayRef?.updatePosition();
        });


        // Handsontable closes/commits the active editor on any mousedown
        // it sees outside the edited cell's own DOM — a document-level
        // listener, not scoped to Handsontable's own root element. This
        // popup is rendered into a CDK overlay appended to document.body,
        // so it's never "inside" the cell as far as Handsontable is
        // concerned. Without this, the very first click into the popup
        // (typically the search box grabbing focus) reads as an outside
        // click and silently finalizes the editor there and then — the
        // popup keeps working as its own independent Angular component
        // afterward, which is why interacting with it (checkboxes, etc.)
        // still visibly works even though nothing it does reaches
        // Handsontable anymore, including the eventual Apply. Stopping
        // propagation here, once, protects every popup built on this
        // service — not just this one.
        this.overlayRef.hostElement.addEventListener(
            'mousedown',
            (event: MouseEvent) => event.stopPropagation()
        );

        componentRef.instance.context =
            context;

        // The overlay was just attached synchronously — nothing has run
        // Angular change detection on it yet, so ngOnInit() (which reads
        // context) hasn't fired. Zone.js would normally pick this up on
        // its own microtask-empty tick, but forcing it here makes the
        // popup correct even if it's ever opened from outside the zone.
        componentRef.changeDetectorRef.detectChanges();

        componentRef.instance.result.subscribe(
            (popupResult: PopupResult<T>) => {

                this.ngZone.run(() => {

                    result.next(popupResult);

                    result.complete();

                    this.close();

                });

            }
        );

        // Deferred by a tick: the same click/tap that opened this popup
        // (e.g. the mousedown that opens the Handsontable editor) can
        // otherwise be seen by this listener as an "outside" click on the
        // very same event, closing the popup immediately after it opens.
        // This is a well-known CDK Overlay gotcha, not specific to this
        // popup — subscribing after the current call stack clears avoids it.
        setTimeout(() => {

        this.overlayRef
            ?.outsidePointerEvents()
            .subscribe(() => {

                this.ngZone.run(() => {

                    result.next({
                        applied: false
                    });

                    result.complete();

                    this.close();

                });

            });

        }, 0);

        this.overlayRef
            .keydownEvents()
            .pipe(
                filter(
                    event =>
                        event.key === 'Escape'
                )
            )
            .subscribe(() => {

                this.ngZone.run(() => {

                    result.next({
                        applied: false
                    });

                    result.complete();

                    this.close();

                });

            });

        return result.asObservable();

    }

    close(): void {

        if (!this.overlayRef) {
            return;
        }

        this.overlayRef.dispose();

        this.overlayRef = undefined;

    }

}
