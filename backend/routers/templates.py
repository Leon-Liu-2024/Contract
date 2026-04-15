"""
ibon 制式合約範本 API 路由

端點：
  GET  /api/templates/              取得所有可用範本清單
  GET  /api/templates/{id}/fields   取得指定範本的欄位定義
  POST /api/contracts/{id}/generate-template   產生填寫後的合約文件
  GET  /api/templates/download/{template_id}   下載空白範本
"""

import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_user
from models.user import User
from models.contract import Contract
from models.document import Document, DOC_TYPES
from services.template_service import (
    IBON_TEMPLATES,
    TEMPLATE_DIR,
    get_template_list,
    get_template_fields,
    generate_contract,
    auto_fill_from_contract,
)
from config import UPLOAD_DIR

router_templates = APIRouter(prefix="/api/templates", tags=["制式合約範本"])
router_generate  = APIRouter(prefix="/api/contracts",  tags=["合約管理"])


# ── 範本清單 ──────────────────────────────────────────────────────────────
@router_templates.get("/")
def list_templates():
    """取得所有 ibon 制式合約範本清單（不需登入）"""
    return {"templates": get_template_list()}


@router_templates.get("/{template_id}/fields")
def template_fields(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """取得指定範本的欄位定義（供前端動態產生填寫表單）"""
    try:
        return get_template_fields(template_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router_templates.get("/download/{template_id}")
def download_blank_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """下載空白範本 .docx"""
    tmpl = IBON_TEMPLATES.get(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"找不到範本：{template_id}")

    file_path = os.path.join(TEMPLATE_DIR, tmpl["file"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="範本檔案不存在")

    return FileResponse(
        path=file_path,
        filename=tmpl["file"],
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ── 合約文件產生 ──────────────────────────────────────────────────────────
class GenerateTemplateRequest(BaseModel):
    template_id: str
    field_values: dict[str, str]   # {"1": "AGR-001", "2": "台灣公司", ...}
    auto_fill: bool = True         # 是否先從合約資料自動填充基本欄位


@router_generate.post("/{contract_id}/generate-template")
def generate_ibon_template(
    contract_id: int,
    req: GenerateTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    為指定合約產生填寫後的 ibon 制式合約 .docx 文件，
    並自動掛載到該合約的文件清單中。

    回傳：產生的文件資訊（id, filename, download_url）
    """
    # 驗證合約存在
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")

    # 確認範本有效
    if req.template_id not in IBON_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"無效的範本 ID：{req.template_id}")

    # 合併欄位值（先自動填充，再套用使用者提供的值）
    field_values = {}
    if req.auto_fill:
        field_values = auto_fill_from_contract(contract, req.template_id)
    field_values.update(req.field_values)  # 使用者填的優先

    # 產生輸出目錄
    output_dir = os.path.join(UPLOAD_DIR, str(contract_id))
    os.makedirs(output_dir, exist_ok=True)

    # 產生檔名
    tmpl_info = IBON_TEMPLATES[req.template_id]
    filename = f"{tmpl_info['label'].replace(' ', '_')}_{contract.contract_no}"

    try:
        output_path = generate_contract(
            template_id=req.template_id,
            field_values=field_values,
            output_dir=output_dir,
            filename=filename,
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=500, detail=f"產生合約失敗：{str(e)}")

    # 建立 Document 記錄
    doc_filename = os.path.basename(output_path)
    doc = Document(
        contract_id=contract_id,
        doc_type="contract_draft",
        filename=doc_filename,
        file_path=output_path,
        file_size=os.path.getsize(output_path),
        stage=contract.current_stage,
        uploader_id=current_user.id,
        description=f"由 ibon 制式範本自動產生：{tmpl_info['label']}",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "success": True,
        "document_id": doc.id,
        "filename": doc_filename,
        "template_label": tmpl_info["label"],
        "download_url": f"/api/documents/{doc.id}/download",
        "filled_fields": len(field_values),
    }


@router_generate.get("/{contract_id}/template-preview")
def get_prefilled_values(
    contract_id: int,
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    預覽自動填充的欄位值（讓使用者在送出前確認/修改）
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")

    if template_id not in IBON_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"無效的範本 ID：{template_id}")

    prefilled = auto_fill_from_contract(contract, template_id)
    fields_def = get_template_fields(template_id)

    # 合併欄位定義和預填值，方便前端渲染
    result = []
    for fid, fdef in fields_def["fields"].items():
        result.append({
            "field_id": fid,
            "label": fdef["label"],
            "required": fdef["required"],
            "hint": fdef.get("hint", ""),
            "prefilled_value": prefilled.get(fid, ""),
        })

    return {
        "template_id": template_id,
        "template_label": fields_def["label"],
        "note": fields_def.get("note", ""),
        "fields": result,
    }
