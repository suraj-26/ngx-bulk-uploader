import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'bulk-uploader-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bulk-toolbar.component.html',
  styleUrls: ['./bulk-toolbar.component.scss']
})
export class BulkToolbarComponent {

  @Input() moduleName = '';

  @Input() validRows = 0;

  @Input() errorRows = 0;

  @Input() loading = false;

  @Input() allowedExtensions: string[] = ['xlsx', 'xls'];

  @Input() hasData = false;

  @Input() validated = false;

  @Output() downloadSample = new EventEmitter<void>();

  @Output() importExcel = new EventEmitter<File>();

  @Output() addRows = new EventEmitter<void>();

  @Output() validate = new EventEmitter<void>();

  @Output() upload = new EventEmitter<void>();

  @Output() clear = new EventEmitter<void>();

  get canUpload(): boolean {

    return !this.loading
        && this.hasData
        && this.validated
        && this.errorRows === 0;

  }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  get acceptAttr(): string {
    return this.allowedExtensions.map(ext => `.${ext}`).join(',');
  }

  triggerImport(): void {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.importExcel.emit(file);
    }

  }

  onValidate(): void {
    this.validate.emit();
  }

}
