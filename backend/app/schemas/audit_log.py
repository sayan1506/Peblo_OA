from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    actor_id: int
    actor_email: str
    action: str
    resource_type: str
    resource_id: int
    summary: str
    created_at: datetime
