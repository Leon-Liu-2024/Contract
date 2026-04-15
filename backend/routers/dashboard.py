from io import BytesIO
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.contract import Contract, ContractStageLog, CONTRACT_STAGES
from models.approval import ApprovalRecord
from models.user import User
from models.vendor import Vendor
from middleware.auth import get_current_user, require_role
from database import get_db
from utils.datetime_utils import to_iso_utc

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Pending approvals for current user
    pending_count = (
        db.query(func.count(ApprovalRecord.id))
        .filter(
            ApprovalRecord.approver_id == current_user.id,
            ApprovalRecord.status == "pending",
        )
        .scalar()
    )

    # Total contracts
    total_contracts = db.query(func.count(Contract.id)).scalar()

    # My contracts
    my_contracts = (
        db.query(func.count(Contract.id))
        .filter(Contract.creator_id == current_user.id)
        .scalar()
    )

    # Active contracts (not void/acceptance)
    active_contracts = (
        db.query(func.count(Contract.id))
        .filter(Contract.current_stage.notin_(["void", "acceptance"]))
        .scalar()
    )

    return {
        "pending_approval": pending_count,
        "total_contracts": total_contracts,
        "my_contracts": my_contracts,
        "active_contracts": active_contracts,
    }


@router.get("/stage-summary")
def get_stage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stage_counts = (
        db.query(Contract.current_stage, func.count(Contract.id))
        .group_by(Contract.current_stage)
        .all()
    )
    counts_map = {stage: count for stage, count in stage_counts}

    result = []
    for stage_key, stage_info in CONTRACT_STAGES.items():
        result.append(
            {
                "stage": stage_key,
                "label": stage_info["label"],
                "count": counts_map.get(stage_key, 0),
            }
        )
    return result


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(ContractStageLog, User, Contract)
        .outerjoin(User, ContractStageLog.operator_id == User.id)
        .join(Contract, ContractStageLog.contract_id == Contract.id)
        .order_by(ContractStageLog.created_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for log, user, contract in logs:
        result.append(
            {
                "id": log.id,
                "contract_id": contract.id,
                "contract_no": contract.contract_no,
                "contract_title": contract.title,
                "from_stage": log.from_stage,
                "to_stage": log.to_stage,
                "comment": log.comment,
                "operator_name": user.name if user else None,
                "created_at": to_iso_utc(log.created_at),
            }
        )
    return result


@router.get("/admin/export")
def export_contracts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    contracts = (
        db.query(Contract, User, Vendor)
        .outerjoin(User, Contract.creator_id == User.id)
        .outerjoin(Vendor, Contract.vendor_id == Vendor.id)
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Contracts"

    headers = [
        "合約編號", "標題", "廠商", "金額", "類型", "階段", "建立者", "建立時間",
    ]
    ws.append(headers)

    for contract, creator, vendor in contracts:
        ws.append(
            [
                contract.contract_no,
                contract.title,
                vendor.name if vendor else "",
                contract.amount,
                contract.contract_type,
                contract.current_stage,
                creator.name if creator else "",
                contract.created_at.strftime("%Y-%m-%d %H:%M:%S") if contract.created_at else "",
            ]
        )

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contracts_export.xlsx"},
    )
