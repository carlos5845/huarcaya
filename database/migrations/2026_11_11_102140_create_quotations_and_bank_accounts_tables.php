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
        // 1. Cuentas bancarias de la empresa
        Schema::create('company_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('bank_name', 50);          // BCP, BBVA, Interbank, Scotiabank, Banco de la Nación
            $table->string('account_type', 30);       // Cuenta Corriente, Ahorros
            $table->char('currency_code', 3);         // PEN, USD
            $table->string('account_number', 50);
            $table->string('cci', 50)->nullable();    // Código de Cuenta Interbancario
            $table->string('beneficiary_name', 150);  // Titular
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Cabecera de Cotizaciones
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();

            // Correlativo estructurado por serie y sucursal: COT-001-000001
            $table->string('series', 10);
            $table->string('correlative', 20);
            $table->string('quotation_number', 50)->unique();

            $table->timestamp('operation_date');
            $table->date('valid_until_date');
            $table->integer('validity_days')->default(15);

            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->default(1.0);

            // Importes monetarios
            $table->decimal('subtotal_amount', 15, 6);
            $table->decimal('discount_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('total_amount', 15, 6);
            $table->string('tax_mode', 20)->default('INCLUDED'); // INCLUDED, PLUS_TAX, EXEMPT

            // Estado comercial: PENDING, APPROVED, REJECTED, EXPIRED, CONVERTED
            $table->string('status', 20)->default('PENDING');

            // Snapshot del cliente al momento de cotizar
            $table->string('customer_name_snapshot');
            $table->string('customer_document_snapshot')->nullable();
            $table->string('customer_address_snapshot')->nullable();
            $table->string('customer_phone_snapshot')->nullable();
            $table->string('customer_email_snapshot')->nullable();

            // Condiciones comerciales
            $table->string('payment_terms', 100)->nullable();
            $table->string('delivery_time', 100)->nullable();
            $table->text('notes')->nullable();

            // Auditoría y Conversión a Venta
            $table->foreignId('converted_sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->foreignId('converted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['branch_id', 'series', 'status']);
        });

        // 3. Líneas de Cotización (Productos)
        Schema::create('quotation_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('quotation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();

            // Snapshots del repuesto
            $table->string('product_reference_snapshot');
            $table->string('product_name_snapshot');
            $table->string('unit_code_snapshot', 20)->default('NIU');

            // Cantidades y precios
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_price', 15, 6);
            $table->decimal('unit_cost_base', 15, 6)->default(0);
            $table->decimal('line_subtotal', 15, 6);
            $table->decimal('discount_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('line_total', 15, 6);

            // Cotización bajo pedido / sin stock
            $table->boolean('is_special_order')->default(false);
            $table->decimal('current_stock_snapshot', 15, 6)->default(0);
            $table->string('delivery_time_line', 100)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_lines');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('company_bank_accounts');
    }
};
