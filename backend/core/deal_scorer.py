import random
from jinja2 import Template

# --- SCORING LOGIC ---

def score_deal_logic(deal_data: dict) -> dict:
    """
    Evaluates a deal based on a set of rules and returns a score and reason.
    This uses placeholder data for external APIs. In a real scenario, you'd
    call APIs for trafficVolume, capRate, etc.
    """
    # Placeholder data - in a real implementation, this would come from API calls
    traffic_volume = random.randint(1000, 20000)
    cap_rate = round(random.uniform(4.0, 7.5), 2)
    price_per_sq_ft = random.randint(200, 500)
    zoning_match = random.choice([True, False])
    deferred_maintenance_flag = random.choice([True, False])
    occupancy_rate = round(random.uniform(70.0, 98.0), 2)

    # Simple rule-based scoring
    if (
        traffic_volume < 2500
        or cap_rate < 4.5
        or price_per_sq_ft > 400
        or not zoning_match
        or deferred_maintenance_flag
    ):
        return {
            "score": "Red",
            "reason": "Deal does not meet baseline investment criteria.",
            "details": f"Key factors: Traffic Volume ({traffic_volume}), Cap Rate ({cap_rate}%), Price/SqFt (${price_per_sq_ft})."
        }

    if (
        2500 <= traffic_volume < 8000
        or 4.5 <= cap_rate < 6.0
        or occupancy_rate <= 90
    ):
        return {
            "score": "Yellow",
            "reason": "Deal meets minimum investment requirements with moderate risk.",
            "details": f"Contingencies required based on: Traffic Volume ({traffic_volume}), Cap Rate ({cap_rate}%), Occupancy ({occupancy_rate}%)."
        }
    
    # If it passes red and yellow, it's green
    return {
        "score": "Green",
        "reason": "High-performing property in a target zone. Auto-offer recommended.",
        "details": f"Strong fundamentals: Traffic Volume ({traffic_volume}), Cap Rate ({cap_rate}%), Price/SqFt (${price_per_sq_ft})."
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
  While we are not in a position to extend an offer at this time, we value your interest in partnering
  with Alliance. Market dynamics evolve quickly, and we routinely update our criteria.
  We therefore <strong>encourage you to submit future opportunities</strong>.
</p>
<p>
  Again, thank you for thinking of Alliance. We appreciate the chance to review your property and
  look forward to collaborating on other deals.
</p>
{% endblock %}
""")

YELLOW_TEMPLATE = Template("""
{% extends "BASE_TEMPLATE" %}
{% block body %}
<p>
  Thank you for submitting your property for evaluation through the Alliance Offer Engine. Based on our automated review, we are pleased to present you with a <span class="highlight">Yellow</span> classification.
</p>
<p>
  We are interested in this opportunity and are prepared to offer a preliminary non-binding indication of interest, contingent upon the following:
</p>
<ul>
  <li>Review of updated rent roll and trailing 12-month financials.</li>
  <li>Verification of traffic, zoning, and use alignment.</li>
  <li>A standard interior and exterior inspection.</li>
</ul>
<p>
  We welcome the opportunity to move forward pending the above conditions.
</p>
{% endblock %}
""")

GREEN_TEMPLATE = Template("""
{% extends "BASE_TEMPLATE" %}
{% block body %}
<p>
  Thank you for submitting your property for evaluation through the Alliance Offer Engine. Based on our automated review, we are pleased to present you with a <span class="highlight">Green</span> classification.
</p>
<p>
  As your property meets our immediate acquisition criteria, we are prepared to submit an official Letter of Intent (LOI) upon a brief confirmation call.
</p>
<p>
  Our team will be reaching out to you shortly to discuss the next steps. We look forward to the possibility of entering the due diligence phase.
</p>
{% endblock %}
""")

def get_letter_template(score: str) -> Template:
    """Returns the appropriate Jinja2 template based on the score."""
    if score == "Red":
        return RED_TEMPLATE
    elif score == "Yellow":
        return YELLOW_TEMPLATE
    elif score == "Green":
        return GREEN_TEMPLATE
    raise ValueError("Invalid score provided")

def render_letter(template_str: str, context: dict) -> str:
    """Renders the final HTML letter from the base and content templates."""
    # This is a bit of a workaround for Jinja2's extends not working on strings directly
    # in the same way as file-based templates. We substitute the block content manually.
    base_template = Template(BASE_TEMPLATE)
    content_template = Template(template_str)
    
    # First, render the specific content (red, yellow, green)
    content_html = content_template.render(context)

    # Now, inject this rendered content into the base template's body block
    # This is a simple string replacement since we know where the block is.
    final_html = base_template.render(context).replace("{% block body %}{% endblock %}", content_html)
    return final_html

def generate_response_letter(score_result: dict, deal_data: dict) -> str:
    """
    Generates the full HTML response letter based on the score.
    """
    from datetime import datetime

    score = score_result["score"]
    
    context = {
        **deal_data,
        "LOGO_URL": LOGO_URL,
        "CURRENT_DATE": datetime.now().strftime("%B %d, %Y"),
        "REJECTION_REASON_1": score_result.get("details", "")
    }

    # Get the raw block content from each template source based on the score
    def get_block_content(template_source):
        start_tag = '{% block body %}'
        end_tag = '{% endblock %}'
        start_idx = template_source.find(start_tag)
        if start_idx == -1:
            return template_source # Return the whole thing if block not found
        
        start_idx += len(start_tag)
        end_idx = template_source.find(end_tag, start_idx)
        if end_idx == -1:
            return template_source # Or if end tag is missing
            
        return template_source[start_idx:end_idx].strip()

    block_content_source = ""
    if score == 'Red':
        block_content_source = get_block_content(RED_TEMPLATE.source)
    elif score == 'Yellow':
        block_content_source = get_block_content(YELLOW_TEMPLATE.source)
    elif score == 'Green':
        block_content_source = get_block_content(GREEN_TEMPLATE.source)
    
    # Render the specific block content
    rendered_block = Template(block_content_source).render(context)
    
    # Manually inject the rendered block into the base template string
    # This is more reliable than trying to render a template that uses "extends"
    final_html = BASE_TEMPLATE.replace('{% block body %}{% endblock %}', rendered_block)
    
    # Render the final combined template to process any remaining Jinja variables in the base
    final_html_rendered = Template(final_html).render(context)

    return final_html_rendered 