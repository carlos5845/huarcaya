<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Event::listen(function (Login $event) {
            if ($event->user->status !== 'ACTIVE') {
                Auth::logout();
                request()->session()->invalidate();
                request()->session()->regenerateToken();

                throw ValidationException::withMessages([
                    Fortify::username() => 'Tu cuenta se encuentra inactiva. Contacta con el administrador.',
                ]);
            }

            // Opción B: Si el usuario ya tiene sesiones abiertas, las cerramos automáticamente
            // para permitirle ingresar en este nuevo dispositivo y no dejarlo bloqueado.
            DB::table('sessions')
                ->where('user_id', $event->user->id)
                ->where('id', '!=', request()->session()->getId())
                ->delete();
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
