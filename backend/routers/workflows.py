from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.workflow import Workflow, WorkflowStep
from models.user import User
from schemas.workflow import WorkflowCreate
from middleware.auth import get_current_user, require_role
from database import get_db

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("/")
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflows = (
        db.query(Workflow)
        .filter(Workflow.is_active == True)
        .all()
    )
    result = []
    for wf in workflows:
        steps = (
            db.query(WorkflowStep, User)
            .outerjoin(User, WorkflowStep.approver_id == User.id)
            .filter(WorkflowStep.workflow_id == wf.id)
            .order_by(WorkflowStep.step_order)
            .all()
        )
        step_list = []
        for step, approver in steps:
            step_list.append(
                {
                    "id": step.id,
                    "step_order": step.step_order,
                    "step_type": step.step_type,
                    "step_name": step.step_name,
                    "approver_id": step.approver_id,
                    "approver_role": step.approver_role,
                    "approver_name": approver.name if approver else None,
                }
            )
        result.append(
            {
                "id": wf.id,
                "name": wf.name,
                "stage": wf.stage,
                "contract_type": wf.contract_type,
                "is_active": wf.is_active,
                "steps": step_list,
            }
        )
    return result


@router.post("/")
def create_workflow(
    body: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    workflow = Workflow(
        name=body.name,
        stage=body.stage,
        contract_type=getattr(body, "contract_type", None),
        is_active=True,
        created_by=current_user.id,
    )
    db.add(workflow)
    db.flush()

    for idx, step_data in enumerate(body.steps, start=1):
        step = WorkflowStep(
            workflow_id=workflow.id,
            step_order=idx,
            step_type=getattr(step_data, "step_type", "sequential"),
            approver_id=step_data.approver_id,
            approver_role=getattr(step_data, "approver_role", None),
            step_name=getattr(step_data, "step_name", None),
        )
        db.add(step)

    db.commit()
    db.refresh(workflow)
    return {"message": "Workflow created", "id": workflow.id}


@router.put("/{id}")
def update_workflow(
    id: int,
    body: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    workflow = db.query(Workflow).filter(Workflow.id == id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow.name = body.name
    workflow.stage = body.stage
    workflow.contract_type = getattr(body, "contract_type", None)

    # Delete existing steps and rebuild
    db.query(WorkflowStep).filter(WorkflowStep.workflow_id == id).delete()

    for idx, step_data in enumerate(body.steps, start=1):
        step = WorkflowStep(
            workflow_id=workflow.id,
            step_order=idx,
            step_type=getattr(step_data, "step_type", "sequential"),
            approver_id=step_data.approver_id,
            approver_role=getattr(step_data, "approver_role", None),
            step_name=getattr(step_data, "step_name", None),
        )
        db.add(step)

    db.commit()
    db.refresh(workflow)
    return {"message": "Workflow updated", "id": workflow.id}


@router.delete("/{id}")
def delete_workflow(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    workflow = db.query(Workflow).filter(Workflow.id == id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow.is_active = False
    db.commit()
    return {"message": "Workflow deactivated"}
