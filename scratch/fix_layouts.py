import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find if it imports AppLayout
    if "import AppLayout" not in content and "from '@/layouts/app-layout'" not in content:
        return

    print(f"Fixing {filepath}")

    # Remove the AppLayout import
    content = re.sub(r"import AppLayout[^\n]+\n", "", content)

    # Change <AppLayout breadcrumbs={breadcrumbs}> to <>
    content = re.sub(r"<AppLayout[^>]*>", "<>", content)

    # Change </AppLayout> to </>
    content = content.replace("</AppLayout>", "</>")

    # Find the function name
    match = re.search(r"export default function\s+([A-Za-z0-9_]+)\s*\(", content)
    if match:
        func_name = match.group(1)
        
        # Determine if breadcrumbs exists
        if "const breadcrumbs:" in content or "const breadcrumbs =" in content:
            # We will just append the layout definition
            content += f"\n\n{func_name}.layout = {{\n    breadcrumbs,\n}};\n"
        else:
            # Try to see if breadcrumbs are defined inside the function
            # This requires more complex regex, but we can just blindly add a default one or nothing.
            pass

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = "resources/js/pages"

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith(".tsx"):
            fix_file(os.path.join(root, file))
