import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * CloudinaryImageService
 * Handles image uploads to Cloudinary API and image URL transformations
 *
 * Features:
 * - Upload files to Cloudinary API (bypasses auth interceptor to avoid CORS issues)
 * - Transform URLs with optimization parameters (f_auto, q_auto for WebP)
 * - Support lazy loading for images
 */
@Injectable({
  providedIn: 'root',
})
export class CloudinaryImageService {
  private readonly http = inject(HttpClient);
  private readonly CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/drytm0fl7/image/upload';
  private readonly UPLOAD_PRESET = 'auctionDeck';

  /**
   * Upload an image file to Cloudinary
   * The auth interceptor will skip this request (Cloudinary doesn't accept Authorization headers)
   * FormData is used - do NOT set Content-Type manually (browser handles it automatically)
   * @param file The image file to upload
   * @returns Observable with Cloudinary response containing the image URL
   */
  uploadImage(file: File): Observable<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.UPLOAD_PRESET);

    // Standard POST request - auth interceptor will skip this URL
    return this.http.post<CloudinaryUploadResponse>(this.CLOUDINARY_URL, formData);
  }

  /**
   * Transform a Cloudinary URL with optimization parameters.
   * Adds f_auto (format auto-detection) and q_auto (quality auto-adjustment) for WebP.
   * When a quality value is provided, it overrides the default auto-quality to create a lighter preview.
   * @param url The Cloudinary image URL
   * @param width Optional width for responsive images
   * @param height Optional height for responsive images
   * @param quality Optional quality percentage, e.g. 60 for a lighter preview
   * @returns Transformed Cloudinary URL
   */
  getTransformedUrl(url: string, width?: number, height?: number, quality?: number): string {
    if (!url) {
      return '';
    }

    // If it's not a Cloudinary URL, return as-is
    if (!url.includes('cloudinary.com')) {
      return url;
    }

    // Extract the base URL and path
    // Example: https://res.cloudinary.com/drytm0fl7/image/upload/v123/abc.jpg
    // We need to insert the transformation params after /upload/
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) {
      return url;
    }

    const basePart = url.substring(0, uploadIndex + 8); // includes /upload/
    const imagePart = url.substring(uploadIndex + 8);

    const effectiveQuality = quality !== undefined && quality >= 1 && quality <= 100 ? quality : undefined;
    const transformation = effectiveQuality ? `f_auto,q_${effectiveQuality}` : 'f_auto,q_auto';

    if (width && height) {
      return `${basePart}w_${width},h_${height},c_fill/${transformation}/${imagePart}`;
    }
    if (width) {
      return `${basePart}w_${width}/${transformation}/${imagePart}`;
    }
    if (height) {
      return `${basePart}h_${height}/${transformation}/${imagePart}`;
    }

    return `${basePart}${transformation}/${imagePart}`;
  }

  /**
   * Return a lighter compressed version of Cloudinary image for initial list/grid previews.
   */
  getLowQualityPreviewUrl(url: string, width = 120, height = 120, quality = 60): string {
    return this.getTransformedUrl(url, width, height, quality);
  }

  /**
   * Extract the public ID from a Cloudinary URL for easier manipulation
   * @param url The Cloudinary image URL
   * @returns The public ID
   */
  getPublicId(url: string): string {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }
}

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
  [key: string]: any;
}
