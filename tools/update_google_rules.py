#!/usr/bin/env python3
"""
Update Google SEO rules
"""
import yaml
import os

def main():
    os.makedirs('knowledge', exist_ok=True)
    
    google_rules = {
        'title': {
            'min_length': 30,
            'max_length': 60,
            'keywords_position': 'start'
        },
        'description': {
            'min_length': 120,
            'max_length': 160
        },
        'headings': {
            'h1_count': 1,
            'h2_min': 2
        }
    }
    
    with open('knowledge/google_rules.yml', 'w') as f:
        yaml.dump(google_rules, f, default_flow_style=False)
    
    print("✅ Updated google_rules.yml")

if __name__ == '__main__':
    main()
