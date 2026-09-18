import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router} from "@angular/router";

@Component({
  selector: 'bulk-uploader-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bulk-header.component.html',
  styleUrls: ['./bulk-header.component.scss']
})
export class BulkHeaderComponent {

  @Input() title = '';

  @Input() description = '';

  @Input() backLabel = 'Back';

  @Input() backUrl = '/';

  constructor(
      private router: Router
  ) {}

  goBack(): void {
    this.router.navigateByUrl(this.backUrl);
  }

}
