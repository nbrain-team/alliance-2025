import random
import json
from jinja2 import Template
from datetime import datetime
from typing import Dict, Any, Optional

# --- CONFIGURABLE SCORING RULES ---
SCORING_RULES = {
    "capRate": {"green": 6.0, "yellow": 4.5, "red": 0},
    "trafficVolume": {"green": 8000, "yellow": 2500, "red": 0},
    "pricePerSqFt": {"green": 300, "yellow": 400, "red": 999999},
    "occupancyRate": {"green": 90, "yellow": 80, "red": 0},
    "yearBuilt": {"green": 2000, "yellow": 1980, "red": 0},
    "vacancyRate": {"green": 10, "yellow": 15, "red": 100},  # Lower is better
    "zoningMatch": {"required": True},
    "deferredMaintenance": {"dealBreaker": True}
}

# Property type specific scoring adjustments
PROPERTY_TYPE_RULES = {
    "Multifamily": {
        "unitCountMin": 20,
        "parkingRatio": 1.5  # Parking spaces per unit
    },
    "Medical Office/Veterinary": {
        "parkingRatio": 4.0,  # Per 1000 sq ft
        "minLeaseTermYears": 3
    },
    "Industrial": {
        "fullBayAccess": {"required": True},
        "clearHeightMin": 24  # feet
    }
}

def calculate_metrics_from_data(deal_data: dict, additional_data: dict) -> dict:
    """
    Calculate key metrics from the collected data
    """
    metrics = {}
    
    # Extract data from additional_data if available
    if additional_data:
        # Calculate cap rate if we have rent roll and price estimate
        if 'rentRoll' in additional_data:
            annual_rent = additional_data.get('rentRoll', 0) * 12
            # Placeholder: estimate property value (in production, this would come from APIs)
            estimated_value = annual_rent * 10  # Simple 10x multiplier for demo
            metrics['capRate'] = (annual_rent / estimated_value) * 100 if estimated_value > 0 else 0
        
        # Use actual vacancy rate if provided
        if 'vacancyRate' in additional_data:
            metrics['vacancyRate'] = additional_data['vacancyRate']
            metrics['occupancyRate'] = 100 - additional_data['vacancyRate']
        
        # Year built for age assessment
        if 'yearBuilt' in additional_data:
            metrics['yearBuilt'] = additional_data['yearBuilt']
            metrics['propertyAge'] = datetime.now().year - additional_data['yearBuilt']
        
        # Industrial specific
        if 'fullBayAccess' in additional_data:
            metrics['fullBayAccess'] = additional_data['fullBayAccess']
    
    # Add placeholder data for metrics not collected (in production, these would come from APIs)
    if 'capRate' not in metrics:
        metrics['capRate'] = round(random.uniform(4.0, 7.5), 2)
    
    metrics['trafficVolume'] = random.randint(1000, 20000)
    metrics['pricePerSqFt'] = random.randint(200, 500)
    metrics['zoningMatch'] = random.choice([True, False])
    metrics['deferredMaintenanceFlag'] = random.choice([True, False]) if random.random() > 0.8 else False
    
    return metrics

def evaluate_metric(metric_name: str, value: Any, rules: dict = SCORING_RULES) -> str:
    """
    Evaluate a single metric against scoring rules
    Returns: 'green', 'yellow', or 'red'
    """
    if metric_name not in rules:
        return 'yellow'  # Default to yellow for unknown metrics
    
    rule = rules[metric_name]
    
    # Handle boolean flags
    if 'required' in rule and not value:
        return 'red'
    if 'dealBreaker' in rule and value:
        return 'red'
    
    # Handle numeric thresholds
    if 'green' in rule and 'yellow' in rule:
        # For metrics where lower is better (like vacancy rate)
        if metric_name in ['vacancyRate', 'pricePerSqFt']:
            if value <= rule['green']:
                return 'green'
            elif value <= rule['yellow']:
                return 'yellow'
            else:
                return 'red'
        else:
            # For metrics where higher is better
            if value >= rule['green']:
                return 'green'
            elif value >= rule['yellow']:
                return 'yellow'
            else:
                return 'red'
    
    return 'yellow'

