import os
import glob

migrations_dir = r"d:\inversiones\huarcaya\database\migrations"

add_dni_file = glob.glob(os.path.join(migrations_dir, "*_add_dni_to_users_table.php"))[0]
with open(add_dni_file, "w", encoding="utf-8") as f:
    f.write("""<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('dni', 15)->unique()->after('default_branch_id')->nullable();
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('dni');
            $table->string('email')->nullable(false)->change();
        });
    }
};
""")
print(f"Updated {os.path.basename(add_dni_file)}")

create_otp_file = glob.glob(os.path.join(migrations_dir, "*_create_otp_codes_table.php"))[0]
with open(create_otp_file, "w", encoding="utf-8") as f:
    f.write("""<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('dni', 15)->index();
            $table->string('code', 10);
            $table->timestamp('expires_at');
            $table->boolean('is_used')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
""")
print(f"Updated {os.path.basename(create_otp_file)}")
