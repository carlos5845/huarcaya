import React, { useState } from 'react';
import {
    AlertTriangle,
    Trash2,
    AlertCircle,
    Info,
    CheckCircle2,
    HelpCircle,
    X,
    Check,
    Loader2,
    type LucideIcon
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    icon?: LucideIcon;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
}

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    icon: CustomIcon,
    onConfirm,
    loading = false
}: ConfirmDialogProps) {
    const [internalLoading, setInternalLoading] = useState(false);
    const isLoading = loading || internalLoading;

    // Configuración según la variante
    const variantConfig = {
        danger: {
            icon: CustomIcon || Trash2,
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
            buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700 shadow-sm',
            confirmIcon: Trash2,
        },
        warning: {
            icon: CustomIcon || AlertTriangle,
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700 shadow-sm',
            confirmIcon: AlertCircle,
        },
        info: {
            icon: CustomIcon || HelpCircle,
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
            buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm',
            confirmIcon: Check,
        },
        success: {
            icon: CustomIcon || CheckCircle2,
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
            buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-sm',
            confirmIcon: Check,
        },
    }[variant];

    const Icon = variantConfig.icon;
    const ConfirmBtnIcon = variantConfig.confirmIcon;

    const handleConfirm = async () => {
        try {
            const result = onConfirm();
            if (result instanceof Promise) {
                setInternalLoading(true);
                await result;
                setInternalLoading(false);
            }
        } catch (error) {
            setInternalLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={isLoading ? () => {} : onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border shadow-2xl p-6">
                <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                    <div className={`p-3 rounded-xl shrink-0 ${variantConfig.iconBg}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <DialogTitle className="text-base font-semibold leading-tight text-foreground">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                            {description}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 border-t pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => onOpenChange(false)}
                        className="h-9 text-xs gap-1.5 font-medium"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={handleConfirm}
                        className={`h-9 text-xs font-semibold gap-1.5 ${variantConfig.buttonClass}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <ConfirmBtnIcon className="w-4 h-4" />
                                {confirmLabel}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
