from sqlalchemy.orm import Session

from app.models import AuditLog, User


def record_audit_log(
    db: Session,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: int,
    summary: str,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            summary=summary,
        )
    )
