import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BulkValidationError } from '../../models/bulk-validation-error.model';

const MAX_VISIBLE = 100;

@Component({
  selector: 'bulk-uploader-validation-summary',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './validation-summary.component.html',
  styleUrls: ['./validation-summary.component.scss']
})
export class ValidationSummaryComponent {

  @Input()
  errors: BulkValidationError[] = [];

  @Output()
  errorClick = new EventEmitter<BulkValidationError>();

  get visibleErrors(): BulkValidationError[] {
    return this.errors.slice(0, MAX_VISIBLE);
  }

  get hiddenCount(): number {
    return Math.max(0, this.errors.length - MAX_VISIBLE);
  }

}
