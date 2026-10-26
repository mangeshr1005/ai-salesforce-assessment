
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(
        String(36),
        unique=True,
        index=True,
        nullable=False
    )
    title = Column(String(200), nullable=False)
    job_description = Column(Text, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    status = Column(String(30), default="draft", nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    questions = relationship(
        "Question",
        back_populates="assessment",
        cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)

    assessment_id = Column(
        Integer,
        ForeignKey("assessments.id"),
        nullable=False
    )

    question_number = Column(Integer, nullable=False)
    topic = Column(String(150), nullable=False)
    question_type = Column(String(50), default="technical")
    difficulty = Column(String(30), default="medium")
    question_text = Column(Text, nullable=False)

    # Keep expected answers on the backend.
    # Never expose them to candidates.
    correct_answer = Column(Text, nullable=False)
    marks = Column(Integer, default=5, nullable=False)

    assessment = relationship(
        "Assessment",
        back_populates="questions"
    )


class CandidateSubmission(Base):
    __tablename__ = "candidate_submissions"

    id = Column(Integer, primary_key=True, index=True)

    public_id = Column(
        String(36),
        unique=True,
        index=True,
        nullable=False
    )

    assessment_id = Column(
        Integer,
        ForeignKey("assessments.id"),
        nullable=False
    )

    candidate_name = Column(String(200), nullable=False)
    candidate_email = Column(String(255), nullable=False)

    # Stores candidate answers as JSON text.
    answers = Column(Text, nullable=False)

    status = Column(String(30), default="submitted", nullable=False)

    # Server-side assessment timer fields.
    started_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    submitted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
