import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle() {
    const { appearance, resolvedAppearance, updateAppearance } = useAppearance();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
                    title={`Tema: ${appearance === 'dark' ? 'Oscuro' : appearance === 'light' ? 'Claro' : 'Sistema'}`}
                >
                    {appearance === 'system' ? (
                        <Monitor className="h-5 w-5" />
                    ) : resolvedAppearance === 'dark' ? (
                        <Moon className="h-5 w-5 text-indigo-400" />
                    ) : (
                        <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="sr-only">Cambiar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem 
                    onClick={() => updateAppearance('light')}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span>Claro</span>
                    </div>
                    {appearance === 'light' && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => updateAppearance('dark')}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-400" />
                        <span>Oscuro</span>
                    </div>
                    {appearance === 'dark' && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                    onClick={() => updateAppearance('system')}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>Sistema</span>
                    </div>
                    {appearance === 'system' && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
