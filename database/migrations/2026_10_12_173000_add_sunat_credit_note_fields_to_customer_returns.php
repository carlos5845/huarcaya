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
        Schema::table('customer_returns', function (Blueprint $table) {
            if (! Schema::hasColumn('customer_returns', 'is_electronic_invoiced')) {
                $table->boolean('is_electronic_invoiced')->default(false)->after('status');
            }
            if (! Schema::hasColumn('customer_returns', 'sunat_credit_note_type')) {
                $table->string('sunat_credit_note_type', 2)->nullable()->after('is_electronic_invoiced');
            }
            if (! Schema::hasColumn('customer_returns', 'referenced_document_type')) {
                $table->string('referenced_document_type', 5)->nullable()->after('sunat_credit_note_type');
            }
            if (! Schema::hasColumn('customer_returns', 'referenced_document_series')) {
                $table->string('referenced_document_series', 15)->nullable()->after('referenced_document_type');
            }
            if (! Schema::hasColumn('customer_returns', 'referenced_document_number')) {
                $table->string('referenced_document_number', 20)->nullable()->after('referenced_document_series');
            }
            if (! Schema::hasColumn('customer_returns', 'credit_note_series')) {
                $table->string('credit_note_series', 10)->nullable()->after('referenced_document_number');
            }
            if (! Schema::hasColumn('customer_returns', 'credit_note_number')) {
                $table->string('credit_note_number', 20)->nullable()->after('credit_note_series');
            }
            if (! Schema::hasColumn('customer_returns', 'electronic_status')) {
                $table->string('electronic_status', 30)->default('NOT_APPLICABLE')->after('credit_note_number');
            }
            if (! Schema::hasColumn('customer_returns', 'electronic_payload')) {
                $table->json('electronic_payload')->nullable()->after('electronic_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_returns', function (Blueprint $table) {
            $columns = [
                'is_electronic_invoiced',
                'sunat_credit_note_type',
                'referenced_document_type',
                'referenced_document_series',
                'referenced_document_number',
                'credit_note_series',
                'credit_note_number',
                'electronic_status',
                'electronic_payload',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('customer_returns', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
