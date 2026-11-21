<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportToPostgresCommand extends Command
{
    protected $signature = 'app:export-to-postgres {--output=dump_huarcaya_pgsql.sql : Nombre del archivo de salida}';

    protected $description = 'Exporta todos los datos de SQLite a un archivo SQL 100% compatible con PostgreSQL para migrar a VPS';

    public function handle(): int
    {
        $outputFile = base_path($this->option('output'));
        $this->info('Iniciando exportación de datos a formato PostgreSQL...');

        $driver = config('database.default');
        if ($driver === 'sqlite') {
            $tables = collect(DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
                ->pluck('name')
                ->toArray();
        } else {
            $tables = collect(DB::select('SHOW TABLES'))->pluck('Tables_in_'.config('database.connections.'.$driver.'.database'))->toArray();
        }

        // Tablas que no necesitan volcarse o que son efímeras
        $excludedTables = [
            'sessions',
            'cache',
            'cache_locks',
            'jobs',
            'failed_jobs',
            'job_batches',
        ];

        $tables = array_diff($tables, $excludedTables);

        // Abrir archivo para escritura
        $handle = fopen($outputFile, 'w');
        if (! $handle) {
            $this->error("No se pudo crear el archivo: {$outputFile}");

            return Command::FAILURE;
        }

        // Cabecera para PostgreSQL: desactivar temporalmente triggers y foreign keys
        fwrite($handle, "-- =========================================================\n");
        fwrite($handle, "-- DUMP DE DATOS DE HUARCAYA PARA POSTGRESQL (VPS)\n");
        fwrite($handle, '-- Fecha de generación: '.now()->toDateTimeString()."\n");
        fwrite($handle, "-- =========================================================\n\n");
        fwrite($handle, "SET client_encoding = 'UTF8';\n");
        fwrite($handle, "SET session_replication_role = 'replica';\n\n");

        $totalRowsExported = 0;
        $tablesWithId = [];

        foreach ($tables as $table) {
            $count = DB::table($table)->count();
            if ($count === 0) {
                continue;
            }

            $this->line("Exportando tabla <comment>{$table}</comment> ({$count} registros)...");

            fwrite($handle, "-- Tabla: {$table}\n");

            // Comprobar si tiene columna 'id'
            $columns = collect(DB::getSchemaBuilder()->getColumnListing($table));
            if ($columns->contains('id')) {
                $tablesWithId[] = $table;
            }

            // Truncate o delete previo por seguridad
            fwrite($handle, "TRUNCATE TABLE \"{$table}\" CASCADE;\n");

            $columnsQuoted = $columns->map(fn ($col) => "\"{$col}\"")->implode(', ');

            // Procesar por lotes de 100 registros para optimizar memoria
            DB::table($table)->orderBy($columns->first())->chunk(100, function ($rows) use ($handle, $table, $columns, $columnsQuoted, &$totalRowsExported) {
                $valueStrings = [];

                foreach ($rows as $row) {
                    $rowValues = [];
                    foreach ($columns as $column) {
                        $val = $row->{$column} ?? null;
                        if (is_null($val)) {
                            $rowValues[] = 'NULL';
                        } elseif (is_bool($val)) {
                            $rowValues[] = $val ? 'TRUE' : 'FALSE';
                        } elseif (is_numeric($val) && ! is_string($val)) {
                            $rowValues[] = $val;
                        } else {
                            // Si es entero en SQLite que representa booleano o string
                            $escaped = str_replace("'", "''", (string) $val);
                            // Manejar saltos de línea y caracteres
                            $rowValues[] = "'".$escaped."'";
                        }
                    }
                    $valueStrings[] = '('.implode(', ', $rowValues).')';
                    $totalRowsExported++;
                }

                if (! empty($valueStrings)) {
                    fwrite($handle, "INSERT INTO \"{$table}\" ({$columnsQuoted}) VALUES\n".implode(",\n", $valueStrings).";\n");
                }
            });

            fwrite($handle, "\n");
        }

        // Pie: reactivar foreign keys y sincronizar secuencias autoincrementables
        fwrite($handle, "-- Reactivar validación de llaves foráneas\n");
        fwrite($handle, "SET session_replication_role = 'default';\n\n");

        fwrite($handle, "-- Sincronizar secuencias autoincrementables en PostgreSQL\n");
        foreach ($tablesWithId as $t) {
            fwrite($handle, "SELECT setval(pg_get_serial_sequence('\"{$t}\"', 'id'), COALESCE((SELECT MAX(id) FROM \"{$t}\"), 0) + 1, false);\n");
        }

        fclose($handle);

        $fileSizeMb = round(filesize($outputFile) / 1024 / 1024, 2);
        $this->newLine();
        $this->info('=========================================================');
        $this->info('✅ Exportación completada con éxito:');
        $this->info("   - Archivo generado: {$outputFile}");
        $this->info("   - Tamaño: {$fileSizeMb} MB");
        $this->info("   - Total registros: {$totalRowsExported}");
        $this->info('=========================================================');

        return Command::SUCCESS;
    }
}
