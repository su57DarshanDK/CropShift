"""certificates.py — Quality Certificate upload and verification API."""
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.models.certificate import Certificate
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../../../uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CertificateResponse(BaseModel):
    id: int
    farmer_id: int
    farm_id: Optional[int] = None
    crop: str
    grade: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[str] = None
    certificate_number: Optional[str] = None
    file_path: Optional[str] = None
    verification_status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("", response_model=CertificateResponse)
async def upload_certificate(
    crop: str = Form(...),
    grade: Optional[str] = Form(None),
    farm_id: Optional[int] = Form(None),
    issuing_organization: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    certificate_number: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a quality certificate. File is optional for MVP (can be metadata-only)."""
    file_path = None
    if file and file.filename:
        # Validate extension
        allowed = {".jpg", ".jpeg", ".png", ".pdf"}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed:
            raise HTTPException(status_code=422, detail="Only JPG, PNG, PDF files are allowed.")
        fname = f"cert_{current_user.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{ext}"
        fpath = os.path.join(UPLOAD_DIR, fname)
        with open(fpath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file_path = f"/uploads/{fname}"

    cert = Certificate(
        farmer_id=current_user.id,
        farm_id=farm_id,
        crop=crop,
        grade=grade,
        issuing_organization=issuing_organization,
        issue_date=issue_date,
        certificate_number=certificate_number,
        file_path=file_path,
        verification_status="PENDING",
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.get("/mine", response_model=List[CertificateResponse])
def list_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List certificates owned by the authenticated farmer."""
    return (
        db.query(Certificate)
        .filter(Certificate.farmer_id == current_user.id)
        .order_by(Certificate.created_at.desc())
        .all()
    )


@router.get("/{cert_id}", response_model=CertificateResponse)
def get_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View a certificate. Owner or any authenticated user (to support buyer viewing)."""
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    return cert


@router.post("/{cert_id}/verify")
def verify_certificate(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Demo verification endpoint.
    NOTE: In production, this would require admin authorization.
    For MVP demo purposes, any authenticated user can trigger verification.
    """
    cert = db.get(Certificate, cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found.")
    cert.verification_status = "VERIFIED"
    cert.notes = f"Verified by {current_user.username} (demo mode)"
    db.commit()
    db.refresh(cert)
    return {"status": "success", "verification_status": "VERIFIED",
            "note": "Demo verification only. Production requires authorized verifier."}
