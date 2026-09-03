"""contact_sharing.py — Mutual contact info permission API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.models.contact_sharing import ContactSharing
from app.models.bid import Bid
from app.models.user import User
from app.api.v1.auth import get_current_user

router = APIRouter()


class ContactSharingResponse(BaseModel):
    id: int
    bid_id: int
    farmer_id: int
    buyer_id: int
    farmer_permission: bool
    buyer_permission: bool
    status: str
    # Only populated when status == SHARED
    farmer_contact: dict | None = None
    buyer_contact: dict | None = None

    class Config:
        from_attributes = True


@router.post("/{bid_id}/permission")
def set_permission(
    bid_id: int,
    allow: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Farmer or buyer sets their contact-sharing permission.
    Pass allow=true to grant, allow=false to decline.
    """
    sharing = db.query(ContactSharing).filter(ContactSharing.bid_id == bid_id).first()
    if not sharing:
        raise HTTPException(status_code=404, detail="No contact sharing record for this bid.")

    if current_user.id == sharing.farmer_id:
        sharing.farmer_permission = allow
    elif current_user.id == sharing.buyer_id:
        sharing.buyer_permission = allow
    else:
        raise HTTPException(status_code=403, detail="Not a party to this bid.")

    # Update status
    if not allow:
        sharing.status = "DECLINED"
    elif sharing.farmer_permission and sharing.buyer_permission:
        sharing.status = "SHARED"
    else:
        sharing.status = "PENDING"

    db.commit()
    db.refresh(sharing)

    result = {
        "bid_id": bid_id,
        "farmer_permission": sharing.farmer_permission,
        "buyer_permission": sharing.buyer_permission,
        "status": sharing.status,
    }

    # If mutual approval, reveal contact info
    if sharing.status == "SHARED":
        farmer = db.get(User, sharing.farmer_id)
        buyer = db.get(User, sharing.buyer_id)
        result["farmer_contact"] = {
            "username": farmer.username if farmer else None,
            "email": farmer.email if farmer else None,
        }
        result["buyer_contact"] = {
            "username": buyer.username if buyer else None,
            "email": buyer.email if buyer else None,
        }

    return result


@router.get("/{bid_id}")
def get_contact_sharing(
    bid_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get contact sharing status for a bid. Only accessible to farmer or buyer of that bid."""
    sharing = db.query(ContactSharing).filter(ContactSharing.bid_id == bid_id).first()
    if not sharing:
        raise HTTPException(status_code=404, detail="No contact sharing record for this bid.")

    if current_user.id not in (sharing.farmer_id, sharing.buyer_id):
        raise HTTPException(status_code=403, detail="Not a party to this bid.")

    result = {
        "bid_id": bid_id,
        "farmer_permission": sharing.farmer_permission,
        "buyer_permission": sharing.buyer_permission,
        "status": sharing.status,
        "farmer_contact": None,
        "buyer_contact": None,
    }

    # Only reveal contact info if mutually approved
    if sharing.status == "SHARED":
        farmer = db.get(User, sharing.farmer_id)
        buyer = db.get(User, sharing.buyer_id)
        result["farmer_contact"] = {
            "username": farmer.username if farmer else None,
            "email": farmer.email if farmer else None,
        }
        result["buyer_contact"] = {
            "username": buyer.username if buyer else None,
            "email": buyer.email if buyer else None,
        }

    return result
