import os
import glob
import re

migrations_dir = r"d:\inversiones\huarcaya\database\migrations"

migrations = {
    "create_cash_registers_table": r"""
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('status', 20)->default('CLOSED');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_cash_movements_table": r"""
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('cash_register_id')->constrained()->restrictOnDelete();
            $table->string('movement_type', 30); // OPENING, CLOSING, IN, OUT, DEPOSIT, WITHDRAWAL
            $table->decimal('amount', 15, 6);
            $table->char('currency_code', 3)->default('PEN');
            $table->timestamp('operation_date');
            $table->string('reference_type', 50)->nullable();
            $table->bigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
""",
    "create_daily_closings_table": r"""
        Schema::create('daily_closings', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->date('closing_date');
            $table->string('status', 20)->default('OPEN'); // OPEN, IN_PROGRESS, CLOSED, CONFLICT
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['branch_id', 'closing_date']);
        });
""",
    "create_daily_closing_versions_table": r"""
        Schema::create('daily_closing_versions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('daily_closing_id')->constrained()->cascadeOnDelete();
            $table->integer('version_number');
            $table->jsonb('snapshot_data'); // Almacenará totales por método de pago, ventas, etc.
            $table->decimal('total_expected', 15, 6)->default(0);
            $table->decimal('total_counted', 15, 6)->default(0);
            $table->decimal('total_difference', 15, 6)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_daily_closing_cash_counts_table": r"""
        Schema::create('daily_closing_cash_counts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('daily_closing_version_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->decimal('expected_amount', 15, 6)->default(0);
            $table->decimal('counted_amount', 15, 6)->default(0);
            $table->decimal('difference_amount', 15, 6)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
""",
    "create_sync_operations_table": r"""
        Schema::create('sync_operations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('operation_type', 20); // CREATE, UPDATE, DELETE
            $table->jsonb('payload');
            $table->string('status', 20)->default('PENDING'); // PENDING, PROCESSING, SUCCESS, FAILED
            $table->integer('retry_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('client_timestamp');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
""",
    "create_sync_operation_dependencies_table": r"""
        Schema::create('sync_operation_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sync_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('depends_on_operation_id')->constrained('sync_operations')->cascadeOnDelete();
            $table->timestamps();
        });
""",
    "create_conflicts_table": r"""
        Schema::create('conflicts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('conflict_type', 50);
            $table->jsonb('server_state')->nullable();
            $table->jsonb('client_state')->nullable();
            $table->string('status', 20)->default('UNRESOLVED');
            $table->foreignId('sync_operation_id')->nullable()->constrained()->nullOnDelete();
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
""",
    "create_sync_change_logs_table": r"""
        Schema::create('sync_change_logs', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('operation_type', 20); // CREATE, UPDATE, DELETE
            $table->timestamp('change_timestamp');
            $table->timestamps();
            
            $table->index('change_timestamp');
            $table->index(['entity_type', 'entity_uuid']);
        });
""",
    "create_reason_codes_table": r"""
        Schema::create('reason_codes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('module', 50); // SALES, INVENTORY, CASH, etc.
            $table->string('code', 30);
            $table->string('description');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
""",
    "create_approvals_table": r"""
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('entity_type', 100);
            $table->bigInteger('entity_id');
            $table->string('approval_type', 50);
            $table->string('status', 20)->default('PENDING'); // PENDING, APPROVED, REJECTED
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
""",
    "create_alerts_table": r"""
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('alert_type', 50);
            $table->string('severity', 20); // INFO, WARNING, CRITICAL
            $table->string('title');
            $table->text('message');
            $table->jsonb('context_data')->nullable();
            $table->boolean('is_read')->default(false);
            $table->foreignId('read_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
""",
    "create_document_sequences_table": r"""
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('prefix', 10)->nullable();
            $table->bigInteger('current_number')->default(0);
            $table->integer('padding')->default(6);
            $table->timestamps();
            
            $table->unique(['company_id', 'branch_id', 'document_type'], 'doc_seq_unique');
        });
""",
    "create_attachments_table": r"""
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('attachable_type', 100);
            $table->bigInteger('attachable_id');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('mime_type', 100)->nullable();
            $table->integer('file_size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
""",
    "create_settings_table": r"""
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('description')->nullable();
            $table->string('type', 20)->default('string'); // string, boolean, integer, json
            $table->string('default_value')->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamps();
        });
""",
    "create_setting_values_table": r"""
        Schema::create('setting_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('setting_id')->constrained()->cascadeOnDelete();
            $table->text('value')->nullable();
            $table->timestamps();
            
            $table->unique(['company_id', 'branch_id', 'setting_id'], 'setting_val_unique');
        });
""",
    "create_audit_events_table": r"""
        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type', 50); // LOGIN, EXPORT, DELETE, UPDATE_CRITICAL
            $table->string('entity_type', 100)->nullable();
            $table->string('entity_uuid', 36)->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
""",
    "create_import_batches_table": r"""
        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type', 50); // PRODUCTS, CUSTOMERS
            $table->string('status', 20)->default('PENDING'); // PENDING, PROCESSING, COMPLETED, FAILED
            $table->integer('total_rows')->default(0);
            $table->integer('processed_rows')->default(0);
            $table->integer('failed_rows')->default(0);
            $table->string('file_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
""",
    "create_import_batch_rows_table": r"""
        Schema::create('import_batch_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained()->cascadeOnDelete();
            $table->integer('row_number');
            $table->jsonb('raw_data');
            $table->string('status', 20)->default('PENDING'); // PENDING, SUCCESS, FAILED
            $table->text('error_message')->nullable();
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
