import app.patch_bcrypt
import pytest
from fastapi.testclient import TestClient
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from jose import jwt, JWTError

from app.main import app
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.config import settings
from app.database.session import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

def override_get_current_user(token: str = Depends(oauth2_scheme)):
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            username: str = payload.get("sub")
            if username:
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.username == username).first()
                    if user:
                        return user
                finally:
                    db.close()
        except JWTError:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    return User(id=1, username="testuser", email="test@example.com")

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(scope="module")
def client():
    """Pytest fixture to provide a FastAPI TestClient."""
    with TestClient(app) as c:
        yield c
