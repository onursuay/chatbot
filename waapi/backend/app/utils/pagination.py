"""Sayfalama yardimcilari."""

from dataclasses import dataclass


@dataclass
class PaginationParams:
    page: int = 1
    per_page: int = 25

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


def paginated_response(items: list, total: int, params: PaginationParams) -> dict:
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "per_page": params.per_page,
        "pages": (total + params.per_page - 1) // params.per_page,
    }
