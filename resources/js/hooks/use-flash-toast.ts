import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

let lastHandledSuccess: string | null = null;
let lastHandledError: string | null = null;

export function useFlashToast(): void {
    const { flash, toast: directToast } = usePage<any>().props;

    useEffect(() => {
        if (flash?.success && flash.success !== lastHandledSuccess) {
            lastHandledSuccess = flash.success;
            toast.success(flash.success);
        } else if (!flash?.success) {
            lastHandledSuccess = null;
        }

        if (flash?.error && flash.error !== lastHandledError) {
            lastHandledError = flash.error;
            toast.error(flash.error);
        } else if (!flash?.error) {
            lastHandledError = null;
        }

        const toastData = flash?.toast || directToast;

        if (toastData) {
            const data = toastData as FlashToast;
            toast[data.type as 'success' | 'error' | 'info' | 'warning']?.(data.message);
        }
    }, [flash, directToast]);
}
