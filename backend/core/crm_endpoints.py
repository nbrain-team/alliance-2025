from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
import uuid

from .database import get_db, Opportunity, Contact, Activity, User
from .auth import get_current_active_user

router = APIRouter()

# Pydantic models
class ContactBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    office_address: Optional[str] = None

class ContactResponse(ContactBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime]

class ActivityCreate(BaseModel):
    activity_type: str  # email, call, meeting, note
    description: str

class ActivityResponse(ActivityCreate):
    id: str
    created_at: datetime
    created_by: Optional[str]

class OpportunityCreate(BaseModel):
    deal_status: str
    company: str
    contact_id: str
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    lead_source: str
    notes: Optional[str] = None
    deal_value: Optional[int] = None
    assigned_to: Optional[str] = None

class OpportunityUpdate(BaseModel):
    deal_status: Optional[str] = None
    company: Optional[str] = None
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    lead_source: Optional[str] = None
    notes: Optional[str] = None
    deal_value: Optional[int] = None
    assigned_to: Optional[str] = None

class OpportunityResponse(BaseModel):
    id: str
    deal_status: str
    company: str
    property_address: Optional[str]
    property_type: Optional[str]
    lead_source: str
    lead_date: datetime
    last_activity: datetime
    notes: Optional[str]
    deal_value: Optional[int]
    contact: ContactResponse
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    activities: List[ActivityResponse] = []

# Endpoints
@router.get("/opportunities", response_model=List[OpportunityResponse])
async def get_opportunities(
    deal_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all opportunities with optional filtering."""
    query = db.query(Opportunity).options(
        joinedload(Opportunity.contact),
        joinedload(Opportunity.activities)
    )
    
    if deal_status:
        query = query.filter(Opportunity.deal_status == deal_status)
    
    if search:
        search_term = f"%{search}%"
        query = query.join(Contact).filter(
            or_(
                Opportunity.company.ilike(search_term),
                Opportunity.property_address.ilike(search_term),
                Contact.name.ilike(search_term),
                Contact.email.ilike(search_term)
            )
        )
    
    opportunities = query.order_by(Opportunity.created_at.desc()).offset(offset).limit(limit).all()
    
    return opportunities

@router.get("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific opportunity by ID."""
    opportunity = db.query(Opportunity).options(
        joinedload(Opportunity.contact),
        joinedload(Opportunity.activities)
    ).filter(Opportunity.id == opportunity_id).first()
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    return opportunity

@router.post("/opportunities", response_model=OpportunityResponse)
async def create_opportunity(
    opportunity: OpportunityCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new opportunity."""
    # Verify contact exists
    contact = db.query(Contact).filter(Contact.id == opportunity.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    new_opportunity = Opportunity(**opportunity.dict())
    db.add(new_opportunity)
    db.commit()
    db.refresh(new_opportunity)
    
    # Create initial activity
    initial_activity = Activity(
        opportunity_id=new_opportunity.id,
        activity_type="note",
        description="Opportunity created",
        created_by=current_user.id
    )
    db.add(initial_activity)
    db.commit()
    
    # Load relationships
    db.refresh(new_opportunity)
    return new_opportunity

@router.put("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    opportunity_update: OpportunityUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an opportunity."""
    db_opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not db_opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    update_data = opportunity_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_opportunity, key, value)
    
    db_opportunity.last_activity = datetime.utcnow()
    
    db.commit()
    db.refresh(db_opportunity)
    return db_opportunity

@router.delete("/opportunities/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an opportunity."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    db.delete(opportunity)
    db.commit()
    
    return {"message": "Opportunity deleted successfully"}

@router.post("/opportunities/{opportunity_id}/activities", response_model=ActivityResponse)
async def create_activity(
    opportunity_id: str,
    activity: ActivityCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add an activity to an opportunity."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    new_activity = Activity(
        opportunity_id=opportunity_id,
        activity_type=activity.activity_type,
        description=activity.description,
        created_by=current_user.id
    )
    db.add(new_activity)
    
    # Update last activity timestamp
    opportunity.last_activity = datetime.utcnow()
    
    db.commit()
    db.refresh(new_activity)
    
    return new_activity

@router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all contacts with optional search."""
    query = db.query(Contact)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.name.ilike(search_term),
                Contact.email.ilike(search_term),
                Contact.phone.ilike(search_term)
            )
        )
    
    contacts = query.order_by(Contact.created_at.desc()).offset(offset).limit(limit).all()
    return contacts

@router.post("/contacts", response_model=ContactResponse)
async def create_contact(
    contact: ContactBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new contact."""
    # Check if contact already exists
    existing = db.query(Contact).filter(Contact.email == contact.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    new_contact = Contact(**contact.dict())
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    return new_contact

@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact: ContactBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a contact."""
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact.dict().items():
        setattr(db_contact, key, value)
    
    db.commit()
    db.refresh(db_contact)
    return db_contact

# Deal status options
@router.get("/deal-statuses")
async def get_deal_statuses():
    """Get available deal status options."""
    return [
        "Research",
        "Gather",
        "Underwriting PRE",
        "Underwriting EAP",
        "LOI Sent",
        "Negotiation",
        "Signed LOI",
        "PSA-Purchase Sale Agmt",
        "PSA Signed/Diligence",
        "Remove Contingencies",
        "Close Lost",
        "Closed Won"
    ]

# Lead source options
@router.get("/lead-sources")
async def get_lead_sources():
    """Get available lead source options."""
    return [
        "Score My Deal",
        "Email Mkt",
        "LinkedIn",
        "Network",
        "LoopNet",
        "Referral",
        "Cold Call",
        "Website",
        "Other"
    ] 