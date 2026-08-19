import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    const { flash, toast: directToast } = usePage<any>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        const toastData = flash?.toast || directToast;
        if (toastData) {
            const data = toastData as FlashToast;
            toast[data.type as 'success' | 'error' | 'info' | 'warning']?.(data.message);
        }
    }, [flash, directToast]);
}
