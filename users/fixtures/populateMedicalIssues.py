import json
from users.models import MedicalIssues

def populate_database(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Create recipes
    print(f"\n{'='*50}")
    print("CREATING ISSUES")
    print('='*50)
    issues_created = 0
    for issue in data:
        try:
            issue.pop('condition_id', None)  
            issue = MedicalIssues.objects.create(**issue)
            issues_created += 1
            issue.save()
        except Exception as e:
            print(f"  ✗ Error creating issues '{issue.get('name_en')}': {e}")
    
# Execute the population
if __name__ == '__main__':
    # Update this path to your JSON file location
    JSON_FILE_PATH = 'users/fixtures/medical_issues.json'
    
    
    print("Starting database population...")
    populate_database(JSON_FILE_PATH)
    print("\n✓ Database population completed!")