import requests
from bs4 import BeautifulSoup
from typing import Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)

def scrape_loopnet_listing(url: str) -> Optional[Dict[str, any]]:
    """
    Scrapes property data from a LoopNet listing URL.
    Note: In production, you should respect robots.txt and terms of service.
    This is a simplified example that may need adjustment based on LoopNet's structure.
    """
    try:
        # Add headers to appear as a regular browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract data based on common LoopNet patterns
        # Note: These selectors may need to be updated based on actual HTML structure
        property_data = {}
        
        # Try to extract address
        address_elem = soup.find('h1', class_='property-address') or soup.find('div', class_='address')
        if address_elem:
            property_data['address'] = address_elem.get_text(strip=True)
        
        # Try to extract property type
        type_elem = soup.find('span', class_='property-type') or soup.find('div', class_='type')
        if type_elem:
            property_data['propertyType'] = type_elem.get_text(strip=True)
        
        # Try to extract price
        price_elem = soup.find('div', class_='price') or soup.find('span', class_='asking-price')
        if price_elem:
            property_data['price'] = price_elem.get_text(strip=True)
        
        # Try to extract key metrics
        metrics_section = soup.find('div', class_='property-metrics') or soup.find('section', class_='metrics')
        if metrics_section:
            # Look for cap rate
            cap_rate_match = re.search(r'cap\s*rate[:\s]*([0-9.]+)%', metrics_section.get_text(), re.IGNORECASE)
            if cap_rate_match:
                property_data['capRate'] = f"{cap_rate_match.group(1)}%"
            
            # Look for NOI
            noi_match = re.search(r'noi[:\s]*\$([0-9,]+)', metrics_section.get_text(), re.IGNORECASE)
            if noi_match:
                property_data['noi'] = f"${noi_match.group(1)}"
            
            # Look for square footage
            sqft_match = re.search(r'([0-9,]+)\s*(?:sf|sq\s*ft)', metrics_section.get_text(), re.IGNORECASE)
            if sqft_match:
                property_data['squareFeet'] = f"{sqft_match.group(1)} SF"
            
            # Look for year built
            year_match = re.search(r'(?:built|year)[:\s]*([0-9]{4})', metrics_section.get_text(), re.IGNORECASE)
            if year_match:
                property_data['yearBuilt'] = int(year_match.group(1))
            
            # Look for units (for multifamily)
            units_match = re.search(r'([0-9]+)\s*units?', metrics_section.get_text(), re.IGNORECASE)
            if units_match:
                property_data['units'] = int(units_match.group(1))
        
        # Look for lot size
        lot_elem = soup.find(text=re.compile(r'lot\s*size', re.IGNORECASE))
        if lot_elem:
            lot_parent = lot_elem.parent
            lot_match = re.search(r'([0-9.,]+)\s*(?:acres?|ac)', lot_parent.get_text(), re.IGNORECASE)
            if lot_match:
                property_data['lotSize'] = f"{lot_match.group(1)} Acres"
        
        # If we didn't find much data, try a more generic approach
        if len(property_data) < 3:
            # Look for any structured data
            script_tags = soup.find_all('script', type='application/ld+json')
            for script in script_tags:
                try:
                    import json
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        if 'name' in data:
                            property_data['address'] = data.get('name', '')
                        if 'address' in data:
                            property_data['address'] = f"{data['address'].get('streetAddress', '')}, {data['address'].get('addressLocality', '')}, {data['address'].get('addressRegion', '')}"
                except:
                    pass
        
        return property_data if property_data else None
        
    except requests.RequestException as e:
        logger.error(f"Error fetching LoopNet URL: {e}")
        return None
    except Exception as e:
        logger.error(f"Error parsing LoopNet data: {e}")
        return None

def extract_property_info_from_text(text: str) -> Dict[str, any]:
    """
    Fallback function to extract property information from any text
    using pattern matching.
    """
    info = {}
    
    # Extract address patterns
    address_pattern = r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct),?\s*[A-Za-z\s]+,?\s*[A-Z]{2}'
    address_match = re.search(address_pattern, text)
    if address_match:
        info['address'] = address_match.group(0).strip()
    
    # Extract price
    price_pattern = r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|M|K))?'
    price_match = re.search(price_pattern, text)
    if price_match:
        info['price'] = price_match.group(0)
    
    # Extract cap rate
    cap_pattern = r'(?:cap\s*rate|CAP)[:\s]*([0-9.]+)%'
    cap_match = re.search(cap_pattern, text, re.IGNORECASE)
    if cap_match:
        info['capRate'] = f"{cap_match.group(1)}%"
    
    # Extract square footage
    sqft_pattern = r'([0-9,]+)\s*(?:square\s*feet|sq\s*ft|SF)'
    sqft_match = re.search(sqft_pattern, text, re.IGNORECASE)
    if sqft_match:
        info['squareFeet'] = f"{sqft_match.group(1)} SF"
    
    # Extract year built
    year_pattern = r'(?:built|constructed|year)[:\s]*([0-9]{4})'
    year_match = re.search(year_pattern, text, re.IGNORECASE)
    if year_match:
        info['yearBuilt'] = int(year_match.group(1))
    
    return info 