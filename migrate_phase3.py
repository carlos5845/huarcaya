import os
import glob

migrations_dir = r'd:\inversiones\huarcaya\database\migrations'

migrations = {
    'create_suppliers_table': '''
        Schema::create('suppliers', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('company_id')->constrained()->cascadeOnDelete();
            \->string('document_type', 30)->nullable();
            \->string('document_number', 50)->nullable();
            \->string('legal_name');
            \->string('trade_name')->nullable();
            \->string('phone', 50)->nullable();
            \->string('email')->nullable();
            \->text('address')->nullable();
            \->string('contact_name')->nullable();
            \->text('notes')->nullable();
            \->string('status', 20)->default('ACTIVE');
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->timestamps();
            
            \->unique(['company_id', 'document_type', 'document_number']);
        });
''',
    'create_customers_table': '''
        Schema::create('customers', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('company_id')->constrained()->cascadeOnDelete();
            \->string('document_type', 30)->nullable();
            \->string('document_number', 50)->nullable();
            \->string('legal_name');
            \->string('trade_name')->nullable();
            \->string('phone', 50)->nullable();
            \->string('email')->nullable();
            \->text('address')->nullable();
            \->string('status', 20)->default('ACTIVE');
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->timestamps();
            
            \->unique(['company_id', 'document_type', 'document_number']);
        });
''',
    'create_purchases_table': '''
        Schema::create('purchases', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('company_id')->constrained()->cascadeOnDelete();
            \->foreignId('branch_id')->constrained()->restrictOnDelete();
            \->foreignId('supplier_id')->constrained()->restrictOnDelete();
            \->string('purchase_number', 50)->unique();
            \->string('supplier_document_type', 30)->nullable();
            \->string('supplier_document_series', 30)->nullable();
            \->string('supplier_document_number', 50)->nullable();
            \->date('document_date')->nullable();
            \->char('currency_code', 3)->default('PEN');
            \->decimal('exchange_rate', 15, 6)->nullable();
            \->decimal('subtotal_amount', 15, 6);
            \->decimal('tax_amount', 15, 6)->default(0);
            \->decimal('total_amount', 15, 6);
            \->string('status', 20)->default('DRAFT');
            \->text('notes')->nullable();
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            \->timestamp('confirmed_at')->nullable();
            \->timestamp('cancelled_at')->nullable();
            \->timestamps();
            
            \->unique(['supplier_id', 'supplier_document_type', 'supplier_document_series', 'supplier_document_number'], 'purchase_doc_unique');
        });
''',
    'create_purchase_lines_table': '''
        Schema::create('purchase_lines', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->restrictOnDelete();
            \->decimal('ordered_quantity', 15, 6);
            \->decimal('unit_cost_original', 15, 6);
            \->decimal('unit_cost_base', 15, 6);
            \->decimal('line_subtotal', 15, 6);
            \->decimal('tax_amount', 15, 6)->default(0);
            \->decimal('line_total', 15, 6);
            \->decimal('received_quantity', 15, 6)->default(0);
            \->decimal('cancelled_quantity', 15, 6)->default(0);
            \->text('notes')->nullable();
            \->timestamps();
        });
''',
    'create_inventory_entries_table': '''
        Schema::create('inventory_entries', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->restrictOnDelete();
            \->string('entry_number', 50)->unique();
            \->string('entry_type', 50);
            \->timestamp('operation_date');
            \->foreignId('purchase_id')->nullable()->constrained()->restrictOnDelete();
            \->foreignId('supplier_id')->nullable()->constrained()->restrictOnDelete();
            \->string('source_type', 50)->nullable();
            \->bigInteger('source_id')->nullable();
            \->string('external_document_type', 50)->nullable();
            \->string('external_document_number', 50)->nullable();
            \->char('currency_code', 3)->default('PEN');
            \->decimal('exchange_rate', 15, 6)->nullable();
            \->string('status', 20)->default('DRAFT');
            \->text('notes')->nullable();
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            \->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            \->boolean('created_offline')->default(false);
            \->timestamp('confirmed_at')->nullable();
            \->timestamp('cancelled_at')->nullable();
            \->timestamps();
        });
''',
    'create_inventory_entry_lines_table': '''
        Schema::create('inventory_entry_lines', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('inventory_entry_id')->constrained()->cascadeOnDelete();
            \->foreignId('purchase_line_id')->nullable()->constrained()->restrictOnDelete();
            \->foreignId('product_id')->constrained()->restrictOnDelete();
            \->decimal('quantity', 15, 6);
            \->decimal('unit_cost_original', 15, 6);
            \->decimal('unit_cost_base', 15, 6);
            \->decimal('total_cost_base', 15, 6);
            \->string('condition', 20)->default('GOOD');
            \->text('notes')->nullable();
            \->timestamps();
        });
''',
    'create_inventories_table': '''
        Schema::create('inventories', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->cascadeOnDelete();
            \->foreignId('warehouse_location_id')->nullable()->constrained()->nullOnDelete();
            \->decimal('physical_quantity', 15, 6)->default(0);
            \->decimal('available_quantity', 15, 6)->default(0);
            \->decimal('average_cost', 15, 6)->default(0);
            \->string('status', 20)->default('ACTIVE');
            \->timestamp('last_counted_at')->nullable();
            \->timestamps();
            
            \->unique(['branch_id', 'product_id', 'warehouse_location_id'], 'inv_unique');
        });
''',
    'create_lots_table': '''
        Schema::create('lots', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->cascadeOnDelete();
            \->string('lot_number', 50);
            \->foreignId('inventory_entry_line_id')->nullable()->constrained()->nullOnDelete();
            \->date('manufacturing_date')->nullable();
            \->date('expiration_date')->nullable();
            \->decimal('original_quantity', 15, 6);
            \->decimal('current_quantity', 15, 6);
            \->decimal('unit_cost', 15, 6);
            \->string('status', 20)->default('ACTIVE');
            \->timestamps();
            
            \->unique(['branch_id', 'product_id', 'lot_number']);
        });
''',
    'create_inventory_reservations_table': '''
        Schema::create('inventory_reservations', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->cascadeOnDelete();
            \->string('source_type', 50);
            \->bigInteger('source_id');
            \->string('status', 20)->default('ACTIVE');
            \->timestamp('expires_at')->nullable();
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->timestamps();
        });
''',
    'create_inventory_reservation_allocations_table': '''
        Schema::create('inventory_reservation_allocations', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('inventory_reservation_id')->constrained('inventory_reservations', 'id')->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->cascadeOnDelete();
            \->decimal('requested_quantity', 15, 6);
            \->decimal('allocated_quantity', 15, 6)->default(0);
            \->string('status', 20)->default('RESERVED');
            \->timestamps();
        });
''',
    'create_inventory_movements_table': '''
        Schema::create('inventory_movements', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->restrictOnDelete();
            \->string('movement_type', 30); // IN, OUT, TRANSFER, ADJUSTMENT
            \->string('reference_type', 50)->nullable();
            \->bigInteger('reference_id')->nullable();
            \->timestamp('operation_date');
            \->text('notes')->nullable();
            \->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            \->timestamps();
        });
''',
    'create_inventory_movement_lines_table': '''
        Schema::create('inventory_movement_lines', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('inventory_movement_id')->constrained()->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->restrictOnDelete();
            \->string('direction', 10); // IN or OUT
            \->decimal('quantity', 15, 6);
            \->decimal('unit_cost', 15, 6);
            \->decimal('total_cost', 15, 6);
            \->timestamps();
        });
''',
    'create_lot_allocations_table': '''
        Schema::create('lot_allocations', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('inventory_movement_line_id')->constrained('inventory_movement_lines', 'id')->cascadeOnDelete();
            \->foreignId('lot_id')->constrained()->restrictOnDelete();
            \->decimal('quantity', 15, 6);
            \->timestamps();
        });
''',
    'create_kardex_entries_table': '''
        Schema::create('kardex_entries', function (Blueprint \) {
            \->id();
            \->uuid('uuid')->unique();
            \->foreignId('branch_id')->constrained()->cascadeOnDelete();
            \->foreignId('product_id')->constrained()->cascadeOnDelete();
            \->foreignId('inventory_movement_line_id')->nullable()->constrained('inventory_movement_lines', 'id')->nullOnDelete();
            \->timestamp('date');
            \->string('operation_type', 50);
            \->string('reference')->nullable();
            \->decimal('input_quantity', 15, 6)->default(0);
            \->decimal('input_unit_cost', 15, 6)->default(0);
            \->decimal('input_total_cost', 15, 6)->default(0);
            \->decimal('output_quantity', 15, 6)->default(0);
            \->decimal('output_unit_cost', 15, 6)->default(0);
            \->decimal('output_total_cost', 15, 6)->default(0);
            \->decimal('balance_quantity', 15, 6)->default(0);
            \->decimal('balance_unit_cost', 15, 6)->default(0);
            \->decimal('balance_total_cost', 15, 6)->default(0);
            \->timestamps();
        });
'''
}

import re

for file_path in glob.glob(os.path.join(migrations_dir, '*_create_*_table.php')):
    filename = os.path.basename(file_path)
    for key, replacement in migrations.items():
        if key in filename:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace the contents of the up method inside Schema::create
            pattern = r"Schema::create\('([^']+)',\s*function\s*\(\w+\s*\\)\s*\{[^\}]+\}\);"
            
            new_content = re.sub(pattern, replacement.strip(), content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
