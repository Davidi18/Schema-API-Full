#!/usr/bin/env python3
"""
Update ontology.json from Schema.org
"""
import json
import requests
from bs4 import BeautifulSoup
import os

def fetch_schema_types():
    """Fetch Schema.org types"""
    url = "https://schema.org/docs/full.html"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    types = []
    for link in soup.find_all('a', href=True):
        href = link.get('href')
        if href.startswith('/') and not href.startswith('//'):
            types.append({
                'name': href[1:],  # remove leading /
                'url': f"https://schema.org{href}"
            })
    
    return types

def main():
    os.makedirs('knowledge', exist_ok=True)
    
    ontology = {
        'version': '1.0.0',
        'updated': '2025-01-01',
        'types': fetch_schema_types()
    }
    
    with open('knowledge/ontology.json', 'w') as f:
        json.dump(ontology, f, indent=2)
    
    print(f"✅ Updated ontology.json with {len(ontology['types'])} types")

if __name__ == '__main__':
    main()
