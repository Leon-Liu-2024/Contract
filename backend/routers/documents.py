"""文件下載路由"""
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.document import Document
from models.user import User
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["文件管理"])


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文件不存在")
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="檔案不存在")

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
