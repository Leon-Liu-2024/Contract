from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.workflow import Workflow, WorkflowStep
from schemas.workflow import WorkflowCreate, WorkflowResponse
from middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/api/workflows", tags=["流程範本"])


@router.get("/")
def list_workflows(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workflows = db.query(Workflow).filter(Workflow.is_active == True).all()
    result = []
    for w in workflows:
        steps = []
        for s in w.steps:
            approver = db.get(User, s.approver_id) if s.approver_id else None
            steps.append({
                "id": s.id, "step_order": s.step_order, "step_type": s.step_type,
                "approver_id": s.approver_id, "approver_role": s.approver_role,
                "approver_name": approver.name if approver else None,
            })
        result.append({
            "id": w.id, "name": w.name, "contract_type": w.contract_type,
            "amount_min": w.amount_min, "amount_max": w.amount_max,
            "is_active": w.is_active, "steps": steps,
        })
    return result


@router.post("/", status_code=201)
def create_workflow(
    req: WorkflowCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    workflow = Workflow(
        name=req.name, contract_type=req.contract_type,
        amount_min=req.amount_min, amount_max=req.amount_max,
        created_by=user.id,
    )
    db.add(workflow)
    db.flush()

    for s in req.steps:
        step = WorkflowStep(
            workflow_id=workflow.id, step_order=s.step_order,
            step_type=s.step_type, approver_id=s.approver_id,
            approver_role=s.approver_role,
        )
        db.add(step)
    db.commit()
    return {"id": workflow.id, "name": workflow.name}


@router.put("/{workflow_id}")
def update_workflow(
    workflow_id: int, req: WorkflowCreate,
    db: Session = Depends(get_db), user: User = Depends(require_role("admin")),
):
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(404, "流程不存在")

    workflow.name = req.name
    workflow.contract_type = req.contract_type
    workflow.amount_min = req.amount_min
    workflow.amount_max = req.amount_max

    # 重建步驟
    db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow_id).delete()
    for s in req.steps:
        step = WorkflowStep(
            workflow_id=workflow_id, step_order=s.step_order,
            step_type=s.step_type, approver_id=s.approver_id,
            approver_role=s.approver_role,
        )
        db.add(step)
    db.commit()
    return {"success": True}


@router.delete("/{workflow_id}")
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db), user: User = Depends(require_role("admin")),
):
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(404, "流程不存在")
    workflow.is_active = False
    db.commit()
    return {"success": True}


@router.get("/recommend")
def recommend_workflow(
    contract_type: str | None = None,
    amount: float | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Workflow).filter(Workflow.is_active == True)
    if contract_type:
        q = q.filter((Workflow.contract_type == contract_type) | (Workflow.contract_type == None))
    if amount is not None:
        q = q.filter(
            ((Workflow.amount_min == None) | (Workflow.amount_min <= amount)),
            ((Workflow.amount_max == None) | (Workflow.amount_max >= amount)),
        )
    workflows = q.all()
    return [{"id": w.id, "name": w.name, "contract_type": w.contract_type} for w in workflows]
