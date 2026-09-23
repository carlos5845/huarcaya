import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}


export function normalizeSearch(str: string | null | undefined): string {
    if (!str) return '';
    return str.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

export function base64ToFile(dataUrl: string, filename: string, mimeType?: string): File {
    const parts = dataUrl.split(',');
    const header = parts[0];
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeType || (mimeMatch ? mimeMatch[1] : 'application/octet-stream');
    const bstr = atob(parts[1] || parts[0]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

/**
 * Returns the local date in YYYY-MM-DD format (respecting user's local timezone instead of UTC).
 */
export function getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD or datetime) for display in Peru without timezone shifting.
 */
export function formatAppDate(dateStr?: string | null): string {
    if (!dateStr) return '-';

    // If it's a date-only string like "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    // If it has a date-only prefix before T or space (e.g. from JSON or ISO)
    const datePart = dateStr.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && !dateStr.includes(':')) {
        const [year, month, day] = datePart.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }

    // Otherwise format using browser's local timezone (e.g. for created_at)
    return new Date(dateStr).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

