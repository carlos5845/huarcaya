<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('settings')->where('key', 'exchange_rate')->exists();
        if (! $exists) {
            DB::table('settings')->insert([
                'key' => 'exchange_rate',
                'description' => 'Tipo de Cambio (USD)',
                'type' => 'string',
                'default_value' => '3.80',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'exchange_rate')->delete();
    }
};
