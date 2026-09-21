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
        Schema::table('transfer_lines', function (Blueprint $table) {
            $table->decimal('damaged_quantity', 15, 6)->default(0)->after('received_quantity');
            $table->decimal('missing_quantity', 15, 6)->default(0)->after('damaged_quantity');
            $table->decimal('unit_cost', 12, 4)->default(0)->after('missing_quantity');
        });

        Schema::table('transfers', function (Blueprint $table) {
            $table->text('reception_notes')->nullable()->after('status');
            $table->foreignId('received_by_user_id')->nullable()->after('confirmed_by')->constrained('users')->nullOnDelete();
            $table->timestamp('received_at')->nullable()->after('confirmed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transfer_lines', function (Blueprint $table) {
            $table->dropColumn(['damaged_quantity', 'missing_quantity', 'unit_cost']);
        });

        Schema::table('transfers', function (Blueprint $table) {
            $table->dropForeign(['received_by_user_id']);
            $table->dropColumn(['reception_notes', 'received_by_user_id', 'received_at']);
        });
    }
};
