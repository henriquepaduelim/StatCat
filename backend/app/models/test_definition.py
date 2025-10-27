from sqlmodel import Field, SQLModel


class TestDefinition(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    category: str | None = None
    unit: str = ""
    description: str | None = None
    target_direction: str = "higher"  # could be "higher" or "lower"
