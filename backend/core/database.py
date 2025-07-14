import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Boolean, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import uuid

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No DATABASE_URL found in environment. Please set it.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Database Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    conversations = relationship("ChatSession", back_populates="user")
    agent_ideas = relationship("AgentIdea", back_populates="user")


class ChatSession(Base):
    __tablename__ = 'chat_sessions'

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    messages = Column(JSON, nullable=False)
    
    user_id = Column(String, ForeignKey('users.id'))
    user = relationship("User", back_populates="conversations")


class Feedback(Base):
    __tablename__ = 'feedback'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, nullable=True, index=True)
    message_id = Column(String, nullable=False, unique=True, index=True)
    rating = Column(String, nullable=False) # "good" or "bad"
    notes = Column(String, nullable=True)
    message_text = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(String, ForeignKey('users.id'))
    user = relationship("User")


class AgentIdea(Base):
    __tablename__ = 'agent_ideas'
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    steps = Column(JSON, nullable=False)  # List of step descriptions
    agent_stack = Column(JSON, nullable=False)  # Technical stack details
    client_requirements = Column(JSON, nullable=False)  # List of requirements
    conversation_history = Column(JSON, nullable=True)  # Store the ideation conversation
    status = Column(String, default="draft")  # draft, completed, in_development
    agent_type = Column(String, nullable=True)  # customer_service, data_analysis, etc.
    implementation_estimate = Column(JSON, nullable=True)  # Cost and time estimates
    security_considerations = Column(JSON, nullable=True)  # Security details
    future_enhancements = Column(JSON, nullable=True)  # List of future enhancement ideas
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Foreign key to users table
    user_id = Column(String, ForeignKey('users.id'))
    user = relationship("User", back_populates="agent_ideas")


def get_db():
    """Dependency to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create database tables if they don't exist."""
    Base.metadata.create_all(bind=engine) 