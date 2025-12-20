from sqlalchemy import Column, String, DateTime, Enum
import uuid
from datetime import datetime
import enum
from database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, index=True)
    status = Column(String, default=JobStatus.PENDING) # stored as string to avoid sqlite enum issues usually
    result_path = Column(String, nullable=True) # path to JSON result
    created_at = Column(DateTime, default=datetime.utcnow)
