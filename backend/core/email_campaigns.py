from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from .database import get_db, User, Contact
from .auth import get_current_active_user
from .llm_handler import LLMHandler

router = APIRouter()

# Database models (add these to database.py later)
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from .database import Base

# Many-to-many relationship table
campaign_recipients = Table(
    'campaign_recipients',
    Base.metadata,
    Column('campaign_id', String, ForeignKey('email_campaigns.id')),
    Column('contact_id', String, ForeignKey('contacts.id'))
)

class EmailCampaign(Base):
    __tablename__ = 'email_campaigns'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default='draft')  # draft, scheduled, sent
    created_by = Column(String, ForeignKey('users.id'))
    sent_at = Column(DateTime, nullable=True)
    scheduled_for = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    recipients = relationship("Contact", secondary=campaign_recipients, backref="campaigns")
    creator = relationship("User")

class EmailTemplate(Base):
    __tablename__ = 'email_templates'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(String, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User")

# Pydantic models
class EmailGenerateRequest(BaseModel):
    prompt: str

class EmailGenerateResponse(BaseModel):
    subject: str
    content: str

class CampaignCreate(BaseModel):
    name: str
    subject: str
    content: str
    recipient_ids: List[str]
    status: str = 'draft'
    scheduled_for: Optional[datetime] = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    subject: str
    content: str
    status: str
    recipients_count: int
    sent_at: Optional[datetime]
    scheduled_for: Optional[datetime]
    created_at: datetime

class TemplateCreate(BaseModel):
    name: str
    subject: str
    content: str

class TemplateResponse(BaseModel):
    id: str
    name: str
    subject: str
    content: str
    created_at: datetime

# Initialize LLM handler
llm_handler = LLMHandler()

@router.post("/generate-email", response_model=EmailGenerateResponse)
async def generate_email(
    request: EmailGenerateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Generate email content using AI."""
    try:
        # Create a more detailed prompt for the LLM
        full_prompt = f"""
        You are a professional real estate marketing expert. Create an engaging email for real estate investors.
        
        User request: {request.prompt}
        
        Please provide:
        1. A compelling subject line (max 100 characters)
        2. Professional email content that is:
           - Engaging and personalized
           - Focused on value for real estate investors
           - Includes a clear call-to-action
           - Professional but conversational tone
           
        Format your response as:
        SUBJECT: [subject line here]
        
        CONTENT:
        [email content here]
        """
        
        response = llm_handler.generate_response(full_prompt)
        
        # Parse the response
        lines = response.strip().split('\n')
        subject = ""
        content_lines = []
        in_content = False
        
        for line in lines:
            if line.startswith("SUBJECT:"):
                subject = line.replace("SUBJECT:", "").strip()
            elif line.startswith("CONTENT:"):
                in_content = True
            elif in_content and line.strip():
                content_lines.append(line)
        
        content = '\n'.join(content_lines).strip()
        
        # Fallback if parsing fails
        if not subject or not content:
            subject = "Important Real Estate Investment Opportunity"
            content = response
        
        return EmailGenerateResponse(subject=subject, content=content)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating email: {str(e)}")

@router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all email campaigns."""
    campaigns = db.query(EmailCampaign).filter(
        EmailCampaign.created_by == current_user.id
    ).order_by(EmailCampaign.created_at.desc()).all()
    
    return [
        CampaignResponse(
            id=c.id,
            name=c.name,
            subject=c.subject,
            content=c.content,
            status=c.status,
            recipients_count=len(c.recipients),
            sent_at=c.sent_at,
            scheduled_for=c.scheduled_for,
            created_at=c.created_at
        )
        for c in campaigns
    ]

@router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new email campaign."""
    # Create campaign
    new_campaign = EmailCampaign(
        name=campaign.name,
        subject=campaign.subject,
        content=campaign.content,
        status=campaign.status,
        created_by=current_user.id,
        scheduled_for=campaign.scheduled_for
    )
    
    # Add recipients
    recipients = db.query(Contact).filter(Contact.id.in_(campaign.recipient_ids)).all()
    new_campaign.recipients = recipients
    
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    
    # If status is 'sent', send emails in background
    if campaign.status == 'sent':
        background_tasks.add_task(send_campaign_emails, new_campaign.id, db)
        new_campaign.sent_at = datetime.utcnow()
        db.commit()
    
    return CampaignResponse(
        id=new_campaign.id,
        name=new_campaign.name,
        subject=new_campaign.subject,
        content=new_campaign.content,
        status=new_campaign.status,
        recipients_count=len(new_campaign.recipients),
        sent_at=new_campaign.sent_at,
        scheduled_for=new_campaign.scheduled_for,
        created_at=new_campaign.created_at
    )

@router.get("/email-templates", response_model=List[TemplateResponse])
async def get_templates(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all email templates."""
    templates = db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()
    
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            subject=t.subject,
            content=t.content,
            created_at=t.created_at
        )
        for t in templates
    ]

@router.post("/email-templates", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new email template."""
    new_template = EmailTemplate(
        name=template.name,
        subject=template.subject,
        content=template.content,
        created_by=current_user.id
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    return TemplateResponse(
        id=new_template.id,
        name=new_template.name,
        subject=new_template.subject,
        content=new_template.content,
        created_at=new_template.created_at
    )

def send_campaign_emails(campaign_id: str, db: Session):
    """Background task to send campaign emails."""
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        return
    
    # Email configuration (you'll need to set these environment variables)
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    
    if not smtp_user or not smtp_pass:
        print("Email configuration not set. Skipping email send.")
        return
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        
        # Send to each recipient
        for recipient in campaign.recipients:
            try:
                # Create message
                msg = MIMEMultipart()
                msg['From'] = from_email
                msg['To'] = recipient.email
                msg['Subject'] = campaign.subject
                
                # Personalize content
                personalized_content = campaign.content.replace("{name}", recipient.name)
                msg.attach(MIMEText(personalized_content, 'plain'))
                
                # Send email
                server.send_message(msg)
                print(f"Email sent to {recipient.email}")
                
            except Exception as e:
                print(f"Error sending to {recipient.email}: {str(e)}")
        
        server.quit()
        
    except Exception as e:
        print(f"Error with email server: {str(e)}") 