<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class UserSessionController extends Controller
{
    public function index(User $user)
    {
        $sessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->get()
            ->map(function ($session) {
                // Simplified string matching for platform/browser
                $ua = $session->user_agent;
                $isDesktop = !preg_match('/(Mobile|Android|iPhone|iPad)/i', $ua);
                $platform = 'Unknown';
                if (preg_match('/windows/i', $ua)) $platform = 'Windows';
                elseif (preg_match('/macintosh|mac os x/i', $ua)) $platform = 'Mac';
                elseif (preg_match('/linux/i', $ua)) $platform = 'Linux';
                elseif (preg_match('/android/i', $ua)) $platform = 'Android';
                elseif (preg_match('/iphone|ipad/i', $ua)) $platform = 'iOS';

                $browser = 'Unknown';
                if (preg_match('/chrome|crios/i', $ua) && !preg_match('/edge|opr/i', $ua)) $browser = 'Chrome';
                elseif (preg_match('/safari/i', $ua) && !preg_match('/chrome|crios/i', $ua)) $browser = 'Safari';
                elseif (preg_match('/firefox|fxios/i', $ua)) $browser = 'Firefox';
                elseif (preg_match('/edge/i', $ua)) $browser = 'Edge';
                elseif (preg_match('/opr/i', $ua)) $browser = 'Opera';

                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'is_current_device' => $session->id === request()->session()->getId(),
                    'agent' => [
                        'is_desktop' => $isDesktop,
                        'platform' => $platform,
                        'browser' => $browser,
                        'raw' => $ua
                    ],
                    'last_active' => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
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
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', $sessionId)
            ->delete();

        return back()->with('success', 'Sesión cerrada exitosamente.');
    }
}
