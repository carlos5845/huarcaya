<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class OtpPasswordResetController extends Controller
{
    public function requestOtp(Request $request)
    {
        $request->validate([
            'dni' => ['required', 'string', 'size:8'],
        ]);

        $user = User::where('dni', $request->dni)->first();

        if (!$user || $user->status !== 'ACTIVE') {
            return response()->json([
                'message' => 'Si el DNI es válido, se enviará un código de recuperación.'
            ]); // Security: Don't reveal if user exists or not
        }

        // Generate 6-digit OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        DB::table('otp_codes')->insert([
            'dni' => $user->dni,
            'code' => Hash::make($otpCode),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Log the OTP code (To be replaced by Twilio integration)
        Log::info("OTP Code for {$user->dni}: {$otpCode}");

        return response()->json([
            'message' => 'Si el DNI es válido, se enviará un código de recuperación.'
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'dni' => ['required', 'string', 'size:8'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $otpRecord = DB::table('otp_codes')
            ->where('dni', $request->dni)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$otpRecord || !Hash::check($request->code, $otpRecord->code)) {
            return response()->json([
                'message' => 'El código proporcionado es inválido o ha expirado.',
            ], 422);
        }

        $user = User::where('dni', $request->dni)->first();
        if ($user) {
            $user->forceFill([
                'password' => Hash::make($request->password)
            ])->save();
        }

        DB::table('otp_codes')
            ->where('id', $otpRecord->id)
            ->update(['is_used' => true, 'updated_at' => now()]);

        return response()->json([
            'message' => 'Tu contraseña ha sido restablecida exitosamente.',
        ]);
    }
}
