import sys

# Read the file
with open('src/components/Dashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 550-562 (0-indexed: 549-561)
new_lines = lines[:549] + lines[562:]

# Write back
with open('src/components/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Lines 550-562 removed successfully")
