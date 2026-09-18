import { InjectionToken } from '@angular/core';
import { PopupContext } from '../contracts/popup-context';

export const POPUP_DATA =
    new InjectionToken<PopupContext>(
        'POPUP_DATA'
    );
