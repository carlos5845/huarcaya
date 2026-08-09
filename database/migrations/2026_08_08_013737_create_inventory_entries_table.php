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
        Schema::create('inventory_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('entry_number', 50)->unique();
            $table->string('entry_type', 50);
            $table->timestamp('operation_date');
            $table->foreignId('purchase_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('source_type', 50)->nullable();
            $table->bigInteger('source_id')->nullable();
            $table->string('external_document_type', 50)->nullable();
            $table->string('external_document_number', 50)->nullable();
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('created_offline')->default(false);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_entries');
    }
};