def score_deal_logic(deal_data: dict) -> dict:
    """
    Enhanced scoring logic that considers all collected data
    """
    # Parse additional data if provided
    additional_data = {}
    if 'additional_data' in deal_data:
        try:
            additional_data = json.loads(deal_data['additional_data'])
        except:
            pass
    
    # Calculate metrics from the collected data
    metrics = calculate_metrics_from_data(deal_data, additional_data)
    
    # Score each metric
    metric_scores = {}
    red_flags = []
    yellow_flags = []
    green_metrics = []
    
    for metric, value in metrics.items():
        score = evaluate_metric(metric, value)
        metric_scores[metric] = score
        
        if score == 'red':
            red_flags.append(f"{metric}: {value}")
        elif score == 'yellow':
            yellow_flags.append(f"{metric}: {value}")
        else:
            green_metrics.append(f"{metric}: {value}")
    
    # Property type specific evaluation
    property_type = additional_data.get('propertyType', deal_data.get('property_type', 'Other'))
    if property_type in PROPERTY_TYPE_RULES:
        type_rules = PROPERTY_TYPE_RULES[property_type]
        
        # Check unit count for multifamily
        if property_type == 'Multifamily' and 'unitCount' in additional_data:
            if additional_data['unitCount'] < type_rules.get('unitCountMin', 20):
                red_flags.append(f"Unit count below minimum: {additional_data['unitCount']}")
        
        # Check bay access for industrial
        if property_type == 'Industrial' and not metrics.get('fullBayAccess', True):
            red_flags.append("No full-bay truck access")
    
    # Determine overall score
    if red_flags:
        score_result = "Red"
        reason = "Deal does not meet baseline investment criteria."
        details = f"Critical issues: {', '.join(red_flags[:3])}"
    elif len(yellow_flags) > 3 or (yellow_flags and not green_metrics):
        score_result = "Yellow"
        reason = "Deal meets minimum requirements with moderate risk."
        details = f"Concerns: {', '.join(yellow_flags[:3])}"
    else:
        score_result = "Green"
        reason = "High-performing property in target zone."
        details = f"Strong metrics: {', '.join(green_metrics[:3])}"
    
    # Add market status consideration
    if additional_data.get('marketStatus') == 'off-market':
        if score_result == "Yellow":
            # Upgrade yellow to green for off-market deals
            score_result = "Green"
            reason = "Off-market opportunity with strong potential."
            details += " (Upgraded due to off-market status)"
    
    return {
        "score": score_result,
        "reason": reason,
        "details": details,
        "metrics": metrics,
        "additional_data": additional_data
    }


# --- HTML LETTER TEMPLATES ---

LOGO_URL = "https://i.imgur.com/3ifP7i0.png" # Using a hosted version of the logo for now

BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Georgia", serif; margin: 40px; color: #1C2660; line-height: 1.55; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { max-height: 90px; }
    .content { max-width: 700px; margin: 0 auto; }
    .header, .footer { font-size: 14px; color: #6B6E8B; }
    .highlight { font-weight: bold; color: #B1894B; }
    ul { margin-top: 0; }
    .metrics-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .metrics-table th, .metrics-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .metrics-table th { background-color: #f4f4f5; font-weight: bold; }
  </style>
</head>
<body>
  <div class="logo">
    <img src="{{ LOGO_URL }}" alt="Alliance Logo">
  </div>
  <div class="content">
    <p class="header">Date: {{ CURRENT_DATE }}</p>
    <p>To: {{ contact_name }}</p>
    <p>{{ property_address }}</p>
    <p>Property Type: <strong>{{ property_type }}</strong></p>
    <p>Dear {{ contact_name }},</p>
    {% block body %}{% endblock %}
    <p>Sincerely,</p>
    <p><strong>Acquisitions Team</strong><br>
       Alliance Commercial Real Estate<br>
       <a href="mailto:acquisitions@alliancerei.com">acquisitions@alliancerei.com</a><br>
    </p>
    <p class="footer">
      This correspondence is for informational purposes only and does not constitute a binding agreement.
      Alliance reserves the right to modify its acquisition criteria at any time.
    </p>
  </div>
</body>
</html>
"""

# Email templates
RED_TEMPLATE_SOURCE = """
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #d32f2f;">Thank You for Your Submission</h2>
    
    <p>Dear {{ contact_name }},</p>
    
    <p>Thank you for submitting your property at <strong>{{ property_address }}</strong> for our consideration.</p>
    
    <p>After careful evaluation against our current investment criteria, we regret to inform you that this property does not meet our requirements at this time. Specifically:</p>
    
    <ul>
        <li>{{ REJECTION_REASON_1 }}</li>
        {% if REJECTION_REASON_2 %}<li>{{ REJECTION_REASON_2 }}</li>{% endif %}
    </ul>
    
    <p>We appreciate your interest in working with Alliance and encourage you to submit other properties that may better align with our investment parameters.</p>
    
    <p>If you have any questions or would like to discuss our criteria in more detail, please don't hesitate to reach out.</p>
    
    <p>Best regards,<br>
    The Alliance Team</p>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Property Details:</strong><br>
            Address: {{ property_address }}<br>
            Type: {{ property_type }}<br>
            Submitted: {{ submission_date }}
        </p>
    </div>
</body>
</html>
"""

YELLOW_TEMPLATE_SOURCE = """
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #f57c00;">Conditional Interest in Your Property</h2>
    
    <p>Dear {{ contact_name }},</p>
    
    <p>Thank you for submitting your property at <strong>{{ property_address }}</strong> for our consideration.</p>
    
    <p>After reviewing the information provided, we have <strong>conditional interest</strong> in this property. While it shows potential, there are some aspects that require further clarification or improvement:</p>
    
    <ul>
        {% if CONTINGENCY_1 %}<li>{{ CONTINGENCY_1 }}</li>{% endif %}
        {% if CONTINGENCY_2 %}<li>{{ CONTINGENCY_2 }}</li>{% endif %}
        {% if CONTINGENCY_3 %}<li>{{ CONTINGENCY_3 }}</li>{% endif %}
    </ul>
    
    <p>We would like to schedule a call to discuss these items in more detail and explore potential solutions. Our team will reach out within the next 48 hours to arrange a convenient time.</p>
    
    <p>We look forward to working with you to potentially move this opportunity forward.</p>
    
    <p>Best regards,<br>
    The Alliance Team</p>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 5px;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>Next Steps:</strong><br>
            1. Our team will contact you within 48 hours<br>
            2. We'll discuss the contingencies and potential solutions<br>
            3. If resolved, we'll proceed with a formal offer
        </p>
    </div>
</body>
</html>
"""

GREEN_TEMPLATE_SOURCE = """
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #388e3c;">Strong Interest in Your Property!</h2>
    
    <p>Dear {{ contact_name }},</p>
    
    <p>Great news! After reviewing your submission for <strong>{{ property_address }}</strong>, we are very interested in moving forward with this opportunity.</p>
    
    <p>Your property aligns well with our investment criteria, particularly:</p>
    <ul>
        <li>{{ STRENGTH_1 }}</li>
        {% if STRENGTH_2 %}<li>{{ STRENGTH_2 }}</li>{% endif %}
        {% if STRENGTH_3 %}<li>{{ STRENGTH_3 }}</li>{% endif %}
    </ul>
    
    <p><strong>Next Steps:</strong></p>
    <ol>
        <li>Our acquisitions team will contact you within 24 hours</li>
        <li>We'll schedule a property tour and detailed discussion</li>
        <li>Upon satisfactory due diligence, we'll present a formal offer</li>
    </ol>
    
    <p>We're excited about the potential of working together on this transaction and look forward to speaking with you soon.</p>
    
    <p>Best regards,<br>
    The Alliance Team</p>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #c8e6c9; border-radius: 5px;">
        <p style="margin: 0; font-size: 14px; color: #1b5e20;">
            <strong>Timeline:</strong><br>
            • Initial contact: Within 24 hours<br>
            • Property tour: Within 5-7 days<br>
            • Offer presentation: Within 10-14 days
        </p>
    </div>
</body>
</html>
"""

# Create Template objects
RED_TEMPLATE = Template(RED_TEMPLATE_SOURCE)
YELLOW_TEMPLATE = Template(YELLOW_TEMPLATE_SOURCE)
GREEN_TEMPLATE = Template(GREEN_TEMPLATE_SOURCE)


def generate_response_letter(score_result: dict, deal_data: dict) -> str:
    """Generate the HTML response letter based on the score."""
    score = score_result.get("score", "Red")
    metrics = score_result.get("metrics", {})
    
    # Common context
    context = {
        "contact_name": deal_data.get("contact_name", "Valued Client"),
        "property_address": deal_data.get("property_address", "Your Property"),
        "property_type": deal_data.get("property_type", "Property"),
        "submission_date": datetime.now().strftime("%B %d, %Y")
    }
    
    if score == 'Red':
        # Parse rejection reasons from details
        reasons = score_result.get("details", "").split(", ")
        context["REJECTION_REASON_1"] = reasons[0] if reasons else "Property metrics below investment threshold"
        context["REJECTION_REASON_2"] = reasons[1] if len(reasons) > 1 else ""
        block_content_source = get_block_content(RED_TEMPLATE_SOURCE)
        
    elif score == 'Yellow':
        # Add specific contingencies based on yellow flags
        context["CONTINGENCY_1"] = ""
        if metrics.get('vacancyRate', 0) > 15:
            context["CONTINGENCY_1"] = "High vacancy rate requires stabilization plan"
        elif metrics.get('rentToMarketRatio', 100) < 90:
            context["CONTINGENCY_1"] = "Below-market rents need adjustment strategy"
        
        context["CONTINGENCY_2"] = ""
        if metrics.get('expenseRatio', 0) > 45:
            context["CONTINGENCY_2"] = "Operating expenses appear high and need review"
        
        context["CONTINGENCY_3"] = ""
        if 'pricePerUnit' in metrics and metrics['pricePerUnit'] > 200000:
            context["CONTINGENCY_3"] = "Price per unit requires further market justification"
            
        block_content_source = get_block_content(YELLOW_TEMPLATE_SOURCE)
        
    else:  # Green
        # Add strengths
        context["STRENGTH_1"] = "Strong cash flow and attractive cap rate"
        context["STRENGTH_2"] = ""
        context["STRENGTH_3"] = ""
        
        if metrics.get('capRate', 0) >= 7:
            context["STRENGTH_1"] = f"Excellent cap rate of {metrics['capRate']:.1f}%"
        if metrics.get('rentToMarketRatio', 0) >= 95:
            context["STRENGTH_2"] = "Rents are at or near market rates"
        if metrics.get('vacancyRate', 0) <= 5:
            context["STRENGTH_3"] = "Low vacancy indicates stable tenant base"
            
        block_content_source = get_block_content(GREEN_TEMPLATE_SOURCE)
    
    # Render the template with context
    rendered_block = Template(block_content_source).render(context)
    
    # Return just the rendered block content
    return rendered_block 