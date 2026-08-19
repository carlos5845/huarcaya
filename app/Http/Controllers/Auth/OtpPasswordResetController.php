<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class OtpPasswordResetController extends Controller
{
    public function requestQuestion(Request $request)
    {
        $request->validate([
            'dni' => ['required', 'string', 'size:8'],
        ]);

        $user = User::where('dni', $request->dni)->first();
        if (! $user || $user->status !== 'ACTIVE') {
            // Security: Don't reveal if user exists, just return a random question
            $questionType = rand(0, 1) === 0 ? 'ubigeo' : 'expiration_date';

            return response()->json([
                'question_type' => $questionType,
            ]);
        }

        $questionType = Cache::remember("password_recovery_question_{$user->dni}", 600, function () {
            return rand(0, 1) === 0 ? 'ubigeo' : 'expiration_date';
        });

        return response()->json([
            'question_type' => $questionType,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'dni' => ['required', 'string', 'size:8'],
            'answer' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::where('dni', $request->dni)->first();
        if (! $user || $user->status !== 'ACTIVE') {
            return response()->json([
                'message' => 'Respuesta incorrecta.',
            ], 422);
        }

        $questionType = Cache::get("password_recovery_question_{$user->dni}");
        if (! $questionType) {
            return response()->json([
                'message' => 'La sesión ha expirado, por favor intenta nuevamente.',
            ], 422);
        }

        $isValid = false;
        if ($questionType === 'ubigeo') {
            $isValid = $user->dni_ubigeo === $request->answer;
        } else {
            $isValid = $user->dni_expiration_date?->format('Y-m-d') === $request->answer;
        }

        if (! $isValid) {
            return response()->json([
                'message' => 'La respuesta de seguridad es incorrecta.',
            ], 422);
        }

        // Reset the password
        $user->forceFill([
            'password' => Hash::make($request->password),
        ])->save();

        // Clear the cache
        Cache::forget("password_recovery_question_{$user->dni}");

        return response()->json([
            'message' => 'Tu contraseña ha sido restablecida exitosamente.',
        ]);
    }
}
