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
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->string('purchase_number', 50)->unique();
            $table->string('supplier_document_type', 30)->nullable();
            $table->string('supplier_document_series', 30)->nullable();
            $table->string('supplier_document_number', 50)->nullable();
            $table->date('document_date')->nullable();
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('subtotal_amount', 15, 6);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('total_amount', 15, 6);
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->unique(['supplier_id', 'supplier_document_type', 'supplier_document_series', 'supplier_document_number'], 'purchase_doc_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
