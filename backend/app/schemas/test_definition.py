from pydantic import ConfigDict
from sqlmodel import SQLModel


class TestDefinitionBase(SQLModel):
    name: str
    category: str | None = None
    unit: str = ""
    description: str | None = None
    target_direction: str = "higher"


class TestDefinitionCreate(TestDefinitionBase):
    pass


class TestDefinitionRead(TestDefinitionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
