import { useState } from 'react';
import type { ConfirmVariant } from '@/components/confirm-dialog';

export interface ConfirmOptions {
    title: string;
    description: string;
    variant?: ConfirmVariant;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
    const [state, setState] = useState<{
        open: boolean;
        title: string;
        description: string;
        variant?: ConfirmVariant;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void | Promise<void>;
    }>({
        open: false,
        title: '',
        description: '',
        variant: 'danger',
        onConfirm: () => {},
    });

    const confirm = (options: ConfirmOptions) => {
        setState({
            open: true,
            title: options.title,
            description: options.description,
            variant: options.variant ?? 'danger',
            confirmLabel: options.confirmLabel ?? 'Confirmar',
            cancelLabel: options.cancelLabel ?? 'Cancelar',
            onConfirm: async () => {
                await options.onConfirm();
                setState((prev) => ({ ...prev, open: false }));
            },
        });
    };

    const dialogProps = {
        open: state.open,
        onOpenChange: (open: boolean) => setState((prev) => ({ ...prev, open })),
        title: state.title,
        description: state.description,
        variant: state.variant,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        onConfirm: state.onConfirm,
    };

    return { confirm, dialogProps };
}
