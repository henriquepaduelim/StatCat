from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import ensure_roles, get_current_active_user
from app.db.session import get_session
from app.models.test_definition import TestDefinition
from app.models.user import User, UserRole
from app.schemas.test_definition import TestDefinitionCreate, TestDefinitionRead

router = APIRouter()


@router.get("/", response_model=list[TestDefinitionRead])
def list_tests(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[TestDefinitionRead]:
    statement = select(TestDefinition)
    return session.exec(statement).all()


@router.post(
    "/", response_model=TestDefinitionRead, status_code=status.HTTP_201_CREATED
)
def create_test(
    payload: TestDefinitionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TestDefinitionRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    test_definition = TestDefinition.model_validate(payload.model_dump())
    session.add(test_definition)
    session.commit()
    session.refresh(test_definition)
    return test_definition


@router.get("/{test_id}", response_model=TestDefinitionRead)
def get_test(
    test_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TestDefinitionRead:
    test_definition = session.get(TestDefinition, test_id)
    if not test_definition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Test not found"
        )
    return test_definition
