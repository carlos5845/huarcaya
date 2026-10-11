<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckTerminatedSession
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // No interceptar peticiones de autenticación para que el usuario pueda validar su DNI y volver a ingresar
        if (
            $request->is('login') ||
            $request->is('auth/*') ||
            $request->is('forgot-password*') ||
            $request->is('reset-password*') ||
            $request->is('two-factor-challenge*') ||
            $request->routeIs('login*')
        ) {
            return $next($request);
        }

        // Si no está autenticado, verificamos si la sesión previa fue terminada por otro dispositivo
        if (! Auth::check()) {
            $sessionCookieName = config('session.cookie');
            $cookieSessionId = $request->cookie($sessionCookieName) ?: $request->cookies->get($sessionCookieName);

            if (! $cookieSessionId && $request->hasSession()) {
                $cookieSessionId = $request->session()->getId();
            }

            if ($cookieSessionId && Cache::has("terminated_session:{$cookieSessionId}")) {
                $terminatedData = Cache::get("terminated_session:{$cookieSessionId}");

                if ($terminatedData && isset($terminatedData['terminated_by'])) {
                    $by = $terminatedData['terminated_by'];
                    $device = $by['device'] ?? 'Otro dispositivo';
                    $ip = $by['ip'] ?? 'Desconocida';
                    $time = $by['time'] ?? now()->format('d/m/Y h:i A');

                    $message = "Tu sesión fue cerrada automáticamente porque se inició sesión con tu cuenta desde otro dispositivo ({$device}, IP: {$ip}) el {$time}.";

                    // Peticiones de API o JSON puro
                    if ($request->expectsJson() || $request->is('api/*')) {
                        return response()->json([
                            'message' => $message,
                            'session_terminated' => true,
                            'terminated_by' => $by,
                        ], 401);
                    }

                    // Peticiones Inertia: Forzar navegación completa al login
                    if ($request->header('X-Inertia')) {
                        return Inertia::location(route('login', ['reason' => 'session_terminated', 'ts' => $cookieSessionId]));
                    }

                    // Peticiones regulares GET/POST web
                    return redirect()->route('login', ['reason' => 'session_terminated', 'ts' => $cookieSessionId])->with([
                        'session_terminated' => true,
                        'terminated_info' => $by,
                        'status' => $message,
                    ]);
                }
            }
        }

        return $next($request);
    }
}
