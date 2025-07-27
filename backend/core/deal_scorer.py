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

RED_TEMPLATE = Template("""
{% extends "BASE_TEMPLATE" %}
{% block body %}
<p>
  Thank you for giving Alliance the opportunity to review your property through our Offer Engine.
  After a careful assessment of the information provided, this opportunity received a
  <span class="highlight">Red classification</span> under our current acquisition criteria.
</p>
<p>
  We make every effort to provide transparent feedback. In this case, the primary factor(s)
  influencing the decision were:
</p>
<ul>
  <li>{{ REJECTION_REASON_1 }}</li>
  {% if REJECTION_REASON_2 %}<li>{{ REJECTION_REASON_2 }}</li>{% endif %}
</ul>
<p>
  While we are not in a position to extend an offer at this time, we value your interest
  in partnering with Alliance. Market dynamics evolve quickly, and we routinely update our
  criteria. We therefore <strong>encourage you to submit future opportunities</strong>—especially
  those that meet the guidelines outlined on our website.
</p>
<p>
  If you would like a more detailed discussion about what we're targeting, please feel free
  to schedule a brief call with our acquisitions team.
</p>
<p>
  Again, thank you for thinking of Alliance. We appreciate the chance to review your property
  and look forward to collaborating on other deals.
</p>
{% endblock %}
""")

YELLOW_TEMPLATE = Template("""
{% extends "BASE_TEMPLATE" %}
{% block body %}
<p>
  Thank you for submitting your property for evaluation through the Alliance Offer Engine.
  Based on our automated review and proprietary scoring methodology, we are pleased to
  present you with a <span class="highlight">Yellow classification</span>.
</p>
<p>
  We are interested in this opportunity and are prepared to move forward contingent upon
  the following:
</p>
<ul>
  <li>Updated rent roll and trailing 12-month financials</li>
  <li>Verification of traffic and zoning alignment with use</li>
  <li>Interior and exterior inspection within 14 business days</li>
  {% if CONTINGENCY_1 %}<li>{{ CONTINGENCY_1 }}</li>{% endif %}
</ul>
{% if METRICS_TABLE %}
<p>Key metrics evaluated:</p>
<table class="metrics-table">
  <tr><th>Metric</th><th>Value</th><th>Target</th></tr>
  {{ METRICS_TABLE }}
</table>
{% endif %}
<p>
  Please find a preliminary Letter of Intent (LOI) to follow separately for your consideration.
  We welcome the opportunity to move forward pending the above conditions.
</p>
{% endblock %}
""")

GREEN_TEMPLATE = Template("""
{% extends "BASE_TEMPLATE" %}
{% block body %}
<p>
  Congratulations! Your property has received a <span class="highlight">Green classification</span>
  through our proprietary scoring system. This indicates strong alignment with Alliance's
  acquisition criteria.
</p>
<p>
  Based on the information provided, we are prepared to submit an official offer
  {% if OFFER_AMOUNT %}of <strong>{{ OFFER_AMOUNT }}</strong>{% endif %}.
  {% if OFF_MARKET_BONUS %}As this is an off-market opportunity, we've included a premium
  in our offer to reflect the exclusive nature of this deal.{% endif %}
</p>
{% if METRICS_TABLE %}
<p>Your property excelled in the following areas:</p>
<table class="metrics-table">
  <tr><th>Metric</th><th>Your Property</th><th>Our Target</th></tr>
  {{ METRICS_TABLE }}
</table>
{% endif %}
<p>
  Please expect to receive our formal Letter of Intent (LOI) within 24 hours. We look
  forward to entering the due diligence phase upon your acceptance.
</p>
<p>
  Thank you for choosing Alliance as your partner in this transaction.
</p>
{% endblock %}
""")


def generate_response_letter(score_result: dict, deal_data: dict) -> str:
    """
    Enhanced letter generation with dynamic content based on collected data
    """
    score = score_result["score"]
    additional_data = score_result.get("additional_data", {})
    metrics = score_result.get("metrics", {})
    
    # Build context
    context = {
        **deal_data,
        "LOGO_URL": LOGO_URL,
        "CURRENT_DATE": datetime.now().strftime("%B %d, %Y"),
        "property_type": additional_data.get("propertyType", deal_data.get("property_type", "Commercial"))
    }
    
    # Extract block content helper
    def get_block_content(template_source):
        start_tag = '{% block body %}'
        end_tag = '{% endblock %}'
        start_idx = template_source.find(start_tag)
        if start_idx == -1: return template_source
        start_idx += len(start_tag)
        end_idx = template_source.find(end_tag, start_idx)
        if end_idx == -1: return template_source
        return template_source[start_idx:end_idx].strip()
    
    # Select template and add specific context
    if score == 'Red':
        # Parse rejection reasons from details
        reasons = score_result.get("details", "").split(", ")
        context["REJECTION_REASON_1"] = reasons[0] if reasons else "Property metrics below investment threshold"
        context["REJECTION_REASON_2"] = reasons[1] if len(reasons) > 1 else ""
        block_content_source = get_block_content(RED_TEMPLATE.source)
        
    elif score == 'Yellow':
        # Add specific contingencies based on yellow flags
        context["CONTINGENCY_1"] = ""
        if metrics.get('vacancyRate', 0) > 15:
            context["CONTINGENCY_1"] = "Vacancy reduction plan to achieve 90%+ occupancy"
        
        # Create metrics table for transparency
        metrics_rows = []
        if 'capRate' in metrics:
            metrics_rows.append(f"<tr><td>Cap Rate</td><td>{metrics['capRate']}%</td><td>≥6.0%</td></tr>")
        if 'occupancyRate' in metrics:
            metrics_rows.append(f"<tr><td>Occupancy</td><td>{metrics['occupancyRate']}%</td><td>≥90%</td></tr>")
        context["METRICS_TABLE"] = "\n".join(metrics_rows)
        
        block_content_source = get_block_content(YELLOW_TEMPLATE.source)
        
    else:  # Green
        # Calculate offer amount (placeholder logic)
        if additional_data.get('rentRoll'):
            annual_rent = additional_data['rentRoll'] * 12
            offer_amount = annual_rent * 10  # Simple 10x multiplier
            context["OFFER_AMOUNT"] = f"${offer_amount:,.0f}"
        
        context["OFF_MARKET_BONUS"] = additional_data.get('marketStatus') == 'off-market'
        
        # Create success metrics table
        metrics_rows = []
        if 'capRate' in metrics and metrics['capRate'] >= 6:
            metrics_rows.append(f"<tr><td>Cap Rate</td><td>{metrics['capRate']}%</td><td>≥6.0%</td></tr>")
        if 'yearBuilt' in metrics and metrics['yearBuilt'] >= 2000:
            metrics_rows.append(f"<tr><td>Year Built</td><td>{metrics['yearBuilt']}</td><td>≥2000</td></tr>")
        context["METRICS_TABLE"] = "\n".join(metrics_rows)
        
        block_content_source = get_block_content(GREEN_TEMPLATE.source)
    
    # Render the block content
    rendered_block = Template(block_content_source).render(context)
    
    # Insert into base template
    final_html = BASE_TEMPLATE.replace('{% block body %}{% endblock %}', rendered_block)
    
    # Final render with all context
    final_html_rendered = Template(final_html).render(context)
    
    return final_html_rendered 
    return final_html_rendered 