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

        if (\DB::connection() instanceof \Illuminate\Database\SQLiteConnection) {
            \DB::connection()->getPdo()->sqliteCreateFunction('unaccent', function ($str) {
                return strtolower(\Illuminate\Support\Str::ascii($str));
            }, 1);
        }

        \Illuminate\Database\Eloquent\Builder::macro('whereLikeAccentInsensitive', function ($column, $search) {
            $connection = $this->getConnection();
            $driver = $connection->getDriverName();
            
            if ($driver === 'sqlite') {
                return $this->whereRaw("unaccent({$column}) LIKE unaccent(?)", [$search]);
            } elseif ($driver === 'pgsql') {
                return $this->whereRaw("unaccent({$column}) ILIKE unaccent(?)", [$search]);
            } else {
                return $this->where($column, 'like', "%{$search}%");
            }
        });

        \Illuminate\Database\Eloquent\Builder::macro('orWhereLikeAccentInsensitive', function ($column, $search) {
            $connection = $this->getConnection();
            $driver = $connection->getDriverName();
            
            if ($driver === 'sqlite') {
                return $this->orWhereRaw("unaccent({$column}) LIKE unaccent(?)", [$search]);
            } elseif ($driver === 'pgsql') {
                return $this->orWhereRaw("unaccent({$column}) ILIKE unaccent(?)", [$search]);
            } else {
                return $this->orWhere($column, 'like', "%{$search}%");
            }
        });


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
