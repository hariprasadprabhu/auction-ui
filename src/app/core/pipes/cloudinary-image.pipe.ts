import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CloudinaryImageService } from '../services/cloudinary-image.service';

/**
 * CloudinaryImagePipe
 * Transforms Cloudinary URLs with auto-format and auto-quality optimization (WebP support)
 * Supports lazy loading for better performance
 *
 * Usage:
 * <img [src]="url | cloudinaryImage" loading="lazy" />
 * <img [src]="url | cloudinaryImage:300:300" loading="lazy" />
 */
@Pipe({
  name: 'cloudinaryImage',
  standalone: true,
})
export class CloudinaryImagePipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cloudinaryService = inject(CloudinaryImageService);

  /**
   * Transform a Cloudinary URL with optimization parameters
   * @param url The image URL to transform
   * @param width Optional width for responsive images
   * @param height Optional height for responsive images
   * @returns SafeUrl with transformed Cloudinary URL
   */
  transform(url: string | undefined | null, width?: number | string, height?: number | string): SafeUrl {
    if (!url) {
      return '';
    }

    const widthNum = width ? Number(width) : undefined;
    const heightNum = height ? Number(height) : undefined;

    const transformedUrl = this.cloudinaryService.getTransformedUrl(url, widthNum, heightNum);
    return this.sanitizer.bypassSecurityTrustUrl(transformedUrl);
  }
}
