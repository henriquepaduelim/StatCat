"""Pagination schemas for API responses."""

from typing import Generic, TypeVar
from pydantic import BaseModel, Field


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    
    items: list[T] = Field(description="List of items for the current page")
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number (1-indexed)")
    size: int = Field(description="Number of items per page")
    pages: int = Field(description="Total number of pages")
    
    @classmethod
    def create(cls, items: list[T], total: int, page: int, size: int) -> "PaginatedResponse[T]":
        """Create a paginated response."""
        pages = (total + size - 1) // size if size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )


class PaginationParams(BaseModel):
    """Pagination query parameters."""
    
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    size: int = Field(default=50, ge=1, le=100, description="Number of items per page")
    
    @property
    def offset(self) -> int:
        """Calculate the offset for database queries."""
        return (self.page - 1) * self.size
