import { EventEmitter } from '@angular/core';
import { PopupContext } from './popup-context';
import { PopupResult } from './popup-result';

export interface PopupEditorComponent<T = any> {

    context: PopupContext<T>;

    result: EventEmitter<PopupResult<T>>;

}
