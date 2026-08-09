@
import os
import glob

models_dir = r"d:\inversiones\huarcaya\app\Models"
files = glob.glob(os.path.join(models_dir, "*.php"))

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    # We only messed up the 14 new models plus maybe some from Phase 2?
    # Actually wait! The Phase 3 models all have `protected \ =`
    if "protected \\ =" in content or "return \\->" in content:
        content = content.replace("protected \\ =", "protected $fillable =")
        content = content.replace("return \\->", "return $this->")
        
        with open(f, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Fixed {os.path.basename(f)}")
@
