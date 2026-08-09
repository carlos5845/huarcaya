import os
import glob
import re

migrations_dir = r"d:\inversiones\huarcaya\database\migrations"

migrations = {
    "create_sales_table": r"""
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
""",
    "create_sale_lines_table": r"""
        Schema::create('sale_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('kit_version_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_type_snapshot', 30);
            $table->string('product_reference_snapshot');
            $table->string('product_name_snapshot');
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_price', 15, 6);
            $table->decimal('unit_cost_base', 15, 6)->default(0);
            $table->decimal('line_subtotal', 15, 6);
            $table->decimal('discount_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('line_total', 15, 6);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_customer_returns_table": r"""
        Schema::create('customer_returns', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('return_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->string('return_type', 30);
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('subtotal_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('total_amount', 15, 6)->default(0);
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_customer_return_lines_table": r"""
        Schema::create('customer_return_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('customer_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_line_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_price', 15, 6);
            $table->decimal('line_total', 15, 6);
            $table->string('condition', 20)->default('GOOD');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_receivables_table": r"""
        Schema::create('receivables', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('reference_type', 50)->nullable();
            $table->bigInteger('reference_id')->nullable();
            $table->timestamp('issue_date');
            $table->date('due_date')->nullable();
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('original_amount', 15, 6);
            $table->decimal('balance_amount', 15, 6);
            $table->string('status', 20)->default('ACTIVE');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
""",
    "create_payment_methods_table": r"""
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('name');
            $table->boolean('is_cash')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['company_id', 'code']);
        });
""",
    "create_payments_table": r"""
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('payment_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('total_amount', 15, 6);
            $table->string('status', 20)->default('CONFIRMED');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_payment_method_lines_table": r"""
        Schema::create('payment_method_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 15, 6);
            $table->string('reference_number', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_payment_allocations_table": r"""
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('receivable_id')->constrained()->restrictOnDelete();
            $table->decimal('allocated_amount', 15, 6);
            $table->timestamps();
        });
""",
    "create_refunds_table": r"""
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_return_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('refund_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->char('currency_code', 3)->default('PEN');
            $table->decimal('exchange_rate', 15, 6)->nullable();
            $table->decimal('total_amount', 15, 6);
            $table->string('status', 20)->default('CONFIRMED');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_refund_method_lines_table": r"""
        Schema::create('refund_method_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('refund_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 15, 6);
            $table->string('reference_number', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
"""
}

for file_path in glob.glob(os.path.join(migrations_dir, "*_create_*_table.php")):
    filename = os.path.basename(file_path)
    for key, replacement in migrations.items():
        if key in filename:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Escape regex characters
            pattern = r"Schema::create\('([^']+)',\s*function\s*\(\w+\s*\$table\)\s*\{[^\}]+\}\);"
            
            new_content = re.sub(pattern, replacement.strip().replace('\\', '\\\\'), content)
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {filename}")
