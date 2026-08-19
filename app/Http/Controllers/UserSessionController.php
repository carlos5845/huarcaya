<?php

namespace App\Http\Controllers;

use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Jenssegers\Agent\Agent;

class UserSessionController extends Controller
{
    public function index(User $user)
    {
        $activeSessionIds = DB::table('sessions')
            ->where('user_id', $user->id)
            ->pluck('id')
            ->toArray();

        $sessions = LoginHistory::where('user_id', $user->id)
            ->orderBy('login_at', 'desc')
            ->get()
            ->map(function ($history) use ($activeSessionIds) {
                $agent = tap(new Agent, function ($a) use ($history) {
                    $a->setUserAgent($history->user_agent);
                });

                $isActive = in_array($history->session_id, $activeSessionIds) && is_null($history->logout_at);

                return [
                    'id' => $history->id,
                    'session_id' => $history->session_id,
                    'ip_address' => $history->ip_address,
                    'is_current_device' => $isActive && $history->session_id === request()->session()->getId(),
                    'is_active' => $isActive,
                    'agent' => [
                        'is_desktop' => $agent->isDesktop(),
                        'platform' => $agent->platform() ?: 'Desconocido',
                        'browser' => $agent->browser() ?: 'Desconocido',
                        'raw' => $history->user_agent,
                    ],
                    'login_at' => $history->login_at->format('d/m/Y h:i A'),
                    'logout_at' => $history->logout_at ? $history->logout_at->format('d/m/Y h:i A') : null,
                ];
            });

        return Inertia::render('users/sessions', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'dni' => $user->dni,
            ],
            'sessions' => $sessions,
        ]);
    }

    public function destroy(User $user, $sessionId)
    {
        // $sessionId aquí es el ID en la tabla sessions (el string), no el ID de login_histories
        // porque el frontend enviará el session_id para cerrar la sesión activa.

        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', $sessionId)
            ->delete();

        LoginHistory::where('user_id', $user->id)
            ->where('session_id', $sessionId)
            ->update(['logout_at' => now()]);

        return back()->with('success', 'Sesión cerrada exitosamente.');
    }
}
