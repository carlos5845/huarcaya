<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('trade_name')->nullable()->after('business_name');
            $table->string('economic_activity')->nullable()->after('document_number');
            $table->string('logo_path')->nullable()->after('email');
            $table->string('ubigeo', 6)->nullable()->after('address');
            $table->string('sunat_environment', 20)->default('BETA')->after('status');
            $table->string('sunat_sol_user')->nullable()->after('sunat_environment');
            $table->text('sunat_sol_password')->nullable()->after('sunat_sol_user');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->string('sunat_establishment_code', 4)->default('0000')->after('code');
            $table->string('invoice_series', 4)->default('F001')->after('status');
            $table->string('boleta_series', 4)->default('B001')->after('invoice_series');
            $table->string('ticket_series', 4)->default('NV01')->after('boleta_series');
            $table->string('credit_note_factura_series', 4)->default('FC01')->after('ticket_series');
            $table->string('credit_note_boleta_series', 4)->default('BC01')->after('credit_note_factura_series');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'trade_name',
                'economic_activity',
                'logo_path',
                'ubigeo',
                'sunat_environment',
                'sunat_sol_user',
                'sunat_sol_password',
            ]);
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'sunat_establishment_code',
                'invoice_series',
                'boleta_series',
                'ticket_series',
                'credit_note_factura_series',
                'credit_note_boleta_series',
            ]);
        });
    }
};
