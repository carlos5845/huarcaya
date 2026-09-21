<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('payment_type', 20)->default('CASH')->after('sale_type');
            $table->string('payment_status', 20)->default('UNPAID')->after('status');
            $table->foreignId('payment_method_id')->nullable()->after('payment_type')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['payment_method_id']);
            $table->dropColumn(['payment_type', 'payment_status', 'payment_method_id']);
        });
    }
};
