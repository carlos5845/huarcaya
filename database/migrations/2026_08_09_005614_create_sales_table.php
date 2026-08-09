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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->string('sale_number', 50)->unique();
            $table->string('sale_type', 20); // CASH, CREDIT, PARTIAL
            $table->timestamp('operation_date');
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('subtotal_amount', 15, 6);
            $table->decimal('discount_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('total_amount', 15, 6);
            $table->decimal('initial_payment_amount', 15, 6)->default(0);
            $table->decimal('credit_amount', 15, 6)->default(0);
            $table->date('due_date')->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->string('external_document_type', 30)->nullable();
            $table->string('external_document_series', 30)->nullable();
            $table->string('external_document_number', 50)->nullable();
            $table->string('customer_name_snapshot');
            $table->string('customer_document_snapshot')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('created_offline')->default(false);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancellation_reason_id')->nullable()->constrained('reason_codes')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
