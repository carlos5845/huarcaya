<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
            DemoUserSeeder::class,
            PaymentMethodSeeder::class,
        ]);

        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->command->call('app:sync-postgres-sequences');
        }
    }
}
