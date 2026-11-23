<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncPostgresSequencesCommand extends Command
{
    protected $signature = 'app:sync-postgres-sequences';

    protected $description = 'Sincroniza todas las secuencias autoincrementables (SERIAL / BIGSERIAL) de PostgreSQL con el valor máximo de su ID';

    public function handle(): int
    {
        $driver = DB::connection()->getDriverName();
        if ($driver !== 'pgsql') {
            $this->info("El driver actual es '{$driver}'. La sincronización de secuencias solo aplica para PostgreSQL.");

            return Command::SUCCESS;
        }

        $this->info('Iniciando sincronización de secuencias en PostgreSQL...');

        // Obtener todas las tablas del schema public
        $tables = collect(DB::select("
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
        "))->pluck('table_name');

        $syncedCount = 0;

        foreach ($tables as $table) {
            // Verificar si la tabla tiene columna 'id'
            $hasId = collect(DB::select("
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = ? 
                  AND column_name = 'id'
            ", [$table]))->isNotEmpty();

            if (! $hasId) {
                continue;
            }

            try {
                // Obtener nombre de la secuencia asociada a la columna id
                $seqRow = DB::selectOne("SELECT pg_get_serial_sequence(?, 'id') as seq_name", [$table]);
                $seqName = $seqRow->seq_name ?? null;

                if ($seqName) {
                    $maxId = (int) (DB::table($table)->max('id') ?? 0);
                    $nextVal = max($maxId, 1);
                    $isCalled = $maxId > 0;

                    DB::statement('SELECT setval(?, ?, ?)', [$seqName, $nextVal, $isCalled]);
                    $this->line(" - Tabla <comment>{$table}</comment>: secuencia ajustada a <info>{$nextVal}</info>");
                    $syncedCount++;
                }
            } catch (\Throwable $e) {
                $this->warn(" - No se pudo sincronizar la secuencia para la tabla {$table}: ".$e->getMessage());
            }
        }

        $this->info("✅ Sincronización completada: {$syncedCount} secuencias actualizadas.");

        return Command::SUCCESS;
    }
}
