<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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

        \Illuminate\Support\Facades\Event::listen(function (\Illuminate\Auth\Events\Login $event) {
            if ($event->user->status !== 'ACTIVE') {
                \Illuminate\Support\Facades\Auth::logout();
                request()->session()->invalidate();
                request()->session()->regenerateToken();

                throw \Illuminate\Validation\ValidationException::withMessages([
                    \Laravel\Fortify\Fortify::username() => 'Tu cuenta se encuentra inactiva. Contacta con el administrador.',
                ]);
            }

            $activeSessions = \Illuminate\Support\Facades\DB::table('sessions')
                ->where('user_id', $event->user->id)
                ->where('id', '!=', request()->session()->getId())
                ->count();

            if ($activeSessions > 0) {
                \Illuminate\Support\Facades\Auth::logout();
                request()->session()->invalidate();
                request()->session()->regenerateToken();

                throw \Illuminate\Validation\ValidationException::withMessages([
                    \Laravel\Fortify\Fortify::username() => 'Ya tienes una sesión activa en otro dispositivo.',
                ]);
            }
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
