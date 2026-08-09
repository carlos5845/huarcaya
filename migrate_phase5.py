import os
import glob
import re

migrations_dir = r"d:\inversiones\huarcaya\database\migrations"

migrations = {
    "create_inventory_exits_table": r"""
        Schema::create('inventory_exits', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('exit_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->string('exit_type', 30); // CONSUMPTION, DONATION, WRITE_OFF, THEFT, EXPIRED, OTHER
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_inventory_exit_lines_table": r"""
        Schema::create('inventory_exit_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('inventory_exit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_cost', 15, 6)->default(0);
            $table->decimal('line_total_cost', 15, 6)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_supplier_returns_table": r"""
        Schema::create('supplier_returns', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('return_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->string('return_type', 30);
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_supplier_return_lines_table": r"""
        Schema::create('supplier_return_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('supplier_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_line_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_cost', 15, 6)->default(0);
            $table->decimal('line_total_cost', 15, 6)->default(0);
            $table->string('condition', 20)->default('GOOD');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_inventory_counts_table": r"""
        Schema::create('inventory_counts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('count_number', 50)->unique();
            $table->string('count_type', 30); // FULL, PARTIAL, CYCLE
            $table->timestamp('scheduled_date')->nullable();
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_inventory_count_lines_table": r"""
        Schema::create('inventory_count_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('inventory_count_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('system_quantity', 15, 6)->nullable();
            $table->decimal('counted_quantity', 15, 6)->nullable();
            $table->decimal('difference_quantity', 15, 6)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_inventory_count_attempts_table": r"""
        Schema::create('inventory_count_attempts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('inventory_count_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_count_line_id')->constrained()->cascadeOnDelete();
            $table->integer('attempt_number');
            $table->decimal('counted_quantity', 15, 6);
            $table->foreignId('counted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('counted_at');
            $table->timestamps();
        });
""",
    "create_inventory_adjustments_table": r"""
        Schema::create('inventory_adjustments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('inventory_count_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('adjustment_number', 50)->unique();
            $table->timestamp('operation_date');
            $table->string('adjustment_type', 30); // POSITIVE, NEGATIVE
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_inventory_adjustment_lines_table": r"""
        Schema::create('inventory_adjustment_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('inventory_adjustment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_cost', 15, 6)->default(0);
            $table->decimal('line_total_cost', 15, 6)->default(0);
            $table->string('reason_code', 30)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_transfers_table": r"""
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('destination_branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('transfer_number', 50)->unique();
            $table->timestamp('request_date');
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_lines_table": r"""
        Schema::create('transfer_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('requested_quantity', 15, 6);
            $table->decimal('shipped_quantity', 15, 6)->default(0);
            $table->decimal('received_quantity', 15, 6)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_shipments_table": r"""
        Schema::create('transfer_shipments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->string('shipment_number', 50)->unique();
            $table->timestamp('shipment_date');
            $table->string('status', 20)->default('DRAFT'); // DRAFT, IN_TRANSIT, DELIVERED, CANCELLED
            $table->string('tracking_number', 100)->nullable();
            $table->string('carrier_name', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('shipped_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_shipment_lines_table": r"""
        Schema::create('transfer_shipment_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transfer_line_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_receipts_table": r"""
        Schema::create('transfer_receipts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transfer_shipment_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('receipt_number', 50)->unique();
            $table->timestamp('receipt_date');
            $table->string('status', 20)->default('DRAFT');
            $table->text('notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_receipt_lines_table": r"""
        Schema::create('transfer_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transfer_shipment_line_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('transfer_line_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 15, 6);
            $table->string('condition', 20)->default('GOOD');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_transfer_differences_table": r"""
        Schema::create('transfer_differences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transfer_line_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('difference_quantity', 15, 6);
            $table->string('resolution_status', 30)->default('PENDING');
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
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
            
            pattern = r"Schema::create\('([^']+)',\s*function\s*\(\w+\s*\$table\)\s*\{[^\}]+\}\);"
            new_content = re.sub(pattern, replacement.strip().replace('\\', '\\\\'), content)
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {filename}")
